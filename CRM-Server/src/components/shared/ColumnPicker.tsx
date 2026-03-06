"use client";

import { useRef, useState, useEffect } from "react";
import { Columns, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@/lib/views";

interface Props {
  columnDefs: ColumnDef[];
  selected: string[];
  onChange: (columns: string[]) => void;
}

export function ColumnPicker({ columnDefs, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (key: string) => {
    const def = columnDefs.find((c) => c.key === key);
    if (def?.alwaysOn) return;
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      // keep order from columnDefs
      const newSelected = columnDefs
        .filter((c) => selected.includes(c.key) || c.key === key)
        .map((c) => c.key);
      onChange(newSelected);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5"
      >
        <Columns size={13} />
        Columns
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-52 py-2">
          <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-100 mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Columns</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
          {columnDefs.map((col) => {
            const isOn = selected.includes(col.key);
            const disabled = col.alwaysOn;
            return (
              <label
                key={col.key}
                className={`flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${disabled ? "opacity-50 cursor-default" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={disabled}
                  onChange={() => toggle(col.key)}
                  className="accent-blue-600"
                />
                {col.label}
                {disabled && <span className="text-xs text-gray-400 ml-auto">always</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
