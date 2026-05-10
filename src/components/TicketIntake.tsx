"use client";

import { useState, useCallback } from "react";
import {
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ChevronDown,
  MessageCircleQuestion,
  Info,
  Link2,
  X,
  Clock,
  BookOpen,
  Bug,
  Gauge,
  UserCircle,
  ArrowUpRight,
  SpellCheck,
  Phone,
} from "lucide-react";
import AIBadge from "./AIBadge";
import TypingIndicator from "./TypingIndicator";
import SmartSuggestions from "./SmartSuggestions";
import ChatIntake from "./ChatIntake";
import VoiceCall from "./VoiceCall";
import {
  simulateAIAnalysis,
  CATEGORIES,
  PRIORITIES,
  DEMO_SCENARIOS,
  type AIAnalysis,
} from "@/lib/mock-ai";
import type { TicketData } from "@/lib/mock-ai";

type Step = "describe" | "chatMode" | "voiceCall" | "analyzing" | "review" | "submitted";

export default function TicketIntake() {
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [guidedAnswers, setGuidedAnswers] = useState<Record<number, string>>({});
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({});
  const [duplicateAction, setDuplicateAction] = useState<"link" | "separate" | null>(null);

  const [ticket, setTicket] = useState<TicketData>({
    description: "",
    contactName: "Christina Lee",
    contactEmail: "christina@acmecorp.com",
    company: "Acme Corporation",
    summary: "",
    category: "",
    subcategory: "",
    priority: "",
    affectedUsers: "",
    additionalDetails: "",
  });

  const handleAnalyze = useCallback(async () => {
    if (!description.trim()) return;
    setStep("analyzing");
    const result = await simulateAIAnalysis(description);
    setAnalysis(result);
    setTicket((prev) => ({
      ...prev,
      description,
      summary: result.summary,
      category: result.category,
      subcategory: result.subcategory,
      priority: result.priority,
    }));
    setStep("review");
  }, [description]);

  const handleSubmit = () => setStep("submitted");

  const handleReset = () => {
    setStep("describe");
    setDescription("");
    setAnalysis(null);
    setGuidedAnswers({});
    setClarificationAnswers({});
    setDuplicateAction(null);
    setTicket({
      description: "",
      contactName: "Christina Lee",
      contactEmail: "christina@acmecorp.com",
      company: "Acme Corporation",
      summary: "",
      category: "",
      subcategory: "",
      priority: "",
      affectedUsers: "",
      additionalDetails: "",
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Step Progress */}
      <StepProgress step={step} />

      {/* STEP 1: Describe */}
      {(step === "describe" || step === "analyzing") && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Support Ticket</h2>
              <div className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Assisted Intake
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Contact Name", value: ticket.contactName },
                  { label: "Email", value: ticket.contactEmail },
                  { label: "Company", value: ticket.company },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1">{f.label}</label>
                    <input type="text" value={f.value} readOnly className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-gray-50 text-sm" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Describe your issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what's happening in your own words..."
                  rows={4}
                  disabled={step === "analyzing"}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 transition-all text-sm resize-none placeholder:text-gray-400 disabled:opacity-60"
                />
                <p className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  AI will analyze your description and help fill in the details.
                </p>
              </div>

              {step === "describe" && description.length > 0 && (
                <SmartSuggestions
                  text={description}
                  onInsert={(chip) => setDescription((prev) => prev.trimEnd() + " — " + chip + ". ")}
                />
              )}

              {step === "analyzing" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
                  <TypingIndicator />
                </div>
              )}

              {step === "describe" && !description && (
                <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
                  <p className="text-xs font-medium text-[var(--muted)] mb-2.5">Try a demo scenario:</p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_SCENARIOS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setDescription(s.description)}
                        className={`px-3 py-1.5 text-xs rounded-full border border-[var(--border)] bg-white transition-all ${s.color}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("chatMode")}
                  className="px-4 py-2.5 rounded-lg border-2 border-dashed border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-400 font-medium text-sm transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Help me describe it
                </button>
                <button
                  onClick={() => setStep("voiceCall")}
                  className="px-4 py-2.5 rounded-lg border-2 border-dashed border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 font-medium text-sm transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call AI Support
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!description.trim() || step === "analyzing"}
                  className="flex-1 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {step === "analyzing" ? "Analyzing..." : "Analyze with AI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOICE CALL MODE */}
      {step === "voiceCall" && (
        <VoiceCall
          onComplete={(desc) => {
            setDescription(desc);
            setStep("analyzing");
            simulateAIAnalysis(desc).then((result) => {
              setAnalysis(result);
              setTicket((prev) => ({
                ...prev,
                description: desc,
                summary: result.summary,
                category: result.category,
                subcategory: result.subcategory,
                priority: result.priority,
              }));
              setStep("review");
            });
          }}
          onCancel={() => setStep("describe")}
        />
      )}

      {/* CHAT MODE */}
      {step === "chatMode" && (
        <ChatIntake
          onComplete={(desc) => {
            setDescription(desc);
            setStep("describe");
            setTimeout(() => {
              setStep("analyzing");
              simulateAIAnalysis(desc).then((result) => {
                setAnalysis(result);
                setTicket((prev) => ({
                  ...prev,
                  description: desc,
                  summary: result.summary,
                  category: result.category,
                  subcategory: result.subcategory,
                  priority: result.priority,
                }));
                setStep("review");
              });
            }, 100);
          }}
          onCancel={() => setStep("describe")}
        />
      )}

      {/* STEP 2: Review */}
      {step === "review" && analysis && (
        <div className="space-y-5 animate-fade-in">
          {/* Spell Corrections */}
          {analysis.corrections.length > 0 && (
            <AICard icon={<SpellCheck className="w-5 h-5 text-emerald-600" />} title="We fixed a few typos" badge="Auto-Correct" color="green">
              <div className="flex flex-wrap gap-2">
                {analysis.corrections.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-sm">
                    <span className="line-through text-gray-400">{c.original}</span>
                    <span className="text-emerald-700 font-medium">{c.corrected}</span>
                    {i < analysis.corrections.length - 1 && <span className="text-gray-300 mx-1">·</span>}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] mt-2">
                We used the corrected version to analyze your issue. The original text is preserved in your ticket.
              </p>
            </AICard>
          )}

          {/* AI-Generated Description */}
          {analysis.aiGeneratedDescription && (
            <AICard icon={<Sparkles className="w-5 h-5 text-blue-600" />} title="AI-Generated Description" badge="Auto-Parsed" color="blue">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{analysis.aiGeneratedDescription}</p>
              <p className="text-xs text-[var(--muted)] mt-3 italic">
                AI parsed your vague description and generated a structured version. You can edit this in the summary field below.
              </p>
            </AICard>
          )}

          {/* Duplicate Ticket Warning */}
          {analysis.duplicateTicket && !duplicateAction && (
            <AICard icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} title="A similar ticket already exists" badge="Duplicate Detection" color="orange">
              <p className="text-xs text-orange-700 mb-2">
                We found an open ticket at your company that looks related. No personal details of the original reporter are shown.
              </p>
              <div className="bg-white rounded-lg border border-orange-200 p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-[var(--muted)]">{analysis.duplicateTicket.id}</span>
                    <p className="text-sm font-medium mt-0.5">{analysis.duplicateTicket.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Created {analysis.duplicateTicket.created} · {analysis.duplicateTicket.similarity}% match</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-orange-400 flex items-center justify-center shrink-0 ml-3">
                    <span className="text-sm font-bold text-orange-700">{analysis.duplicateTicket.similarity}%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDuplicateAction("link")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors">
                  <Link2 className="w-3.5 h-3.5" /> Yes, link my report to it
                </button>
                <button onClick={() => setDuplicateAction("separate")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-orange-300 text-orange-800 text-xs font-medium hover:bg-orange-50 transition-colors">
                  <X className="w-3.5 h-3.5" /> No, mine is different
                </button>
              </div>
            </AICard>
          )}
          {duplicateAction === "link" && analysis.duplicateTicket && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800">
                Your report has been linked to <strong>{analysis.duplicateTicket.id}</strong>. The support team will see all related reports together to resolve this faster.
              </p>
            </div>
          )}

          {/* Severity Assessment (UC3 = yellow, UC10 = red/critical) */}
          {analysis.severityAssessment && (
            <AICard
              icon={<Gauge className={`w-5 h-5 ${analysis.priority === "Critical" ? "text-red-600" : "text-yellow-600"}`} />}
              title={analysis.priority === "Critical" ? "CRITICAL — Automatic Escalation" : "Severity Assessment"}
              badge={analysis.priority === "Critical" ? "Severity 1" : "Performance Analysis"}
              color={analysis.priority === "Critical" ? "red" : "yellow"}
            >
              <div className="text-sm text-gray-700 leading-relaxed prose prose-sm">
                {analysis.severityAssessment.split("\n").map((line, i) => (
                  <p key={i} className={line.startsWith("•") ? "ml-2 my-0.5" : line.startsWith("**") ? "font-semibold mt-2" : ""}>
                    {line.replace(/\*\*/g, "")}
                  </p>
                ))}
              </div>
            </AICard>
          )}

          {/* UC4: Status Check */}
          {analysis.statusCheck && (
            <AICard icon={<Clock className="w-5 h-5 text-blue-600" />} title="Existing Ticket Status Found" badge="Status Check" color="blue">
              <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--muted)]">{analysis.statusCheck.ticketId}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{analysis.statusCheck.status}</span>
                </div>
                {analysis.statusCheck.assignedTo && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircle className="w-4 h-4 text-[var(--muted)]" />
                    <span>Assigned to: <strong>{analysis.statusCheck.assignedTo}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <Clock className="w-3.5 h-3.5" />
                  {analysis.statusCheck.waitTime}
                </div>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">{analysis.statusCheck.recommendation}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Request Escalation
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-800 text-xs font-medium hover:bg-blue-50 transition-colors">
                    <MessageCircleQuestion className="w-3.5 h-3.5" />
                    Add a Note to Ticket
                  </button>
                </div>
              </div>
            </AICard>
          )}

          {/* UC5 & UC2: Guided Flow */}
          {analysis.guidedFlow && analysis.guidedFlow.length > 0 && (
            <AICard
              icon={<MessageCircleQuestion className="w-5 h-5 text-purple-600" />}
              title={analysis.scenarioTag === "uc5_guided_intake" ? "Let's figure this out step by step" : "Help us narrow down the issue"}
              badge="Guided Intake"
              color="purple"
            >
              <p className="text-xs text-purple-700 mb-4">
                {analysis.scenarioTag === "uc5_guided_intake"
                  ? "Your description was brief — no worries! Let's walk through a few quick questions to get you the right help."
                  : "AI detected multiple possible root causes. Your answers will help us route this to the right team."}
              </p>
              <div className="space-y-4">
                {analysis.guidedFlow.map((q, qi) => (
                  <div key={qi} className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-800">{q.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setGuidedAnswers((prev) => ({ ...prev, [qi]: opt }))}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all text-left ${
                            guidedAnswers[qi] === opt
                              ? "bg-purple-100 border-purple-400 text-purple-900 font-medium"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-300"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {Object.values(guidedAnswers).filter((a) => /not sure|don't know|something else|其他|不确定|不知道/i.test(a)).length >= 2 && (
                <p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Looks like there are a few things you're unsure about. No worries. We'll create the ticket with what we have and flag it for a support engineer to review the routing.
                </p>
              )}
            </AICard>
          )}

          {/* UC6: Known Issues / KCS Articles */}
          {analysis.knownIssues && analysis.knownIssues.length > 0 && (
            <AICard icon={<BookOpen className="w-5 h-5 text-teal-600" />} title="Related Known Issues & Articles" badge="Version Detection" color="teal">
              <p className="text-xs text-teal-700 mb-3">
                AI detected a version change in your environment and found these potentially related items:
              </p>
              <div className="space-y-2">
                {analysis.knownIssues.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200 hover:border-teal-400 transition-colors cursor-pointer">
                    <div className={`mt-0.5 shrink-0 w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold ${
                      item.type === "known_issue" ? "bg-orange-500" : "bg-teal-500"
                    }`}>
                      {item.type === "known_issue" ? <Bug className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--muted)]">{item.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          item.type === "known_issue" ? "bg-orange-100 text-orange-700" : "bg-teal-100 text-teal-700"
                        }`}>
                          {item.type === "known_issue" ? "Known Issue" : "KCS Article"}
                        </span>
                        <span className="text-xs text-[var(--muted)]">{item.version}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] mt-3 italic">
                If one of these resolves your issue, you may not need to submit a new ticket. Otherwise, continue below.
              </p>
            </AICard>
          )}

          {/* Clarifying Questions (UC1, UC3, UC6) */}
          {analysis.clarifyingQuestions.length > 0 && (
            <AICard icon={<MessageCircleQuestion className="w-5 h-5 text-amber-600" />} title="A few more details would help" badge="Clarification" color="amber">
              <div className="space-y-3">
                {analysis.clarifyingQuestions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-amber-900 mb-1">{q}</label>
                    <input
                      type="text"
                      value={clarificationAnswers[i] || ""}
                      onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Type your answer..."
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                ))}
              </div>
            </AICard>
          )}

          {/* Missing Fields Warning */}
          {analysis.missingFields.length > 0 && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Missing recommended fields</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                  {analysis.missingFields.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Main Ticket Review Card */}
          <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {analysis.scenarioTag === "uc4_status_check" ? "Or Submit a New Ticket" : "Review & Submit Ticket"}
              </h2>
              <AIBadge />
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">Your Description</label>
                <div className="px-4 py-3 rounded-lg bg-gray-50 border border-[var(--border)] text-sm">{description}</div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium">Ticket Summary</label>
                  <AIBadge />
                </div>
                <input
                  type="text"
                  value={ticket.summary}
                  onChange={(e) => setTicket((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-purple-50/30 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-purple-100"
                />
                <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                  {analysis.categoryReason}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium">Category</label>
                    <AIBadge />
                  </div>
                  <div className="relative">
                    <select
                      value={ticket.category}
                      onChange={(e) => setTicket((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))}
                      className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-purple-50/30 text-sm appearance-none pr-10 focus:border-[var(--accent)] focus:ring-2 focus:ring-purple-100"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-[var(--muted)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium">Subcategory</label>
                    <AIBadge />
                  </div>
                  <div className="relative">
                    <select
                      value={ticket.subcategory}
                      onChange={(e) => setTicket((prev) => ({ ...prev, subcategory: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-purple-50/30 text-sm appearance-none pr-10 focus:border-[var(--accent)] focus:ring-2 focus:ring-purple-100"
                    >
                      {(CATEGORIES.find((c) => c.name === ticket.category)?.subcategories || ["Other"]).map((sc) => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-[var(--muted)] pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">Priority</label>
                  <AIBadge />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setTicket((prev) => ({ ...prev, priority: p.name }))}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        ticket.priority === p.name
                          ? p.color + " ring-2 ring-offset-1"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted)] mt-2 flex items-start gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--accent)] mt-0.5 shrink-0" />
                  {analysis.priorityReason}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Affected Users</label>
                  <input
                    type="text"
                    value={ticket.affectedUsers}
                    onChange={(e) => setTicket((prev) => ({ ...prev, affectedUsers: e.target.value }))}
                    placeholder="e.g., Just me, or 10+ users"
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Additional Details</label>
                  <input
                    type="text"
                    value={ticket.additionalDetails}
                    onChange={(e) => setTicket((prev) => ({ ...prev, additionalDetails: e.target.value }))}
                    placeholder="Any extra context..."
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleReset} className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-gray-50 transition-colors">
                  Start Over
                </button>
                <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Submitted */}
      {step === "submitted" && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-green-900 mb-1">Ticket Submitted Successfully</h2>
              <p className="text-sm text-[var(--muted)] mb-6">Your ticket has been created and will enter the AI Triage pipeline for routing.</p>
              <div className="bg-gray-50 rounded-lg border border-[var(--border)] p-4 text-left max-w-md mx-auto mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-[var(--muted)]">TKT-{Math.floor(4600 + Math.random() * 400)}</span>
                  <button className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline">
                    <Copy className="w-3 h-3" /> Copy ID
                  </button>
                </div>
                <p className="text-sm font-medium mb-2">{ticket.summary}</p>
                <div className="space-y-1.5 text-xs text-[var(--muted)]">
                  <div className="flex justify-between">
                    <span>Category</span>
                    <span className="text-[var(--foreground)]">{ticket.category} &gt; {ticket.subcategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority</span>
                    <span className={`font-medium ${
                      ticket.priority === "Critical" ? "text-red-600"
                        : ticket.priority === "High" ? "text-orange-600"
                        : ticket.priority === "Medium" ? "text-yellow-600"
                        : "text-green-600"
                    }`}>{ticket.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submitter</span>
                    <span className="text-[var(--foreground)]">{ticket.contactName}</span>
                  </div>
                </div>
                {analysis?.needsManualReview && (
                  <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Flagged for manual review. A support engineer will verify the routing.
                  </div>
                )}
              </div>
              <button onClick={handleReset} className="px-5 py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-sm transition-all">
                Submit Another Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepProgress({ step }: { step: Step }) {
  const steps = [
    { key: "describe", label: "Describe Issue" },
    { key: "review", label: "AI Review" },
    { key: "submitted", label: "Submitted" },
  ];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const isActive = s.key === step || (step === "analyzing" && s.key === "describe") || (step === "chatMode" && s.key === "describe") || (step === "voiceCall" && s.key === "describe");
        const isComplete =
          (s.key === "describe" && (step === "review" || step === "submitted")) ||
          (s.key === "review" && step === "submitted");
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 transition-all ${
              isComplete ? "bg-[var(--success)] text-white"
                : isActive ? "bg-[var(--primary)] text-white"
                : "bg-gray-100 text-[var(--muted)]"
            }`}>
              {isComplete ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${isActive || isComplete ? "text-[var(--foreground)] font-medium" : "text-[var(--muted)]"}`}>
              {s.label}
            </span>
            {i < 2 && <div className={`flex-1 h-px ${isComplete ? "bg-[var(--success)]" : "bg-gray-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function AICard({
  icon,
  title,
  badge,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200",
    yellow: "bg-yellow-50 border-yellow-200",
    amber: "bg-amber-50 border-amber-200",
    purple: "bg-purple-50 border-purple-200",
    teal: "bg-teal-50 border-teal-200",
    orange: "bg-orange-50 border-orange-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-300",
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] || colorMap.blue}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <h3 className="font-semibold text-sm flex-1">{title}</h3>
        <AIBadge label={badge} />
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
}
