"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Sparkles, X, CheckCircle2 } from "lucide-react";
import AIBadge from "./AIBadge";

interface Message {
  role: "ai" | "user";
  text: string;
  options?: string[];
}

const CONVERSATION_FLOW: {
  question: string;
  options: string[];
  field: string;
}[] = [
  {
    question: "Hey! I'll help you figure this out. First off — what's going on in general?",
    options: [
      "Something isn't working",
      "I'm getting an error",
      "Things are slow or laggy",
      "I can't log in or access something",
      "I need something set up or changed",
      "Something else entirely",
    ],
    field: "issueType",
  },
  {
    question: "Got it. Which app or system is this about?",
    options: [
      "Email / Outlook",
      "CRM / Salesforce",
      "VPN / Remote access",
      "My computer in general",
      "Printer or other hardware",
      "A website or cloud app",
      "I'm not sure — that's part of the problem",
    ],
    field: "component",
  },
  {
    question: "When did this start?",
    options: [
      "Just now — in the last hour",
      "Earlier today",
      "Yesterday",
      "It's been going on for a few days",
      "I'm not sure when it started",
    ],
    field: "timing",
  },
  {
    question: "Is this just affecting you, or are others having the same issue?",
    options: [
      "Just me as far as I know",
      "A few people on my team",
      "The whole office / department",
      "I'm not sure",
    ],
    field: "scope",
  },
  {
    question: "How much is this impacting your work right now?",
    options: [
      "I'm completely stuck — can't do my job",
      "It's slowing me down a lot",
      "It's annoying but I can work around it",
      "It's minor — just wanted to report it",
    ],
    field: "impact",
  },
  {
    question: "Anything else you want to add? Feel free to type any extra details, or just say 'no' to skip.",
    options: [
      "No, that covers it",
    ],
    field: "extra",
  },
];

function buildDescription(answers: Record<string, string>): string {
  const parts: string[] = [];

  if (answers.issueType) parts.push(answers.issueType);
  if (answers.component && !answers.component.includes("not sure")) {
    parts.push(`It's with ${answers.component}.`);
  }
  if (answers.timing) parts.push(`Started: ${answers.timing.toLowerCase()}.`);
  if (answers.scope) parts.push(`Scope: ${answers.scope.toLowerCase()}.`);
  if (answers.impact) parts.push(`Impact: ${answers.impact.toLowerCase()}.`);
  if (answers.extra && !answers.extra.toLowerCase().includes("no,") && !answers.extra.toLowerCase().includes("that covers")) {
    parts.push(answers.extra);
  }

  return parts.join(" ");
}

export default function ChatIntake({
  onComplete,
  onCancel,
}: {
  onComplete: (description: string) => void;
  onCancel: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: CONVERSATION_FLOW[0].question,
      options: CONVERSATION_FLOW[0].options,
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setSpeechSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const advanceConversation = useCallback((userText: string) => {
    const field = CONVERSATION_FLOW[currentStep].field;
    const newAnswers = { ...answers, [field]: userText };
    setAnswers(newAnswers);

    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    const nextStep = currentStep + 1;
    if (nextStep < CONVERSATION_FLOW.length) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: CONVERSATION_FLOW[nextStep].question,
            options: CONVERSATION_FLOW[nextStep].options,
          },
        ]);
        setCurrentStep(nextStep);
      }, 600);
    } else {
      setTimeout(() => {
        const desc = buildDescription(newAnswers);
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: `Great, I've got enough to work with. Here's what I'll put in your ticket:\n\n"${desc}"\n\nI'll run this through AI analysis now to suggest the right category and priority.`,
          },
        ]);
        setTimeout(() => onComplete(desc), 2000);
      }, 600);
    }
  }, [currentStep, answers, onComplete]);

  const handleFreeTextSubmit = () => {
    if (!freeText.trim()) return;
    advanceConversation(freeText.trim());
    setFreeText("");
  };

  const toggleSpeech = () => {
    setSpeechError(null);

    if (isListening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechError("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    // Set listening state FIRST so UI updates immediately
    setIsListening(true);

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let gotResult = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      gotResult = true;
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setFreeText(transcript);
    };

    recognition.onaudiostart = () => {
      console.log("[Speech] Audio capture started");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("[Speech] Error:", event.error);
      const msg =
        event.error === "not-allowed" ? "Microphone access was blocked. Go to browser Settings > Privacy > Microphone and allow this site."
        : event.error === "no-speech" ? "Didn't catch anything. Click the mic and try speaking again."
        : event.error === "network" ? "Speech recognition requires internet (it uses Google's servers in Chrome)."
        : event.error === "aborted" ? null
        : `Speech error: ${event.error}`;
      if (msg) setSpeechError(msg);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      console.log("[Speech] Session ended. Got result:", gotResult);
      setIsListening(false);
      recognitionRef.current = null;
      if (!gotResult) {
        setSpeechError("Recording stopped — no speech was detected. Click the mic and speak within a few seconds.");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      console.log("[Speech] Recognition started");
    } catch (e) {
      console.error("[Speech] Failed to start:", e);
      setSpeechError("Could not start speech recognition. Try reloading the page.");
      setIsListening(false);
    }
  };

  const isLastStep = currentStep >= CONVERSATION_FLOW.length - 1 && messages[messages.length - 1]?.role === "ai" && !messages[messages.length - 1]?.options;

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden animate-fade-in">
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-violet-50 to-blue-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-semibold">AI-Guided Intake</span>
          <AIBadge label="Conversational" />
        </div>
        <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-[420px] overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-fade-in ${
                msg.role === "ai"
                  ? "bg-white border border-[var(--border)] text-[var(--foreground)]"
                  : "bg-[var(--primary)] text-white"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              {msg.options && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {msg.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => advanceConversation(opt)}
                      className="px-3 py-1.5 text-xs rounded-full border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-all text-left"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLastStep && (
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-2 text-xs text-[var(--success)]">
              <CheckCircle2 className="w-4 h-4" />
              Generating your ticket...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isLastStep && (
        <div className="border-t border-[var(--border)]">
          {speechError && (
            <div className="px-4 pt-2">
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{speechError}</p>
            </div>
          )}
          {isListening && (
            <div className="px-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                Listening... Speak now. Click the mic again to stop.
              </div>
            </div>
          )}
          <div className="px-4 py-3 flex items-center gap-2">
            {speechSupported && (
              <button
                onClick={toggleSpeech}
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-200"
                    : "bg-gray-100 text-[var(--muted)] hover:bg-violet-100 hover:text-violet-600 border border-[var(--border)]"
                }`}
                title={isListening ? "Stop listening" : "Speak your answer"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <input
              type="text"
              value={freeText}
              onChange={(e) => { setFreeText(e.target.value); setSpeechError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleFreeTextSubmit()}
              placeholder={isListening ? "Listening — your words will appear here..." : "Type your answer or pick an option above..."}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 ${
                isListening ? "border-red-300 bg-red-50/30" : "border-[var(--border)]"
              }`}
            />
            <button
              onClick={() => { if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } handleFreeTextSubmit(); }}
              disabled={!freeText.trim()}
              className="shrink-0 w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
