"use client";

import { useRef, useState, useEffect } from "react";
import { Filter, X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FilterCondition,
  FilterField,
  FilterOperator,
  OPERATOR_LABELS,
} from "@/lib/views";

interface Props {
  fields: FilterField[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}

const DEFAULT_OPS: Record<string, FilterOperator> = {
  text: "contains",
  number: "gte",
  select: "is",
  boolean: "is_true",
};

function defaultCondition(field: FilterField): FilterCondition {
  return {
    field: field.key,
    operator: field.operators[0] ?? DEFAULT_OPS[field.type],
    value: field.options?.[0]?.value ?? "",
  };
}

export function FilterBuilder({ fields, conditions, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterCondition[]>(conditions);
  const ref = useRef<HTMLDivElement>(null);

  // sync draft when conditions change externally (view switch)
  useEffect(() => {
    setDraft(conditions);
  }, [conditions]);

  // close on outside click
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

  const addCondition = () => {
    const field = fields[0];
    if (!field) return;
    setDraft([...draft, defaultCondition(field)]);
  };

  const removeCondition = (idx: number) => {
    setDraft(draft.filter((_, i) => i !== idx));
  };

  const updateCondition = (
    idx: number,
    update: Partial<FilterCondition>
  ) => {
    setDraft(
      draft.map((c, i) => {
        if (i !== idx) return c;
        const merged = { ...c, ...update };
        // when field changes, reset operator + value
        if (update.field) {
          const newField = fields.find((f) => f.key === update.field);
          if (newField) {
            merged.operator = newField.operators[0];
            merged.value = newField.options?.[0]?.value ?? "";
          }
        }
        // when operator changes to boolean, clear value
        if (
          update.operator === "is_true" ||
          update.operator === "is_false" ||
          update.operator === "is_not_empty"
        ) {
          merged.value = "";
        }
        return merged;
      })
    );
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const clearAll = () => {
    setDraft([]);
    onChange([]);
    setOpen(false);
  };

  const activeCount = conditions.length;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 ${activeCount > 0 ? "border-blue-400 text-blue-600" : ""}`}
      >
        <Filter size={13} />
        Filters
        {activeCount > 0 && (
          <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-[560px] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Filter conditions</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          {draft.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">No filters applied. Add a condition below.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {draft.map((cond, idx) => {
                const fieldDef = fields.find((f) => f.key === cond.field) ?? fields[0];
                const noValueOps: FilterOperator[] = ["is_true", "is_false", "is_not_empty"];
                const needsValue = !noValueOps.includes(cond.operator);

                return (
                  <div key={idx} className="flex items-center gap-2">
                    {/* Field */}
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(idx, { field: e.target.value })}
                      className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 flex-1 min-w-0"
                    >
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        updateCondition(idx, { operator: e.target.value as FilterOperator })
                      }
                      className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 w-32 flex-shrink-0"
                    >
                      {(fieldDef?.operators ?? []).map((op) => (
                        <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                      ))}
                    </select>

                    {/* Value */}
                    {needsValue && (
                      <>
                        {fieldDef?.type === "select" && fieldDef.options ? (
                          <select
                            value={cond.value}
                            onChange={(e) => updateCondition(idx, { value: e.target.value })}
                            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 flex-1 min-w-0"
                          >
                            {fieldDef.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={fieldDef?.type === "number" ? "number" : "text"}
                            value={cond.value}
                            onChange={(e) => updateCondition(idx, { value: e.target.value })}
                            placeholder="Value..."
                            autoComplete="nope"
                            className="text-sm border border-gray-200 rounded px-2 py-1.5 text-gray-700 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        )}
                      </>
                    )}
                    {!needsValue && <div className="flex-1" />}

                    {/* Remove */}
                    <button
                      onClick={() => removeCondition(idx)}
                      className="text-gray-300 hover:text-red-400 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <Plus size={13} /> Add condition
          </button>

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              onClick={clearAll}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear all
            </button>
            <Button size="sm" onClick={apply} className="flex items-center gap-1">
              <Check size={13} /> Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
