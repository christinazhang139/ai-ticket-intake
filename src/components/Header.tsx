"use client";

import { Bot, LayoutDashboard } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-[var(--border)] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-lg tracking-tight">
          MSPbots <span className="text-[var(--muted)] font-normal text-sm ml-1">AI Ticket Intake</span>
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
        <button className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors">
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-medium">
          CL
        </div>
      </div>
    </header>
  );
}
