"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavedViewData } from "@/lib/views";

interface Props {
  activeView: SavedViewData | null;
  mode: "save" | "rename";
  onSave: (name: string) => void;           // update active view name (rename)
  onSaveAsNew: (name: string) => void;      // create new view
  onClose: () => void;
}

export function SaveViewModal({ activeView, mode, onSave, onSaveAsNew, onClose }: Props) {
  const [name, setName] = useState(activeView?.name ?? "");

  const isDefault = activeView?.is_default ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {mode === "rename" ? "Rename view" : "Save view"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">View name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My custom view..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (mode === "rename") onSave(name);
                else onSaveAsNew(name);
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>

          {mode === "rename" ? (
            <Button size="sm" onClick={() => onSave(name)} disabled={!name.trim()}>
              Rename
            </Button>
          ) : (
            <>
              {!isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSave(name)}
                  disabled={!name.trim()}
                >
                  Save
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => onSaveAsNew(name)}
                disabled={!name.trim()}
              >
                Save as new
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
