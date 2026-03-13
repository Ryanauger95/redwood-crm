"use client";

import { ReactNode, RefCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Shared table style constants ────────────────────────────────────────────
// All views MUST use these for consistent appearance.

export const TABLE = {
  thead: "border-b border-gray-100 bg-[#f8fafc]",
  th: "text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider",
  thSort:
    "text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors",
  row: "hover:bg-blue-50/60 transition-colors",
  cell: "px-4 py-2.5",
  cellText: "px-4 py-2.5 text-[13px] text-gray-600",
  checkbox:
    "rounded border-gray-300 text-blue-600 focus:ring-blue-500",
  pagination:
    "flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-[#f8fafc]",
  paginationText: "text-[13px] text-gray-400",
  emptyIcon: "mx-auto mb-2 opacity-30",
} as const;

// ─── Sort icon ───────────────────────────────────────────────────────────────

export function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: string;
  sortField: string;
  sortDir: "asc" | "desc";
}) {
  if (sortField !== field)
    return <span className="text-gray-300 ml-0.5 text-xs">&updownarrow;</span>;
  return sortDir === "desc" ? (
    <ChevronDown size={13} className="ml-0.5" />
  ) : (
    <ChevronUp size={13} className="ml-0.5" />
  );
}

// ─── Header checkbox ─────────────────────────────────────────────────────────

export function HeaderCheckbox({
  allChecked,
  indeterminate,
  onChange,
}: {
  allChecked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref: RefCallback<HTMLInputElement> = (el) => {
    if (el) el.indeterminate = indeterminate;
  };
  return (
    <th className="w-10 px-4 py-2.5">
      <input
        type="checkbox"
        checked={allChecked}
        ref={ref}
        onChange={onChange}
        className={TABLE.checkbox}
      />
    </th>
  );
}

// ─── Row checkbox ────────────────────────────────────────────────────────────

export function RowCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <td className="w-10 px-4 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={TABLE.checkbox}
      />
    </td>
  );
}

// ─── Cell renderers ──────────────────────────────────────────────────────────

const DASH = <span className="text-gray-300">&mdash;</span>;

/** Simple text cell */
export function TextCell({ value }: { value: string | number | null | undefined }) {
  return (
    <td className={TABLE.cellText}>
      {value != null && value !== "" ? value : DASH}
    </td>
  );
}

/** Boolean cell (Yes / No) */
export function BoolCell({ value }: { value: boolean | null | undefined }) {
  return (
    <td className={TABLE.cellText}>
      {value === true ? "Yes" : value === false ? "No" : DASH}
    </td>
  );
}

/** Currency cell */
export function CurrencyCell({ value }: { value: string | number | null | undefined }) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return (
    <td className={`${TABLE.cell} text-[13px] font-medium text-green-700`}>
      {n != null && !isNaN(n) ? formatCurrency(n) : <span className="text-gray-300 font-normal">&mdash;</span>}
    </td>
  );
}

/** Date cell */
export function DateCell({ value }: { value: string | null | undefined }) {
  return (
    <td className={`${TABLE.cell} text-xs text-gray-400`}>
      {value ? new Date(value).toLocaleDateString() : "&mdash;"}
    </td>
  );
}

/** Truncated text cell */
export function TruncCell({
  value,
  maxW = "max-w-xs",
}: {
  value: string | null | undefined;
  maxW?: string;
}) {
  return (
    <td className={`${TABLE.cellText} ${maxW}`}>
      {value ? (
        <span className="truncate block text-xs">{value}</span>
      ) : (
        DASH
      )}
    </td>
  );
}

/** External link cell */
export function LinkCell({
  value,
  label,
}: {
  value: string | null | undefined;
  label?: string;
}) {
  return (
    <td className={`${TABLE.cell} text-[13px]`}>
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs"
        >
          {label || "Link"}
        </a>
      ) : (
        DASH
      )}
    </td>
  );
}

/** Conditional column cell — renders children only if column is active */
export function ColCell({
  col,
  columns,
  children,
}: {
  col: string;
  columns: string[];
  children: ReactNode;
}) {
  if (!columns.includes(col)) return null;
  return <>{children}</>;
}

/** Conditional column header */
export function ColHeader({
  col,
  columns,
  label,
  sortable,
  onSort,
  sortField,
  sortDir,
}: {
  col: string;
  columns: string[];
  label: string;
  sortable?: boolean;
  onSort?: () => void;
  sortField?: string;
  sortDir?: "asc" | "desc";
}) {
  if (!columns.includes(col)) return null;
  if (sortable && onSort) {
    return (
      <th className={TABLE.thSort} onClick={onSort}>
        <span className="flex items-center">
          {label}{" "}
          <SortIcon
            field={col}
            sortField={sortField || ""}
            sortDir={sortDir || "desc"}
          />
        </span>
      </th>
    );
  }
  return <th className={TABLE.th}>{label}</th>;
}

/** Pagination bar */
export function PaginationBar({
  page,
  pages,
  total,
  onPrev,
  onNext,
  Button: Btn,
}: {
  page: number;
  pages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: React.ComponentType<any>;
}) {
  if (pages <= 1) return null;
  return (
    <div className={TABLE.pagination}>
      <p className={TABLE.paginationText}>
        Page {page} of {pages} &middot; {total.toLocaleString()} results
      </p>
      <div className="flex gap-2">
        <Btn variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>
          &larr; Previous
        </Btn>
        <Btn variant="outline" size="sm" onClick={onNext} disabled={page >= pages}>
          Next &rarr;
        </Btn>
      </div>
    </div>
  );
}
