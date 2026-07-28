"use client"

import React from "react"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Phone } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Project, CallingRecord } from "@/lib/types"

interface CallRemarkPageProps {
  params: Promise<{ id: string }>
}

interface ProjectWithRecords {
  project: Project
  records: CallingRecord[]
}

const fetchProjectWithRecords = async (id: string): Promise<ProjectWithRecords> => {
  const supabase = createClient()
  
  const [{ data: project, error: projectError }, { data: records, error: recordsError }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("calling_records").select("*").eq("project_id", id).order("sr_no", { ascending: false }),
  ])

  if (projectError) throw projectError
  
  return {
    project: project!,
    records: records || [],
  }
}

export default function CallRemarkPage({ params }: CallRemarkPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR(`call-remark-${id}`, () => fetchProjectWithRecords(id))
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return
    
    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error: insertError } = await supabase.from("calling_records").insert({
        project_id: id,
        sr_no: data.records.length + 1,
        date: formData.date,
        description: formData.description || null,
      })

      if (insertError) throw insertError

      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
      })
      
      mutate()
    } catch (err) {
      console.error("Error adding call record:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

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

  if (isLoading || !data) {
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

  const { project, records } = data

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
          <div className="flex items-center gap-2 mt-4">
            <Phone className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground lg:text-2xl">
              Call Remark - {project.site_name}
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Add New Record Form */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Add Call Record</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter call details and notes"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                    {loading ? "Adding..." : "Add Record"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Previous Records */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Previous Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {records.map((record) => (
                  <div key={record.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">#{record.sr_no}</span>
                      <span className="text-sm text-foreground">{formatDate(record.date)}</span>
                    </div>
                    <p className="text-foreground">{record.description || "No description"}</p>
                  </div>
                ))}
                {records.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No calling records yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
