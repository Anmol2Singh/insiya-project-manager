"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  allOptionLabel?: string // e.g. "All Firms" or "All Parties"
  allOptionValue?: string // default "ALL"
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  allOptionLabel,
  allOptionValue = "ALL",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Determine current display label
  const displayLabel = React.useMemo(() => {
    if (!value) return placeholder
    if (allOptionLabel && value === allOptionValue) return allOptionLabel
    const found = options.find((opt) => opt.toLowerCase() === value.toLowerCase())
    return found || value || placeholder
  }, [value, options, placeholder, allOptionLabel, allOptionValue])

  // Sanitize and deduplicate options
  const safeOptions = React.useMemo(() => {
    const set = new Set<string>()
    options.forEach((opt) => {
      const trimmed = opt?.trim()
      if (trimmed) set.add(trimmed)
    })
    return Array.from(set)
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-xl h-10 px-3 font-medium text-xs sm:text-sm bg-background hover:bg-muted/50 border-input text-left",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate pr-2">{displayLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 rounded-2xl shadow-xl border bg-popover z-50"
      >
        <Command className="rounded-2xl">
          <CommandInput placeholder={searchPlaceholder} className="h-10 text-xs" />
          <CommandList className="max-h-56 overflow-y-auto p-1">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {allOptionLabel && (
                <CommandItem
                  key="__all_option__"
                  value={allOptionLabel}
                  onSelect={() => {
                    onValueChange(allOptionValue)
                    setOpen(false)
                  }}
                  className="rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer py-2 px-2.5"
                >
                  <span>{allOptionLabel}</span>
                  {value === allOptionValue && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </CommandItem>
              )}
              {safeOptions.map((opt, idx) => {
                const isSelected = value?.toLowerCase() === opt.toLowerCase()
                return (
                  <CommandItem
                    key={`opt-${opt}-${idx}`}
                    value={opt}
                    onSelect={() => {
                      onValueChange(opt)
                      setOpen(false)
                    }}
                    className="rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer py-2 px-2.5"
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
