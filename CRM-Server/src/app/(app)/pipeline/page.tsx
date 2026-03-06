"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/utils";
import { FitScoreBadge } from "@/components/shared/FitScoreBadge";
import { Star, Phone, Mail, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BusinessCard {
  business_id: number;
  le_name: string | null;
  lf_name: string | null;
  city: string | null;
  acquisition_fit_score: number | null;
  estimated_annual_profit: string | null;
  phone: string | null;
  email: string | null;
  cms_star_rating: string | null;
  stage: string;
  assigned_to: string | null;
}

type PipelineData = Record<string, BusinessCard[]>;

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineData>({});
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchPipeline = async () => {
    const res = await fetch("/api/pipeline");
    const data = await res.json();
    setPipeline(data.stages || {});
    setLoading(false);
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleDragStart = (e: React.DragEvent, businessId: number, fromStage: string) => {
    e.dataTransfer.setData("businessId", String(businessId));
    e.dataTransfer.setData("fromStage", fromStage);
  };

  const handleDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    const businessId = parseInt(e.dataTransfer.getData("businessId"));
    const fromStage = e.dataTransfer.getData("fromStage");

    if (fromStage === toStage) return;

    // Optimistic update
    setPipeline((prev) => {
      const newPipeline = { ...prev };
      const card = newPipeline[fromStage]?.find((b) => b.business_id === businessId);
      if (!card) return prev;

      newPipeline[fromStage] = newPipeline[fromStage].filter((b) => b.business_id !== businessId);
      newPipeline[toStage] = [...(newPipeline[toStage] || []), { ...card, stage: toStage }];
      return newPipeline;
    });
    setDragOver(null);

    await fetch(`/api/pipeline/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
  };

  const ACTIVE_STAGES = PIPELINE_STAGES.filter((s) => s !== "Closed" && s !== "Pass");

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage, si) => (
            <div key={stage} className="flex-shrink-0 w-60">
              <div className="h-8 bg-gray-200 rounded-lg mb-3 animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: (si % 3) + 1 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalInPipeline = Object.values(pipeline).reduce((sum, cards) => sum + cards.length, 0);

  const filteredPipeline: PipelineData = {};
  for (const [stage, cards] of Object.entries(pipeline)) {
    filteredPipeline[stage] = search
      ? cards.filter((c) =>
          (c.le_name || c.lf_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.city || "").toLowerCase().includes(search.toLowerCase())
        )
      : cards;
  }

  return (
    <div className="p-8 space-y-6 min-h-screen">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalInPipeline} businesses tracked — drag cards to move stages
          </p>
        </div>
        <div className="flex items-center gap-2 w-64">
          <Input
            placeholder="Search pipeline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const cards = filteredPipeline[stage] || [];
          const totalCards = pipeline[stage]?.length || 0;
          const colorClass = STAGE_COLORS[stage] || "bg-gray-100 text-gray-700";

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-60"
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {/* Column Header */}
              <div className={`px-3 py-2 rounded-lg mb-3 flex items-center justify-between ${colorClass}`}>
                <span className="text-xs font-bold uppercase tracking-wide">{stage}</span>
                <span className="text-xs font-bold bg-white/30 px-1.5 py-0.5 rounded-full">
                  {search && cards.length !== totalCards ? `${cards.length}/${totalCards}` : cards.length}
                </span>
              </div>

              {/* Drop Zone */}
              <div
                className={`min-h-24 rounded-lg transition-colors space-y-2 ${
                  dragOver === stage ? "bg-blue-50 ring-2 ring-blue-300" : ""
                }`}
              >
                {cards.map((card) => (
                  <div
                    key={card.business_id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.business_id, stage)}
                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <Link href={`/accounts/${card.business_id}`} onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-semibold text-gray-900 leading-tight hover:text-blue-600 transition-colors line-clamp-2">
                        {card.le_name || card.lf_name || "Unknown"}
                      </p>
                    </Link>
                    {card.city && (
                      <p className="text-xs text-gray-400 mt-0.5">{card.city}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <FitScoreBadge score={card.acquisition_fit_score} size="sm" />
                      {card.cms_star_rating && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <Star size={10} className="text-yellow-500" />
                          {card.cms_star_rating}
                        </span>
                      )}
                    </div>
                    {card.estimated_annual_profit && (
                      <p className="text-xs font-semibold text-green-700 mt-1.5">
                        {formatCurrency(Number(card.estimated_annual_profit))}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {card.phone && (
                        <a
                          href={`tel:${card.phone}`}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={12} />
                        </a>
                      )}
                      {card.email && (
                        <a
                          href={`mailto:${card.email}`}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}

                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-lg">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
