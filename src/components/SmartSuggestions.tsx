"use client";

import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { getActiveSmartSuggestions } from "@/lib/smart-suggestions";

export default function SmartSuggestions({
  text,
  onInsert,
}: {
  text: string;
  onInsert: (chip: string) => void;
}) {
  const active = useMemo(() => getActiveSmartSuggestions(text), [text]);

  if (active.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      {active.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-2 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-lg"
        >
          <Lightbulb className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-800 mb-1.5">{s.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onInsert(chip)}
                  className="px-2.5 py-1 text-xs rounded-full border border-violet-300 bg-white text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-all cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
