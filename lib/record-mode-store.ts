"use client"

import { useState, useEffect } from "react"

export type RecordMode = "sales" | "purchase"

const STORAGE_KEY = "active_record_mode"
const CHANGE_EVENT = "app_record_mode_changed"

export function getRecordMode(): RecordMode {
  if (typeof window === "undefined") return "sales"
  const val = localStorage.getItem(STORAGE_KEY)
  if (val === "purchase") return "purchase"
  return "sales"
}

export function setRecordMode(mode: RecordMode) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: mode }))
  window.dispatchEvent(new Event("storage"))
}

export function useRecordMode() {
  const [mode, setModeState] = useState<RecordMode>("sales")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setModeState(getRecordMode())

    const handleCustomEvent = (e: any) => {
      if (e.detail && (e.detail === "sales" || e.detail === "purchase")) {
        setModeState(e.detail)
      } else {
        setModeState(getRecordMode())
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || !e.key) {
        setModeState(getRecordMode())
      }
    }

    window.addEventListener(CHANGE_EVENT as any, handleCustomEvent)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(CHANGE_EVENT as any, handleCustomEvent)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const setMode = (newMode: RecordMode) => {
    setRecordMode(newMode)
    setModeState(newMode)
  }

  return {
    mode,
    setMode,
    isPurchase: mode === "purchase",
    isSales: mode === "sales",
    mounted,
  }
}
