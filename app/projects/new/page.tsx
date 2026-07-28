"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/project/project-form"
import { motion } from "framer-motion"

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm sticky top-0 z-50">
        <div className="px-4 py-8 lg:px-12 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-full px-4 hover:bg-muted/50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
          <div className="mt-8">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight lg:text-4xl">
              Create New Project
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">Enter site details to begin tracking installation progress.</p>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <ProjectForm mode="create" />
        </motion.div>
      </main>
    </div>
  )
}
