"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Check } from "lucide-react";

interface InlineFieldEditorProps {
  value: string | null;
  label?: string;
  options?: string[];
  onSave: (value: string) => void;
  renderDisplay?: (value: string | null) => React.ReactNode;
  placeholder?: string;
}

export function InlineFieldEditor({
  value,
  label,
  options,
  onSave,
  renderDisplay,
  placeholder = "—",
}: InlineFieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [dropdownOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(value || "");
    setIsEditing(true);
    setDropdownOpen(false);
    setSearchText("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDropdownOpen(false);
    setSearchText("");
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
    setDropdownOpen(false);
    setSearchText("");
  };

  const handleSelectOption = (opt: string) => {
    setEditValue(opt);
    setDropdownOpen(false);
    setSearchText("");
  };

  const handleClear = () => {
    setEditValue("");
  };

  const filteredOptions = options?.filter((o) =>
    o.toLowerCase().includes(searchText.toLowerCase())
  );

  if (!isEditing) {
    return (
      <div
        className="cursor-pointer group/field inline-block"
        onClick={handleStartEdit}
      >
        {renderDisplay ? (
          renderDisplay(value)
        ) : (
          <span className="text-[13px] text-gray-700 group-hover/field:text-blue-600 transition-colors">
            {value || <span className="text-gray-300">{placeholder}</span>}
          </span>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Editing overlay */}
      <div className="bg-gray-50 rounded-lg p-3 shadow-sm border border-gray-200 min-w-[220px]">
        {label && (
          <div className="text-[11px] font-medium text-gray-500 mb-1.5">{label}</div>
        )}

        {/* Input field */}
        <div className="flex items-center border-2 border-blue-500 rounded-lg bg-white overflow-hidden">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none bg-transparent"
            placeholder={placeholder}
            readOnly={!!options}
          />
          <div className="flex items-center gap-0.5 pr-2">
            {editValue && (
              <button
                onClick={handleClear}
                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            {options && (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {dropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Dropdown options */}
        {options && dropdownOpen && (
          <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 z-50">
            {/* Search within dropdown */}
            <div className="border-b border-gray-100">
              <input
                ref={searchRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm focus:outline-none border-2 border-blue-500 rounded-t-lg"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filteredOptions?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                    opt === editValue
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{opt}</span>
                  {opt === editValue && <Check size={15} className="text-blue-600" />}
                </button>
              ))}
              {filteredOptions?.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
              )}
            </div>
          </div>
        )}

        {/* Cancel / Save buttons */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
