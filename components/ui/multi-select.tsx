"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

// Define a type for the items that can be selected
type SelectItem = string | { value: string; label?: string } | Record<string, unknown>;

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: SelectItem[]; // Can be string[] or object[]
  onChangeAction: (selected: SelectItem[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function MultiSelect({
  options,
  selected,
  onChangeAction,
  placeholder = "Select items...",
  className,
  id,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (item: SelectItem) => {
    if (typeof item === 'string') {
      onChangeAction(selected.filter((i) => i !== item));
    } else {
      // If item is an object, compare by value property or stringify for comparison
      const itemKey = getUniqueKey(item);
      onChangeAction(selected.filter((i) => getUniqueKey(i) !== itemKey));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          // Remove the last item from the selected array
          onChangeAction(selected.slice(0, -1));
        }
      }
      // This is not a default behavior of the <input /> field
      if (e.key === "Escape") {
        input.blur();
      }
    }
  };

  const selectables = options.filter(
    (option) => !selected.some(item =>
      typeof item === 'string'
        ? item === option.value
        : (item?.value === option.value)
    ),
  );

  // Find the label for a selected value
  const getLabelForValue = (value: SelectItem): string => {
    if (typeof value === 'string') {
      const option = options.find(opt => opt.value === value);
      return option ? option.label : value;
    } else if (value && typeof value === 'object') {
      // If it's an object with label and value properties
      if ('label' in value && typeof value.label === 'string') return value.label;
      if ('value' in value && typeof value.value === 'string') {
        const option = options.find(opt => opt.value === value.value);
        return option ? option.label : value.value;
      }
      // Fallback to string representation
      return String(value);
    }
    // Fallback for null, undefined, or other types
    return String(value);
  };

  // Get a unique key for an item (handles both strings and objects)
  const getUniqueKey = (item: SelectItem): string => {
    if (item === null || item === undefined) return 'null';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      // If it's an object with a value property, use that
      if ('value' in item && typeof item.value === 'string') return item.value;
      // Otherwise use a stringified version with a prefix to avoid conflicts
      return `obj-${JSON.stringify(item)}`;
    }
    // For any other type, convert to string
    return String(item);
  };

  // Debug: console.log('Selected items:', selected);

  return (
    <Command
      id={id}
      onKeyDown={handleKeyDown}
      className={`overflow-visible bg-white rounded-md border border-gray-300 ${className}`}
    >
      <div className="flex flex-wrap gap-1 p-1">
        {selected.map((item) => {
          return (
            <Badge key={getUniqueKey(item)} className="rounded-sm px-1 py-0">
              {getLabelForValue(item)}
              <button
                type="button"
                className="ml-1 rounded-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(item);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          );
        })}
        <CommandPrimitive.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onBlur={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : undefined}
          className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="relative">
        {open && selectables.length > 0 && (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto max-h-[200px]">
              {selectables.map((option) => {
                // Debug: console.log(option);
                return (
                  <CommandItem
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      setInputValue("");
                      // Check if we already have this value to avoid duplicates
                      if (!selected.some(item =>
                        typeof item === 'string'
                          ? item === option.value
                          : (item?.value === option.value)
                      )) {
                        onChangeAction([...selected, option.value]);
                      }
                    }}
                    className={"cursor-pointer"}
                  >
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  );
}
