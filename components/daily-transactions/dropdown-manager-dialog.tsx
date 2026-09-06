"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Edit2, Check, X, ListFilter } from "lucide-react"
import { toast } from "sonner"

interface DropdownManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  options: string[]
  onSave: (updatedOptions: string[]) => Promise<void> | void
}

export function DropdownManagerDialog({
  open,
  onOpenChange,
  title,
  options,
  onSave,
}: DropdownManagerDialogProps) {
  const [items, setItems] = useState<string[]>(options)
  const [newItem, setNewItem] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState("")

  useEffect(() => {
    setItems(options)
    setEditingIndex(null)
    setEditingText("")
  }, [options, open])

  const handleAddItem = async () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    if (items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already in the list`)
      return
    }
    const updated = [...items, trimmed]
    setItems(updated)
    setNewItem("")
    await onSave(updated)
    toast.success(`Added "${trimmed}"`)
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    setEditingText(items[index])
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingText("")
  }

  const handleSaveEdit = async (index: number) => {
    const trimmed = editingText.trim()
    if (!trimmed) {
      toast.error("Item name cannot be empty")
      return
    }
    if (
      items.some(
        (it, idx) => idx !== index && it.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      toast.error(`"${trimmed}" is already in the list`)
      return
    }

    const updated = [...items]
    const oldName = updated[index]
    updated[index] = trimmed
    setItems(updated)
    setEditingIndex(null)
    setEditingText("")
    await onSave(updated)
    toast.success(`Updated "${oldName}" to "${trimmed}"`)
  }

  const handleDeleteItem = async (index: number) => {
    const itemToDelete = items[index]
    if (!confirm(`Are you sure you want to remove "${itemToDelete}" from the list?`)) return
    const updated = items.filter((_, idx) => idx !== index)
    setItems(updated)
    await onSave(updated)
    toast.success(`Removed "${itemToDelete}"`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            Manage {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Add item input */}
          <div className="flex gap-2">
            <Input
              placeholder={`Add new ${title.toLowerCase()}...`}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddItem()
                }
              }}
              className="rounded-xl h-10 text-sm"
            />
            <Button
              type="button"
              onClick={handleAddItem}
              className="rounded-xl font-bold bg-primary text-primary-foreground h-10 px-4 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Current items list with Edit & Delete */}
          <div className="max-h-[320px] overflow-y-auto space-y-1.5 p-2 bg-muted/20 border rounded-2xl">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 italic">
                No items in this list yet.
              </p>
            ) : (
              items.map((item, idx) => {
                const isEditing = editingIndex === idx

                return (
                  <div
                    key={`${item}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-colors gap-2"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleSaveEdit(idx)
                            } else if (e.key === "Escape") {
                              handleCancelEdit()
                            }
                          }}
                          className="h-8 text-xs rounded-lg flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveEdit(idx)}
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                          title="Save changes"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg shrink-0"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold truncate pr-2 flex-1">
                          {item}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(idx)}
                            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                            title={`Edit ${item}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(idx)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                            title={`Delete ${item}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
