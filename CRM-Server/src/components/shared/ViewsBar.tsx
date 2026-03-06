"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, MoreHorizontal, Check, X, ChevronDown, Eye, EyeOff } from "lucide-react";
import { SavedViewData } from "@/lib/views";

const MAX_TABS = 5;

interface Props {
  views: SavedViewData[];
  activeViewId: number | null;
  isDirty: boolean;
  onSelectView: (view: SavedViewData) => void;
  onRenameView: (id: number, name: string) => void;
  onDeleteView: (id: number) => void;
  onToggleHide: (id: number, hidden: boolean) => void;
  onSaveCurrent: () => Promise<void>;
  onSaveAsNew: (name: string) => void;
  onDiscard: () => void;
  activeView: SavedViewData | null;
}

export function ViewsBar({
  views,
  activeViewId,
  isDirty,
  onSelectView,
  onRenameView,
  onDeleteView,
  onToggleHide,
  onSaveCurrent,
  onSaveAsNew,
  onDiscard,
  activeView,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showSaveAsNew, setShowSaveAsNew] = useState(false);
  const [saveAsNewName, setSaveAsNewName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const menuRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const saveAsNewRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dot-menu on outside click
  useEffect(() => {
    if (menuOpenId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [overflowOpen]);

  useEffect(() => {
    if (showSaveAsNew) saveAsNewRef.current?.focus();
  }, [showSaveAsNew]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // ── Derived: which views go in tabs vs overflow ──────────────────────────
  const visibleViews = views.filter((v) => !v.is_hidden);
  const hiddenViews = views.filter((v) => v.is_hidden);

  // If active view is hidden or in overflow, ensure it's still reachable
  const activeIsInVisible = visibleViews.some((v) => v.id === activeViewId);
  const activeIsHidden = hiddenViews.some((v) => v.id === activeViewId);

  // Build tab list: first MAX_TABS visible, but if active is past MAX_TABS swap it in
  let tabViews: SavedViewData[];
  let overflowViews: SavedViewData[];

  const activeOverflowView = visibleViews.slice(MAX_TABS).find((v) => v.id === activeViewId);
  if (activeOverflowView) {
    // swap active into last tab slot
    tabViews = [...visibleViews.slice(0, MAX_TABS - 1), activeOverflowView];
    overflowViews = [
      visibleViews[MAX_TABS - 1],
      ...visibleViews.slice(MAX_TABS).filter((v) => v.id !== activeViewId),
    ];
  } else {
    tabViews = visibleViews.slice(0, MAX_TABS);
    overflowViews = visibleViews.slice(MAX_TABS);
  }

  const hasOverflowMenu = overflowViews.length > 0 || hiddenViews.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const commitSaveAsNew = () => {
    if (!saveAsNewName.trim()) return;
    onSaveAsNew(saveAsNewName.trim());
    setShowSaveAsNew(false);
    setSaveAsNewName("");
  };

  const commitRename = (id: number) => {
    if (!renameValue.trim()) return;
    onRenameView(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue("");
  };

  const handleSaveCurrent = async () => {
    setSaveStatus("saving");
    await onSaveCurrent();
    setSaveStatus("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1800);
  };

  // ── Tab renderer ─────────────────────────────────────────────────────────
  const renderTab = (v: SavedViewData) => {
    const isActive = v.id === activeViewId;
    const isRenaming = renamingId === v.id;

    return (
      <div key={v.id} className="relative flex-shrink-0 flex items-center">
        {isRenaming ? (
          <div className="flex items-center gap-1 px-2 py-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(v.id);
                if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
              }}
              className="text-sm border border-blue-400 rounded px-1.5 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button onClick={() => commitRename(v.id)} className="text-blue-600 p-0.5"><Check size={13} /></button>
            <button onClick={() => { setRenamingId(null); setRenameValue(""); }} className="text-gray-400 p-0.5"><X size={13} /></button>
          </div>
        ) : (
          <button
            onClick={() => onSelectView(v)}
            className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {v.name}
            {isActive && isDirty && <span className="ml-1.5 text-xs text-orange-500">●</span>}
          </button>
        )}

        {/* ⋯ menu */}
        {!isRenaming && (
          <div className="relative" ref={menuOpenId === v.id ? menuRef : null}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === v.id ? null : v.id); }}
              className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpenId === v.id && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-40 py-1">
                {!v.is_default && (
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => { setRenamingId(v.id); setRenameValue(v.name); setMenuOpenId(null); }}
                  >
                    Rename
                  </button>
                )}
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { onToggleHide(v.id, true); setMenuOpenId(null); }}
                >
                  <EyeOff size={13} className="text-gray-400" /> Hide from bar
                </button>
                {!v.is_default && (
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                    onClick={() => { onDeleteView(v.id); setMenuOpenId(null); }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sticky top-14 z-10 bg-white border-b border-gray-200 shadow-sm">
      {/* Tab row */}
      <div className="flex items-center px-6">
        {/* Tabs */}
        {tabViews.map(renderTab)}

        {/* Overflow "..." button */}
        {hasOverflowMenu && (
          <div className="relative flex-shrink-0" ref={overflowOpen ? overflowRef : null}>
            <button
              onClick={() => setOverflowOpen(!overflowOpen)}
              className={`flex items-center gap-0.5 px-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                !activeIsInVisible && !activeIsHidden
                  ? "border-transparent text-gray-500"
                  : activeIsHidden
                  ? "border-orange-400 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>More</span>
              <ChevronDown size={13} />
            </button>

            {overflowOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-52 py-1">
                {overflowViews.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { onSelectView(v); setOverflowOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      v.id === activeViewId ? "text-blue-600 font-medium" : "text-gray-700"
                    }`}
                  >
                    <span>{v.name}</span>
                    {v.id === activeViewId && <Check size={13} />}
                  </button>
                ))}

                {hiddenViews.length > 0 && (
                  <>
                    {overflowViews.length > 0 && <div className="my-1 border-t border-gray-100" />}
                    <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hidden views</p>
                    {hiddenViews.map((v) => (
                      <div key={v.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50">
                        <span className="text-sm text-gray-500">{v.name}</span>
                        <button
                          onClick={() => { onToggleHide(v.id, false); setOverflowOpen(false); }}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye size={12} /> Show
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* + New view */}
        <button
          onClick={() => { setSaveAsNewName(""); setShowSaveAsNew(true); }}
          className="flex items-center ml-1 px-2 py-3 text-gray-400 hover:text-blue-600 flex-shrink-0 transition-colors"
          title="Save as new view"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Unsaved changes bar */}
      {isDirty && !showSaveAsNew && saveStatus === "idle" && (
        <div className="flex items-center gap-3 px-6 py-2 bg-orange-50 border-t border-orange-100 text-xs">
          <span className="font-medium text-orange-700">Unsaved changes</span>
          {!activeView?.is_default && (
            <button onClick={handleSaveCurrent} className="text-orange-700 underline hover:no-underline">
              Save
            </button>
          )}
          <button
            onClick={() => { setSaveAsNewName(""); setShowSaveAsNew(true); }}
            className="text-orange-700 underline hover:no-underline"
          >
            Save as new
          </button>
          <button onClick={onDiscard} className="ml-auto text-orange-400 hover:text-orange-600">
            Discard
          </button>
        </div>
      )}

      {/* Saving / Saved feedback */}
      {(saveStatus === "saving" || saveStatus === "saved") && (
        <div className="flex items-center gap-2 px-6 py-2 bg-green-50 border-t border-green-100 text-xs">
          {saveStatus === "saving" ? (
            <span className="text-green-700">Saving…</span>
          ) : (
            <span className="text-green-700 flex items-center gap-1.5 font-medium">
              <Check size={13} /> Saved
            </span>
          )}
        </div>
      )}

      {/* Save-as-new inline input */}
      {showSaveAsNew && (
        <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-t border-blue-100">
          <span className="text-xs text-blue-700 font-medium flex-shrink-0">New view name:</span>
          <input
            ref={saveAsNewRef}
            value={saveAsNewName}
            onChange={(e) => setSaveAsNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSaveAsNew();
              if (e.key === "Escape") setShowSaveAsNew(false);
            }}
            placeholder="My custom view..."
            className="text-xs border border-blue-300 rounded px-2 py-1 w-52 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={commitSaveAsNew}
            disabled={!saveAsNewName.trim()}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          <button onClick={() => setShowSaveAsNew(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
