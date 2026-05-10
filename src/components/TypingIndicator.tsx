"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <div className="w-2 h-2 rounded-full bg-[var(--primary)] typing-dot" />
      <div className="w-2 h-2 rounded-full bg-[var(--primary)] typing-dot" />
      <div className="w-2 h-2 rounded-full bg-[var(--primary)] typing-dot" />
      <span className="text-xs text-[var(--muted)] ml-1">AI is analyzing...</span>
    </div>
  );
}
