"use client"

import { useState } from "react"
import { getAppUsers, saveAppUsers, getSessionData } from "@/lib/auth-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { KeyRound, ShieldAlert } from "lucide-react"

interface ChangeCredentialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangeCredentialsDialog({ open, onOpenChange }: ChangeCredentialsDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newUserId, setNewUserId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const users = await getAppUsers()
      const session = getSessionData()
      
      if (!session) {
        toast.error("Not logged in.")
        return
      }

      const currentUser = users.find(u => u.userId === session.userId)
      if (!currentUser || currentPassword !== currentUser.password) {
        toast.error("Incorrect current password.")
        setLoading(false)
        return
      }

      const finalUserId = newUserId.trim() || currentUser.userId
      
      // Prevent taking someone else's ID
      if (finalUserId !== currentUser.userId && users.some(u => u.userId === finalUserId)) {
        toast.error("User ID already taken.")
        setLoading(false)
        return
      }

      // Update user array
      const updatedUsers = users.map(u => {
        if (u.userId === currentUser.userId) {
          return { ...u, userId: finalUserId, password: newPassword }
        }
        return u
      })

      await saveAppUsers(updatedUsers)
      
      toast.success("Credentials updated! You will need to login again.")
      onOpenChange(false)
      
      // Reset form
      setCurrentPassword("")
      setNewUserId("")
      setNewPassword("")
      setConfirmPassword("")
      
      // Force logout so they use new creds
      setTimeout(() => {
        window.location.href = "/login"
      }, 1500)
    } catch (error) {
      console.error("Failed to change credentials:", error)
      toast.error("Failed to update credentials. Ensure the Supabase migration was run.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <KeyRound className="h-5 w-5 text-primary" />
            Change My Credentials
          </DialogTitle>
          <DialogDescription>
            Update your login details. You must provide your current password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="bg-muted/40 p-3 rounded-xl border border-border flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              These credentials apply to your account across <strong className="text-foreground">all devices</strong>. You will be logged out after changing them.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Current Password *</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">New User ID (Optional)</Label>
            <Input
              id="new_email"
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="Leave blank to keep current"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">New Password *</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password *</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword} className="bg-primary text-primary-foreground font-bold">
              {loading ? "Updating..." : "Update Credentials"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
