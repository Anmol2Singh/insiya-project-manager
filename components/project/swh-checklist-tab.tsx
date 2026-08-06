"use client"

import { useState } from "react"
import { Plus, CheckCircle2, XCircle, Edit2, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SwhChecklistItem } from "@/lib/types"
import { AddChecklistItemDialog } from "./add-checklist-item-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { hasEditPermission } from "@/lib/auth-store"

interface SwhChecklistTabProps {
  items: SwhChecklistItem[]
  projectId: string
  onRefresh: () => void
}

export function SwhChecklistTab({ items, projectId, onRefresh }: SwhChecklistTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<SwhChecklistItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useState(() => {
    setCanEdit(hasEditPermission())
  })

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this checklist item?")) return

    setDeletingId(itemId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("swh_checklist")
        .delete()
        .eq("id", itemId)

      if (error) throw error

      toast.success("Checklist item deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting checklist item:", error)
      toast.error(error.message || "Failed to delete checklist item")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">Checklist</CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditingItem(null); setShowAddDialog(true) }} className="bg-primary text-primary-foreground font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-warning/30 hover:bg-warning/30">
                  <TableHead className="font-semibold text-foreground w-12">S No</TableHead>
                  <TableHead className="font-semibold text-foreground">Item Name</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Req. Qty</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Customer Scope</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Our Scope</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Dispatch Qty</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Dispatched</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Installed Qty</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Installed</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Balance Qty</TableHead>
                  <TableHead className="font-semibold text-foreground">Remark</TableHead>
                  {canEdit && <TableHead className="font-semibold text-foreground text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id || `item-${index}`} className="hover:bg-muted/30 group">
                    <TableCell>{item.sr_no}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-right">{item.req_qty ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {item.customer_scope || (!item.our_scope && item.customer_scope !== false) ? (
                        <CheckCircle2 className="h-5 w-5 text-success inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.our_scope ? (
                        <CheckCircle2 className="h-5 w-5 text-success inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.dispatch_qty ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {item.dispatch_yes_no ? (
                        <CheckCircle2 className="h-5 w-5 text-success inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.installed_qty ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {item.installation_yes_no ? (
                        <CheckCircle2 className="h-5 w-5 text-success inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className={`text-right ${(item.dispatch_balance_qty || 0) > 0 ? "text-destructive font-medium" : ""}`}>
                      {item.dispatch_balance_qty ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {item.remark || "-"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right pr-2">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={() => setEditingItem(item)}
                            title="Edit item"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            title="Delete item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No checklist items yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            {items.map((item, index) => (
              <div key={item.id || `m-item-${index}`} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{item.sr_no}</span>
                    <h4 className="font-medium text-foreground">{item.item_name}</h4>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => setEditingItem(item)}
                        title="Edit item"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Required</p>
                    <p className="font-medium">{item.req_qty ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scope</p>
                    <div className="flex items-center gap-1">
                      {item.customer_scope ? (
                        <Badge className="bg-success text-success-foreground text-xs py-0 h-5 px-1.5">Customer</Badge>
                      ) : item.our_scope ? (
                        <Badge className="bg-success text-success-foreground text-xs py-0 h-5 px-1.5">Our</Badge>
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={`font-medium ${(item.dispatch_balance_qty || 0) > 0 ? "text-destructive" : ""}`}>
                      {item.dispatch_balance_qty ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.customer_scope ? (
                    <Badge className="bg-success text-success-foreground text-xs">✓ Customer Scope</Badge>
                  ) : item.our_scope ? (
                    <Badge className="bg-success text-success-foreground text-xs">✓ Our Scope</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">✗ No Scope</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {item.dispatch_yes_no ? (
                      <Badge className="bg-success text-success-foreground text-xs">Dispatched</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not Dispatched</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.installation_yes_no ? (
                      <Badge className="bg-success text-success-foreground text-xs">Installed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not Installed</Badge>
                    )}
                  </div>
                </div>

                {item.remark && (
                  <p className="text-sm text-muted-foreground">{item.remark}</p>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No checklist items yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddChecklistItemDialog
        open={showAddDialog || !!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null)
          setShowAddDialog(open && !editingItem)
        }}
        projectId={projectId}
        nextSrNo={items.length + 1}
        item={editingItem}
        onSuccess={onRefresh}
      />
    </>
  )
}
