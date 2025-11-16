import * as React from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"

export interface MultiSelectProps {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  onSearch?: (query: string) => void
  onAddNew?: (value: string) => void
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  onSearch,
  onAddNew,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const removeItem = (value: string) => {
    onChange(selected.filter(v => v !== value))
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    }
  }

  const handleAddNew = () => {
    if (searchQuery && onAddNew) {
      onAddNew(searchQuery)
      setSearchQuery("")
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap gap-1 mb-2">
        {selected.map(value => {
          const option = options.find(opt => opt.value === value)
          return (
            <Badge key={value} variant="secondary" className="gap-1">
              {option?.label || value}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeItem(value)
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )
        })}
      </div>

      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          onClick={() => setOpen(!open)}
        >
          <span className="text-muted-foreground">
            {selected.length > 0
              ? `${selected.length} item${selected.length > 1 ? 's' : ''} selected`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
            <input
              type="text"
              placeholder="Search or add new..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <p className="mb-2">No materials found</p>
                      {onAddNew && (
                        <Button size="sm" variant="outline" onClick={handleAddNew}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add "{searchQuery}"
                        </Button>
                      )}
                    </>
                  ) : (
                    'No materials available'
                  )}
                </div>
              ) : (
                filteredOptions.map(option => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center space-x-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent",
                      selected.includes(option.value) && "bg-accent"
                    )}
                    onClick={() => toggleOption(option.value)}
                  >
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}>
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))
              )}
            </div>

            {onAddNew && searchQuery && !filteredOptions.some(opt => opt.label.toLowerCase() === searchQuery.toLowerCase()) && (
              <div className="border-t pt-2 mt-2">
                <Button size="sm" variant="outline" className="w-full" onClick={handleAddNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add "{searchQuery}" as new material
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
      <path d="M5 12h14"></path>
      <path d="M12 5v14"></path>
    </svg>
  )
}
