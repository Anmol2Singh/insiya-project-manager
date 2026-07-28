"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface DeleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  siteName: string
}

export function DeleteProjectDialog({ open, onOpenChange, projectId, siteName }: DeleteProjectDialogProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)

      if (error) throw error

      toast.success("Project deleted successfully")
      router.push("/")
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting project:", error)
      toast.error(error.message || "Failed to delete project")
    } finally {
      setLoading(false)
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the project <strong>{siteName}</strong> and all its associated data (ledger, expenses, etc.). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
