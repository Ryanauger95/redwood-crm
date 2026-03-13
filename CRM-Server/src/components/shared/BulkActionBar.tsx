"use client";

import { useState } from "react";
import { X, UserPlus, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  allPagesSelected: boolean;
  hasMultiplePages: boolean;
  onSelectAllPages: () => void;
  onClearSelection: () => void;
  onAssign: (userId: number) => void;
  onChangeField: (field: string, value: string) => void;
  assignableUsers: { id: number; name: string }[];
  editableFields: { key: string; label: string; options?: string[] }[];
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  allPagesSelected,
  hasMultiplePages,
  onSelectAllPages,
  onClearSelection,
  onAssign,
  onChangeField,
  assignableUsers,
  editableFields,
}: BulkActionBarProps) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState("");

  const activeField = editableFields.find((f) => f.key === selectedField);

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 flex items-center gap-3 animate-in slide-in-from-top-1">
      <span className="text-sm font-medium text-blue-800">
        {allPagesSelected
          ? `All ${totalCount.toLocaleString()} selected`
          : `${selectedCount} selected`}
      </span>

      {hasMultiplePages && !allPagesSelected && (
        <button
          onClick={onSelectAllPages}
          className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
        >
          Select all {totalCount.toLocaleString()} across all pages
        </button>
      )}

      <div className="h-4 w-px bg-blue-200 mx-1" />

      {/* Bulk Actions */}
      <div className="flex items-center gap-2">
        {/* Assign */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowAssignDropdown(!showAssignDropdown); setShowFieldDropdown(false); }}
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5"
          >
            <UserPlus size={14} />
            Assign
          </Button>
          {showAssignDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {assignableUsers.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">No users available</div>
              ) : (
                assignableUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { onAssign(u.id); setShowAssignDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    {u.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Edit Field */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowFieldDropdown(!showFieldDropdown); setShowAssignDropdown(false); setSelectedField(null); }}
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5"
          >
            <Edit3 size={14} />
            Edit Field
          </Button>
          {showFieldDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {!selectedField ? (
                editableFields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setSelectedField(f.key); setFieldValue(""); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    {f.label}
                  </button>
                ))
              ) : (
                <div className="p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase">{activeField?.label}</div>
                  {activeField?.options ? (
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {activeField.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { onChangeField(selectedField, opt); setShowFieldDropdown(false); setSelectedField(null); }}
                          className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        placeholder="Enter value..."
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && fieldValue) {
                            onChangeField(selectedField, fieldValue);
                            setShowFieldDropdown(false);
                            setSelectedField(null);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => { if (fieldValue) { onChangeField(selectedField, fieldValue); setShowFieldDropdown(false); setSelectedField(null); } }}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedField(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    &larr; Back
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto">
        <button
          onClick={onClearSelection}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
