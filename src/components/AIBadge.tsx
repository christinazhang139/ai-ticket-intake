"use client";

import { Sparkles } from "lucide-react";

export default function AIBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
      <Sparkles className="w-3 h-3" />
      {label || "AI Suggested"}
    </span>
  );
}
