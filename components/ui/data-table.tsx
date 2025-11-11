"use client";

import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Button } from "./button";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import { ConfirmationModal } from "./confirmation-modal";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Filter,
} from "lucide-react";

export interface DataTableColumn<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  hidden?: boolean;
  center?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  onDeleteSelected?: (items: T[]) => void;
  "data-testid"?: string;
  /**
   * Optional function to generate a detail URL for a given row.
   * When provided, the text in the first visible column of each row will be rendered as a link
   * that navigates to the item's detail page.
   */
  getRowHref?: (item: T) => string;
  /**
   * Optional multi-select severity filter that will be rendered next to the Search field.
   * When provided, users can pick one or more severities to filter the table rows.
   */
  severityFilter?: {
    /** Returns the severity value for an item (e.g. "1", "2", "3", "4"). */
    accessor: (item: T) => string | null | undefined;
    /** Label for the filter trigger button (defaults to "Severity"). */
    label?: string;
    /**
     * Custom options. If omitted, defaults to Critical (1), High (2), Medium (3), Low (4).
     */
    options?: Array<{
      value: string;
      label: string;
      colorClass?: string; // Tailwind classes for the color dot
    }>;
  };
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  selectable = false,
  onDeleteSelected,
  "data-testid": dataTestId,
  severityFilter,
  getRowHref,
}: DataTableProps<T> & { "data-testid"?: string }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortColumn, setSortColumn] = React.useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );
  const [selectedRows, setSelectedRows] = React.useState<T[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [selectedSeverities, setSelectedSeverities] = React.useState<string[]>(
    [],
  );
  const itemsPerPage = 10;

  // Local helper component: Severity multi-select dropdown
  function SeverityDropdown({
    label,
    options,
    selectedValues,
    onChange,
  }: {
    label?: string;
    options?: Array<{ value: string; label: string; colorClass?: string }>;
    selectedValues: string[];
    onChange: (values: string[]) => void;
  }) {
    const defaultOptions = React.useMemo(
      () => [
        { value: "1", label: "Critical", colorClass: "bg-red-400" },
        { value: "2", label: "High", colorClass: "bg-orange-400" },
        { value: "3", label: "Medium", colorClass: "bg-yellow-400" },
        { value: "4", label: "Low", colorClass: "bg-blue-400" },
      ],
      [],
    );

    const opts = options && options.length > 0 ? options : defaultOptions;

    const toggleValue = (val: string, checked: boolean | "indeterminate") => {
      const c = Boolean(checked);
      if (c) {
        if (!selectedValues.includes(val)) onChange([...selectedValues, val]);
      } else {
        onChange(selectedValues.filter((v) => v !== val));
      }
    };

    const clearAll = () => onChange([]);

    const activeCount = selectedValues.length;
    const btnLabel = `${label ?? "Severity"}${activeCount > 0 ? ` (${activeCount})` : ""}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" id={"severity-filter"}>
            <Filter className="mr-2 h-4 w-4" /> {btnLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56"
          onCloseAutoFocus={(e) => {
            // Explicitly restore focus to the trigger using its ID
            // after the menu closes (selection, Clear, Escape, click outside).
            e.preventDefault();
            const el = document.getElementById("severity-filter");
            if (el instanceof HTMLElement) el.focus();
          }}
        >
          <DropdownMenuLabel>{label ?? "Severity"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {opts.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={selectedValues.includes(o.value)}
              onCheckedChange={(checked) => toggleValue(o.value, checked)}
            >
              <span className="flex items-center">
                <span
                  className={`mr-2 h-3 w-3 rounded-full ${o.colorClass ?? "bg-gray-400"}`}
                />
                {o.label}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={clearAll}>Clear</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Handle column sort
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    if (sortColumn === column.accessorKey) {
      // Toggle direction if same column is clicked
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column and default to ascending
      setSortColumn(column.accessorKey);
      setSortDirection("asc");
    }
  };

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    // First filter the data
    let processedData = data;

    if (searchTerm) {
      processedData = processedData.filter((item) => {
        return columns.some((column) => {
          const value = item[column.accessorKey];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // Apply severity filter if enabled and any values are selected
    if (severityFilter && selectedSeverities.length > 0) {
      processedData = processedData.filter((item) => {
        const sev = severityFilter.accessor(item);
        return sev != null && selectedSeverities.includes(String(sev));
      });
    }

    // Then sort the data if a sort column is specified
    if (sortColumn) {
      processedData = [...processedData].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        // Handle null or undefined values
        if (aValue === null || aValue === undefined)
          return sortDirection === "asc" ? -1 : 1;
        if (bValue === null || bValue === undefined)
          return sortDirection === "asc" ? 1 : -1;

        // Compare dates if values are date strings
        if (
          typeof aValue === "string" &&
          typeof bValue === "string" &&
          !isNaN(Date.parse(aValue)) &&
          !isNaN(Date.parse(bValue))
        ) {
          const dateA = new Date(aValue).getTime();
          const dateB = new Date(bValue).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }

        // Compare strings
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Compare numbers
        return sortDirection === "asc"
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      });
    }

    return processedData;
  }, [
    data,
    searchTerm,
    columns,
    sortColumn,
    sortDirection,
    severityFilter,
    selectedSeverities,
  ]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle row selection
  const handleRowSelect = (item: T, isSelected: boolean) => {
    if (isSelected) {
      setSelectedRows([...selectedRows, item]);
    } else {
      setSelectedRows(selectedRows.filter((row) => row !== item));
    }
  };

  // Handle select all rows on current page
  const handleSelectAllRows = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedRows([
        ...selectedRows,
        ...paginatedData.filter((item) => !selectedRows.includes(item)),
      ]);
    } else {
      const paginatedDataSet = new Set(paginatedData);
      setSelectedRows(
        selectedRows.filter((item) => !paginatedDataSet.has(item)),
      );
    }
  };

  // Show confirmation modal for deletion
  const showDeleteConfirmation = () => {
    if (selectedRows.length > 0) {
      setIsConfirmModalOpen(true);
    }
  };

  // Handle delete selected rows after confirmation
  const handleDeleteSelected = () => {
    if (onDeleteSelected && selectedRows.length > 0) {
      onDeleteSelected(selectedRows);
      setSelectedRows([]);
    }
  };

  // Check if an item is selected
  const isItemSelected = (item: T) => {
    return selectedRows.includes(item);
  };

  // Check if all items on current page are selected
  const areAllItemsSelected = () => {
    return (
      paginatedData.length > 0 &&
      paginatedData.every((item) => selectedRows.includes(item))
    );
  };

  const centeredColumns = [
    "issueCount",
    "criticalIssueCount",
    "highIssueCount",
    "mediumIssueCount",
    "lowIssueCount",
  ];

  return (
    <div className="space-y-4" data-testid={dataTestId}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2 top-3 h-6 w-6 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-primary-foreground"
            />
          </div>
          {severityFilter && (
            <SeverityDropdown
              label={severityFilter.label}
              options={severityFilter.options}
              selectedValues={selectedSeverities}
              onChange={setSelectedSeverities}
            />
          )}
          {selectable && selectedRows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={showDeleteConfirmation}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedRows.length})
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden shadow">
        <Table>
          <TableHeader>
            <TableRow className={"bg-primary hover:bg-primary dark:bg-card"}>
              {selectable && (
                <TableHead className="text-primary-foreground font-bold dark:text-white w-12">
                  <Checkbox
                    className={
                      "border-white data-[state=checked]:border-white dark:text-white"
                    }
                    checked={areAllItemsSelected()}
                    onCheckedChange={handleSelectAllRows}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {columns
                .filter((column) => !column.hidden)
                .map((column, index) => (
                  <TableHead
                    className={`text-primary-foreground font-bold dark:text-white ${
                      centeredColumns.includes(String(column.accessorKey))
                        ? "text-center"
                        : ""
                    } ${column.sortable ? "cursor-pointer select-none" : ""}`}
                    key={String(column.accessorKey) + index}
                    onClick={() => column.sortable && handleSort(column)}
                  >
                    <div
                      className={`flex items-center ${column.center ? "justify-center" : ""}`}
                    >
                      <span>{column.header}</span>
                      {column.sortable && (
                        <div className="ml-2">
                          {sortColumn === column.accessorKey ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : (
                              <ArrowDown className="h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-70" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? columns.length + 1 : columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={index}
                  onClick={(e) => {
                    // Only trigger row click if not clicking on a checkbox
                    if (onRowClick && !e.defaultPrevented) {
                      onRowClick(item);
                    }
                  }}
                  className={`
                    ${onRowClick ? "cursor-pointer hover:bg-muted" : ""}
                    ${isItemSelected(item) ? "bg-muted/50" : "bg-card/60"}
                  `}
                >
                  {selectable && (
                    <TableCell className="w-12">
                      <Checkbox
                        className={
                          "border-black dark:border-white dark:text-white"
                        }
                        checked={isItemSelected(item)}
                        onCheckedChange={(checked) => {
                          handleRowSelect(item, !!checked);
                        }}
                        aria-label={`Select row ${index + 1}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns
                    .filter((column) => !column.hidden)
                    .map((column, index) => (
                      <TableCell key={String(column.accessorKey) + "-" + index}>
                        {(() => {
                          const content = column.cell
                            ? column.cell(item)
                            : String(item[column.accessorKey] || "");

                          // If a row href generator is provided, render the first visible column as a link
                          if (getRowHref && index === 0) {
                            const href = getRowHref(item);
                            return (
                              <Link
                                href={href}
                                onClick={(e) => {
                                  // Prevent triggering the row onClick handler
                                  e.stopPropagation();
                                }}
                                className="text-primary underline-offset-2 a11y-focus focus:underline block"
                              >
                                {content}
                              </Link>
                            );
                          }

                          return content;
                        })()}
                      </TableCell>
                    ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDeleteSelected}
        title="Confirm Deletion"
        message="Are you sure you want to delete the selected items? This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </div>
  );
}
