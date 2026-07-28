"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Project } from "@/lib/types"
import { toast } from "sonner"
import { LayoutGrid, Info, IndianRupee, MessageSquare, Save, X } from "lucide-react"

const ORDER_TYPES = [
  "Boom Barrier",
  "Heat Pump",
  "Solar Water Heater",
  "ETC",
  "FPC",
  "Other",
]

const TANK_TYPES = ["GI Pressureized", "GI Non-Pressurized", "Enamel"]

interface ProjectFormProps {
  project?: Project
  mode: "create" | "edit"
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    id_no: project?.id_no?.toString() || "",
    order_type: project?.order_type || "",
    site_name: project?.site_name || "",
    address: project?.address || "",
    hp_type: project?.hp_type || "",
    hp_qty: project?.hp_qty?.toString() || "",
    tank_type: project?.tank_type || "",
    tank_qty: project?.tank_qty?.toString() || "",
    order_value: project?.order_value?.toString() || "0",
    work_remark: project?.work_remark || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const projectData = {
        id_no: parseInt(formData.id_no) || 0,
        order_type: formData.order_type,
        site_name: formData.site_name,
        address: formData.address,
        hp_type: formData.hp_type || null,
        hp_qty: formData.hp_qty ? parseInt(formData.hp_qty) : null,
        tank_type: formData.tank_type || null,
        tank_qty: formData.tank_qty ? parseInt(formData.tank_qty) : null,
        order_value: parseFloat(formData.order_value) || 0,
        work_remark: formData.work_remark || null,
      }

      if (mode === "create") {
        const { data, error: insertError } = await supabase
          .from("projects")
          .insert(projectData)
          .select()
          .single()

        if (insertError) throw insertError
        toast.success("Project created successfully")
        router.push(`/projects/${data.id}`)
      } else if (project) {
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            ...projectData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", project.id)

        if (updateError) throw updateError
        toast.success("Project updated successfully")
        router.push(`/projects/${project.id}`)
      }
    } catch (err: any) {
      console.error("Error saving project:", err)
      setError(err.message || "Failed to save project. Please try again.")
      toast.error("Failed to save project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-2xl bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden mb-12">
      <CardHeader className="bg-primary/5 pb-8 border-b">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          {mode === "create" ? "Project Specifications" : "Rename/Update Project"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-destructive text-sm font-medium flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-white text-[10px font-extrabold] font-bold">!</div>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">1</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Site Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="id_no" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Project ID</Label>
                <Input
                  id="id_no"
                  type="number"
                  value={formData.id_no}
                  onChange={(e) => setFormData({ ...formData, id_no: e.target.value })}
                  placeholder="e.g., 18032"
                  className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Order Category</Label>
                <Select
                  value={formData.order_type}
                  onValueChange={(value) => setFormData({ ...formData, order_type: value })}
                >
                  <SelectTrigger className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {ORDER_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="rounded-lg">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Official Site Name</Label>
              <Input
                id="site_name"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                placeholder="e.g., Eastern Elegance Hadapsar"
                className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Installation Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Detailed site location..."
                className="rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all min-h-[100px] resize-none"
                required
              />
            </div>
          </section>

          {/* Equipment Details */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">2</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Technical Specifications</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-muted/20 rounded-3xl border border-dashed border-border/50">
              <div className="space-y-2">
                <Label htmlFor="hp_type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">HP Type</Label>
                <Input
                  id="hp_type"
                  value={formData.hp_type}
                  onChange={(e) => setFormData({ ...formData, hp_type: e.target.value })}
                  placeholder="e.g., 5HP"
                  className="rounded-xl bg-background border-border/30 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hp_qty" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">HP Qty</Label>
                <Input
                  id="hp_qty"
                  type="number"
                  value={formData.hp_qty}
                  onChange={(e) => setFormData({ ...formData, hp_qty: e.target.value })}
                  className="rounded-xl bg-background border-border/30 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tank_type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Tank Type</Label>
                <Select
                  value={formData.tank_type}
                  onValueChange={(value) => setFormData({ ...formData, tank_type: value })}
                >
                  <SelectTrigger id="tank_type" className="rounded-xl bg-background border-border/30 h-11">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {TANK_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="rounded-lg">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tank_qty" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Tank Qty</Label>
                <Input
                  id="tank_qty"
                  type="number"
                  value={formData.tank_qty}
                  onChange={(e) => setFormData({ ...formData, tank_qty: e.target.value })}
                  className="rounded-xl bg-background border-border/30 h-11"
                />
              </div>
            </div>
          </section>

          {/* Financial */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">3</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Financial Framework</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_value" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Total Order Value (INR)</Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary group-focus-within:scale-110 transition-transform">₹</div>
                <Input
                  id="order_value"
                  type="number"
                  step="0.01"
                  value={formData.order_value}
                  onChange={(e) => setFormData({ ...formData, order_value: e.target.value })}
                  placeholder="0.00"
                  className="pl-10 rounded-xl h-14 bg-muted/30 border-border/50 focus:bg-background transition-all text-lg font-bold"
                  required
                />
              </div>
            </div>
          </section>

          {/* Work Remark */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">4</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Operational Remarks</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_remark" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Project Notes / Terms</Label>
              <Textarea
                id="work_remark"
                value={formData.work_remark}
                onChange={(e) => setFormData({ ...formData, work_remark: e.target.value })}
                placeholder="e.g., payment term 100% After installation"
                className="rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all min-h-[100px] resize-none"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-10 border-t items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={loading}
              className="rounded-2xl h-12 px-8 font-bold text-muted-foreground hover:bg-muted/50"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.site_name || !formData.order_type}
              className="bg-primary text-primary-foreground shadow-xl shadow-primary/20 rounded-2xl h-14 px-12 font-bold hover:scale-105 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Finalizing...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-lg">
                  <Save className="h-5 w-5" />
                  {mode === "create" ? "Launch Project" : "Sync Changes"}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
