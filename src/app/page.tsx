import Header from "@/components/Header";
import TicketIntake from "@/components/TicketIntake";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-[var(--background)]">
        <TicketIntake />
      </main>
      <footer className="border-t border-[var(--border)] bg-white px-6 py-3 text-center text-xs text-[var(--muted)]">
        AI Ticket Intake Prototype · Built with Cursor (Vibe Coding) · MSPbots AI PM Test Project
      </footer>
    </div>
  );
}
