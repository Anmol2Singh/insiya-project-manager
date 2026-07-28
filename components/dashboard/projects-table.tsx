"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, ChevronUp, ChevronDown, MapPin, Tag } from "lucide-react"
import type { ProjectSummary } from "@/lib/types"

interface ProjectsTableProps {
  projects: ProjectSummary[]
}

type SortField = "id_no" | "site_name" | "order_value" | "balance"
type SortDirection = "asc" | "desc"

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [sortField, setSortField] = useState<SortField>("id_no")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    const multiplier = sortDirection === "asc" ? 1 : -1

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * multiplier
    }
    return ((aValue as number) - (bValue as number)) * multiplier
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1 text-primary" />
    )
  }

  return (
    <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-md overflow-hidden transition-all duration-300">
      <CardHeader className="pb-4 bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Project Directory</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and track all installation sites</p>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-bold">
            {projects.length} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                <TableHead
                  className="cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                  onClick={() => handleSort("id_no")}
                >
                  ID <SortIcon field="id_no" />
                </TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Type</TableHead>
                <TableHead
                  className="cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                  onClick={() => handleSort("site_name")}
                >
                  Site Name <SortIcon field="site_name" />
                </TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Address</TableHead>
                <TableHead
                  className="text-right cursor-pointer font-bold text-foreground bg-info/5 uppercase text-[10px] tracking-widest py-4"
                  onClick={() => handleSort("order_value")}
                >
                  Order Value <SortIcon field="order_value" />
                </TableHead>
                <TableHead className="text-right font-bold text-foreground bg-success/5 uppercase text-[10px] tracking-widest py-4">
                  Payment Recd
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                  onClick={() => handleSort("balance")}
                >
                  Balance <SortIcon field="balance" />
                </TableHead>
                <TableHead className="text-center font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {sortedProjects.map((project, index) => (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-muted/40 group border-b last:border-0"
                  >
                    <TableCell className="font-bold text-muted-foreground">{project.id_no}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground font-bold text-[10px] uppercase px-2 h-5">
                        {project.order_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-bold text-foreground">
                      {project.site_name}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                      {project.address}
                    </TableCell>
                    <TableCell className="text-right bg-info/5 font-mono text-xs">
                      {formatCurrency(project.order_value)}
                    </TableCell>
                    <TableCell className="text-right bg-success/5 font-mono text-xs text-success font-semibold">
                      {formatCurrency(project.payment_received)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${project.balance > 0 ? "text-success" : project.balance < 0 ? "text-destructive" : ""
                      }`}>
                      {formatCurrency(project.balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full font-bold text-xs">
                          <ExternalLink className="h-3 w-3 mr-1.5" />
                          Ledger
                        </Button>
                      </Link>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {sortedProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic">
                    No projects match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-border">
          <AnimatePresence>
            {sortedProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 space-y-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#{project.id_no}</span>
                      <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground text-[9px] font-bold uppercase h-4 px-1">
                        {project.order_type}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{project.site_name}</h3>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{project.address}</span>
                    </div>
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-primary/20 text-primary hover:bg-primary/10 shadow-sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-info/10 rounded-xl p-3 border border-info/20">
                    <p className="text-info-foreground/70 text-[9px] font-bold uppercase tracking-widest mb-1">Contract</p>
                    <p className="font-bold text-sm">{formatCurrency(project.order_value)}</p>
                  </div>
                  <div className="bg-success/10 rounded-xl p-3 border border-success/20">
                    <p className="text-success-foreground/70 text-[9px] font-bold uppercase tracking-widest mb-1">Collection</p>
                    <p className="font-bold text-sm text-success">{formatCurrency(project.payment_received)}</p>
                  </div>
                  <div className={`col-span-2 rounded-xl p-3 border shadow-inner ${project.balance > 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                    }`}>
                    <div className="flex justify-between items-center">
                      <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest">Outstanding Balance</p>
                      <p className={`font-bold text-base ${project.balance > 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(project.balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {sortedProjects.length === 0 && (
            <div className="p-16 text-center text-muted-foreground italic text-sm">
              No projects found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
