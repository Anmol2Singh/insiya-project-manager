"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Plus, Menu, X, LayoutDashboard, Database } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface DashboardHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function DashboardHeader({ searchQuery, onSearchChange }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4 lg:gap-8">
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-none">
                ProjectManager
              </h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                Heat Pump & SWH
              </p>
            </div>
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-4 flex-1 max-w-2xl mx-12">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Quick search by site name, address or ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 bg-muted/50 border-border/50 focus:bg-background focus:ring-primary/20 transition-all rounded-2xl h-11"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/projects/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl h-11 px-6 font-bold">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Project</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="lg:hidden px-4 pb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-11 bg-muted/50 border-border/50 rounded-2xl h-11"
          />
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border/50 bg-card/95 backdrop-blur-md overflow-hidden shadow-xl"
          >
            <div className="px-4 py-6 space-y-4">
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 text-primary font-bold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard Overview
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-foreground font-semibold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="h-5 w-5" />
                Create New Project
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
