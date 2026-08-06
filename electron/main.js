const { app, BrowserWindow, dialog, ipcMain } = require("electron")
const path = require("path")
const http = require("http")

let mainWindow = null
let server = null

const PORT = 3000

function waitForServer(url, timeout = 15000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          resolve(true)
        } else {
          if (Date.now() - start > timeout) reject(new Error("Server timeout"))
          else setTimeout(check, 400)
        }
      }).on("error", () => {
        if (Date.now() - start > timeout) reject(new Error("Server timeout"))
        else setTimeout(check, 400)
      })
    }
    check()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "Insiya Solar Industry - ProjectManager",
    icon: path.join(__dirname, "../public/icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`)

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Handle folder selection dialog from renderer
ipcMain.handle("dialog:selectFolder", async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Default Save Folder for Insiya Solar Reports & Exports",
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

app.on("ready", async () => {
  const isDev = process.env.NODE_ENV === "development"

  if (isDev) {
    try {
      await waitForServer(`http://localhost:${PORT}`, 5000)
    } catch (e) {
      console.log("Dev server not detected on port 3000, opening window directly...")
    }
    createWindow()
  } else {
    // Production Mode: Programmatic Next.js Server
    try {
      const next = require("next")
      const nextApp = next({ dev: false, dir: path.join(__dirname, "..") })
      const handle = nextApp.getRequestHandler()
      
      await nextApp.prepare()
      
      server = http.createServer((req, res) => {
        handle(req, res)
      })

      server.listen(PORT, "127.0.0.1", () => {
        console.log(`Internal Next.js server running on http://127.0.0.1:${PORT}`)
        createWindow()
      })
    } catch (err) {
      console.error("Programmatic Next.js server startup error:", err)
      createWindow()
    }
  }
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (server) server.close()
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})
