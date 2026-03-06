"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, User, X } from "lucide-react";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";

interface SearchBusiness {
  business_id: number;
  le_name: string | null;
  lf_name: string | null;
  city: string | null;
  county: string | null;
  enrichment_status: string;
  acquisition_fit_score: number | null;
  pipelineStage: { stage: string } | null;
}

interface SearchPerson {
  person_id: number;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  state_code: string | null;
  businessPeople: { business: { le_name: string | null; lf_name: string | null } }[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState<SearchBusiness[]>([]);
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setBusinesses([]);
      setPeople([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBusinesses(data.businesses || []);
      setPeople(data.people || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 280);
  };

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    setBusinesses([]);
    setPeople([]);
  };

  const hasResults = businesses.length > 0 || people.length > 0;
  const showDropdown = open && (query.length >= 2);

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 text-sm transition-colors w-full border border-gray-200"
      >
        <Search size={14} />
        <span className="flex-1 text-left text-gray-400">Search anything...</span>
        <kbd className="text-xs bg-white border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {/* Modal overlay + input */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setOpen(false); setQuery(""); }} />
          <div ref={containerRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden border border-gray-200">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={handleChange}
                placeholder="Search businesses, people, cities..."
                autoFocus
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => { setQuery(""); setBusinesses([]); setPeople([]); }} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
              {loading && (
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>

            {/* Results */}
            {showDropdown && (
              <div className="max-h-96 overflow-y-auto">
                {!hasResults && !loading && query.length >= 2 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}

                {businesses.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                      Businesses
                    </div>
                    {businesses.map((b) => (
                      <button
                        key={b.business_id}
                        onClick={() => navigate(`/accounts/${b.business_id}`)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 size={15} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {b.le_name || b.lf_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {[b.city, b.county ? `${b.county} Co.` : null].filter(Boolean).join(" · ")}
                            {b.pipelineStage && (
                              <span className="ml-1 text-blue-500">{b.pipelineStage.stage}</span>
                            )}
                          </p>
                        </div>
                        <FitScoreBadge score={b.acquisition_fit_score} size="sm" />
                      </button>
                    ))}
                  </div>
                )}

                {people.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                      People
                    </div>
                    {people.map((p) => {
                      const name = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
                      const biz = p.businessPeople[0]?.business;
                      return (
                        <button
                          key={p.person_id}
                          onClick={() => navigate(`/contacts/${p.person_id}`)}
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <User size={15} className="text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {biz ? (biz.le_name || biz.lf_name) : ""}
                              {p.city && ` · ${p.city}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer hint */}
            {!showDropdown && (
              <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-3">
                <span>Type to search businesses and people</span>
                <span className="ml-auto">ESC to close</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
