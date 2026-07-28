"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Edit, Phone, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Project } from "@/lib/types"
import { DeleteProjectDialog } from "./delete-project-dialog"

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <header className="bg-card border-b border-border">
      <div className="px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-medium">
                {project.order_type}
              </Badge>
              <span className="text-sm text-muted-foreground font-medium">ID: {project.id_no}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl tracking-tight">
              {project.site_name}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">{project.address}</p>

            {/* Equipment Info */}
            {(project.hp_type || project.hp_qty || project.tank_type || project.tank_qty) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {project.hp_type && (
                  <Badge variant="outline" className="bg-accent/30 border-accent/50 text-accent-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    HP: {project.hp_type}
                  </Badge>
                )}
                {project.hp_qty && (
                  <Badge variant="outline" className="bg-accent/30 border-accent/50 text-accent-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Qty: {project.hp_qty}
                  </Badge>
                )}
                {project.tank_type && (
                  <Badge variant="outline" className="bg-accent/30 border-accent/50 text-accent-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Tank Type: {project.tank_type}
                  </Badge>
                )}
                {project.tank_qty && (
                  <Badge variant="outline" className="bg-accent/30 border-accent/50 text-accent-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Tank: {project.tank_qty}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex gap-2">
              <Link href={`/projects/${project.id}/edit`}>
                <Button variant="outline" size="sm" className="shadow-sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/call-remark`}>
                <Button size="sm" className="bg-primary text-primary-foreground shadow-sm hover:opacity-90">
                  <Phone className="h-4 w-4 mr-2" />
                  New Call Remark
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mt-2 p-4 bg-muted/40 rounded-xl border border-border/50">
              <div className="text-left lg:text-right">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Order Value</p>
                <p className="font-bold text-base text-foreground underline decoration-primary/30 decoration-2 underline-offset-4">{formatCurrency(project.order_value)}</p>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Received</p>
                <p className="font-bold text-base text-success underline decoration-success/30 decoration-2 underline-offset-4">{formatCurrency(project.payment_received)}</p>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Balance</p>
                <p className={`font-bold text-base underline decoration-2 underline-offset-4 ${project.balance > 0 ? "text-success decoration-success/30" : "text-destructive decoration-destructive/30"}`}>
                  {formatCurrency(project.balance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteProjectDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        projectId={project.id}
        siteName={project.site_name}
      />
    </header>
  )
}
