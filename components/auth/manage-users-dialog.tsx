"use client"

import { useState, useEffect } from "react"
import { getAppUsers, saveAppUsers, AppUser, UserRole, getSessionData } from "@/lib/auth-store"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Users, ShieldAlert, Trash2, UserPlus, Pencil, Check, X as XIcon } from "lucide-react"

interface ManageUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageUsersDialog({ open, onOpenChange }: ManageUsersDialogProps) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  // New User Form State
  const [newUserId, setNewUserId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("view")

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editPassword, setEditPassword] = useState("")
  const [editRole, setEditRole] = useState<UserRole>("view")

  const currentUser = getSessionData()

  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  const loadUsers = async () => {
    setFetching(true)
    const list = await getAppUsers()
    setUsers(list)
    setFetching(false)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserId || !newPassword) {
      toast.error("Please fill in all fields.")
      return
    }

    if (users.find(u => u.userId.toLowerCase() === newUserId.toLowerCase())) {
      toast.error("A user with this ID already exists.")
      return
    }

    setLoading(true)
    try {
      const newUser: AppUser = {
        userId: newUserId,
        password: newPassword,
        role: newRole
      }
      
      const updatedList = [...users, newUser]
      await saveAppUsers(updatedList)
      
      setUsers(updatedList)
      toast.success("User added successfully!")
      
      setNewUserId("")
      setNewPassword("")
      setNewRole("view")
    } catch (error) {
      toast.error("Failed to save new user.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (targetId: string) => {
    if (targetId === currentUser?.userId) {
      toast.error("You cannot delete yourself.")
      return
    }

    const adminCount = users.filter(u => u.role === 'admin').length
    const targetUser = users.find(u => u.userId === targetId)

    if (targetUser?.role === 'admin' && adminCount <= 1) {
      toast.error("Cannot delete the last admin user.")
      return
    }

    if (!confirm(`Are you sure you want to delete user ${targetId}?`)) return

    setLoading(true)
    try {
      const updatedList = users.filter(u => u.userId !== targetId)
      await saveAppUsers(updatedList)
      setUsers(updatedList)
      toast.success("User deleted successfully!")
    } catch (error) {
      toast.error("Failed to delete user.")
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (user: AppUser) => {
    setEditingUserId(user.userId)
    setEditPassword(user.password || "")
    setEditRole(user.role)
  }

  const handleSaveEdit = async () => {
    if (!editingUserId || !editPassword) {
      toast.error("Password cannot be empty.")
      return
    }

    setLoading(true)
    try {
      const updatedList = users.map(u => 
        u.userId === editingUserId ? { ...u, password: editPassword, role: editRole } : u
      )
      await saveAppUsers(updatedList)
      setUsers(updatedList)
      toast.success("User updated successfully!")
      setEditingUserId(null)
    } catch (error) {
      toast.error("Failed to update user.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-primary" />
              Manage Users
            </DialogTitle>
            <DialogDescription>
              Add, remove, and manage access roles for users.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-muted/40 p-3 rounded-xl border border-border flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Roles:</strong> <br/>
              <span className="font-semibold">Admin:</span> Full access, including user management.<br/>
              <span className="font-semibold">Edit:</span> Can create and edit projects/entries.<br/>
              <span className="font-semibold">View:</span> Can only read data; cannot add, edit, or delete anything.
            </p>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4 bg-card border rounded-2xl p-4 shadow-sm">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add New User
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">User ID</Label>
                <Input
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="e.g. john_doe"
                  className="rounded-xl h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Role</Label>
                <Select value={newRole} onValueChange={(val: UserRole) => setNewRole(val)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Edit Access</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="rounded-xl font-bold h-9 bg-primary text-primary-foreground">
                {loading ? "Adding..." : "Add User"}
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="font-bold text-sm">Existing Users</h4>
            {fetching ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
                    {editingUserId === u.userId ? (
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 mr-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground ml-1">User ID</Label>
                          <Input value={u.userId} disabled className="h-9 rounded-lg" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground ml-1">Password</Label>
                          <Input 
                            value={editPassword} 
                            onChange={(e) => setEditPassword(e.target.value)} 
                            className="h-9 rounded-lg" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground ml-1">Role</Label>
                          <Select value={editRole} onValueChange={(val: UserRole) => setEditRole(val)}>
                            <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View Only</SelectItem>
                              <SelectItem value="edit">Edit Access</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{u.userId}</span>
                          {u.userId === currentUser?.userId && (
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">You</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5 font-medium">Role: {u.role}</p>
                      </div>
                    )}
                    
                    {editingUserId === u.userId ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={loading}
                          className="text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-xl h-9 w-9 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={loading}
                          className="text-muted-foreground hover:bg-muted rounded-xl h-9 w-9 p-0"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(u)}
                          disabled={loading}
                          className="text-primary hover:bg-primary/10 rounded-xl h-8 px-2.5"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(u.userId)}
                          disabled={loading || u.userId === currentUser?.userId}
                          className="text-destructive hover:bg-destructive/10 rounded-xl h-8 px-2.5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
