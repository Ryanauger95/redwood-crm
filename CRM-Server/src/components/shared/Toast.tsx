"use client";

import { useState, useCallback } from "react";
import { Check } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  const toastElement = (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg bg-green-600 text-white text-sm font-medium"
        >
          <Check size={14} />
          {t.message}
        </div>
      ))}
    </div>
  );

  return { showToast, toastElement };
}
