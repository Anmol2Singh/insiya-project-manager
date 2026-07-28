"use client"

import { use } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ProjectForm } from "@/components/project/project-form"
import type { Project } from "@/lib/types"

interface EditProjectPageProps {
  params: Promise<{ id: string }>
}

const fetchProject = async (id: string): Promise<Project> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = use(params)
  const { data: project, error, isLoading } = useSWR(`project-edit-${id}`, () => fetchProject(id))

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-destructive max-w-md text-center">
          <h2 className="font-semibold text-lg mb-2">Error Loading Project</h2>
          <p>Unable to load project details. Please try again later.</p>
        </div>
      </div>
    )
  }

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="px-4 py-4 lg:px-6">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
            <div className="h-6 w-64 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <div className="p-4 lg:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="h-96 bg-card rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="px-4 py-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${id}`}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-foreground mt-4 lg:text-2xl">
            Edit Project: {project.site_name}
          </h1>
        </div>
      </header>

      <main className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <ProjectForm project={project} mode="edit" />
        </div>
      </main>
    </div>
  )
}
