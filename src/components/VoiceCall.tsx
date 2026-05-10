"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Phone, PhoneOff, Mic, Volume2, Hand, Pencil, Check } from "lucide-react";
import AIBadge from "./AIBadge";

const ACCENT_OPTIONS = [
  { code: "en-US", label: "American", flag: "🇺🇸" },
  { code: "en-GB", label: "British", flag: "🇬🇧" },
  { code: "en-AU", label: "Australian", flag: "🇦🇺" },
  { code: "en-IN", label: "Indian", flag: "🇮🇳" },
  { code: "en-IE", label: "Irish", flag: "🇮🇪" },
];

let currentAccent = "en-US";

/** Set sessionStorage mspbot_voice_debug=1 then reload to show speech API hints on the call UI. */
const VOICE_DEBUG_KEY = "mspbot_voice_debug";

async function speak(text: string): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, accent: currentAccent }),
    });
    if (!res.ok) throw new Error("TTS API failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    try {
      await audio.play();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("TTS play blocked");
    }
    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
    });
  } catch {
    // Fallback to browser TTS
    await new Promise<void>((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.lang = currentAccent;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}


interface CollectedInfo {
  what: string | null;
  component: string | null;
  when: string | null;
  scope: string | null;
  impact: string | null;
  extra: string[];
}

function analyzeTranscript(text: string, existing: CollectedInfo): { updated: CollectedInfo; missing: string[] } {
  const t = text.toLowerCase();
  const updated = { ...existing, extra: [...existing.extra] };

  if (!existing.what && text.length > 10) {
    updated.what = text;
  }

  if (!existing.component) {
    if (/email|outlook|inbox|mail/i.test(t)) updated.component = "Email / Outlook";
    else if (/crm|salesforce/i.test(t)) updated.component = "CRM / Salesforce";
    else if (/vpn|remote/i.test(t)) updated.component = "VPN / Remote Access";
    else if (/print/i.test(t)) updated.component = "Printer";
    else if (/internet|wifi|wi-fi|network|connect/i.test(t)) updated.component = "Network / Internet";
    else if (/computer|laptop|desktop|machine/i.test(t)) updated.component = "Computer / Workstation";
    else if (/phone|teams|zoom/i.test(t)) updated.component = "Communication tools";
  }

  if (!existing.when) {
    if (/just now|just happened|right now|minute ago/i.test(t)) updated.when = "Just now";
    else if (/today|this morning|this afternoon/i.test(t)) updated.when = "Today";
    else if (/yesterday/i.test(t)) updated.when = "Yesterday";
    else if (/few days|couple days|this week|been a while/i.test(t)) updated.when = "A few days";
  }

  if (!existing.scope) {
    if (/everyone|whole office|all of us|nobody can|all users/i.test(t)) updated.scope = "Everyone";
    else if (/my team|few people|couple of us|coworkers/i.test(t)) updated.scope = "Several people";
    else if (/just me|only me|only I /i.test(t)) updated.scope = "Just me";
  }

  if (!existing.impact) {
    if (/can't (do|work|get anything done)|completely stuck|dead in the water|blocking/i.test(t)) updated.impact = "Completely blocked";
    else if (/slow(ing|ed)? me down|hard to work|taking forever/i.test(t)) updated.impact = "Slowed down";
    else if (/minor|not a big deal|annoying|can work around/i.test(t)) updated.impact = "Minor";
  }

  if (existing.what && text !== existing.what) {
    updated.extra.push(text);
  }

  const missing: string[] = [];
  if (!updated.component) missing.push("which system or app is affected");
  if (!updated.when) missing.push("when this started");
  if (!updated.scope) missing.push("whether it's just you or affecting others too");
  if (!updated.impact) missing.push("how much this is impacting your work");

  return { updated, missing };
}

function buildFollowUp(missing: string[]): string {
  if (missing.length === 0) return "";
  if (missing.length === 1) return `One more thing — could you tell me ${missing[0]}?`;
  if (missing.length === 2) return `A couple more things would help — can you tell me ${missing[0]}, and ${missing[1]}?`;
  return `Thanks for that. I still need to know: ${missing.slice(0, 2).join(", and ")}. Take your time.`;
}

function buildDescription(info: CollectedInfo): string {
  const parts: string[] = [];
  if (info.what) parts.push(info.what);
  if (info.component) parts.push(`System affected: ${info.component}.`);
  if (info.when) parts.push(`Started: ${info.when}.`);
  if (info.scope) parts.push(`Scope: ${info.scope}.`);
  if (info.impact) parts.push(`Impact: ${info.impact}.`);
  if (info.extra.length > 0) parts.push(info.extra.join(". "));
  return parts.join(" ");
}

type Phase = "idle" | "ringing" | "greeting" | "user_talking" | "editing" | "ai_thinking" | "ai_followup" | "wrapping_up" | "done" | "error";

export default function VoiceCall({
  onComplete,
  onCancel,
}: {
  onComplete: (description: string) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [callLog, setCallLog] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [collected, setCollected] = useState<CollectedInfo>({ what: null, component: null, when: null, scope: null, impact: null, extra: [] });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [editText, setEditText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("en-US");
  const [heardAudio, setHeardAudio] = useState(false);
  const [speechSoftHint, setSpeechSoftHint] = useState<string | null>(null);
  const [voiceDebugOn, setVoiceDebugOn] = useState(false);
  const [debugSpeechLine, setDebugSpeechLine] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  /** Must match latest phase for SpeechRecognition.onend (avoid stale closure after setState + immediate start). */
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  /** Finalized speech across onresult events (Chrome continuous mode needs this + resultIndex). */
  const speechFinalRef = useRef("");
  const noSpeechBurstRef = useRef(0);
  const liveTranscriptRef = useRef("");
  const voiceDebugRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const on = sessionStorage.getItem(VOICE_DEBUG_KEY) === "1";
      setVoiceDebugOn(on);
      voiceDebugRef.current = on;
    } catch {
      setVoiceDebugOn(false);
      voiceDebugRef.current = false;
    }
  }, []);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    if (phase !== "user_talking") {
      noSpeechBurstRef.current = 0;
      return;
    }
    const id = window.setTimeout(() => {
      if (phaseRef.current !== "user_talking") return;
      if (liveTranscriptRef.current.trim().length > 0) return;
      setSpeechSoftHint(
        (prev) =>
          prev ??
          "No transcript after ~20 seconds — check microphone permission, network/VPN (Chrome sends audio to Google), or try headphones."
      );
    }, 20000);
    return () => window.clearTimeout(id);
  }, [phase]);

  /** Mic is no longer held across the call (probe stops tracks); kept for future hooks / symmetry. */
  const releaseMicStream = useCallback(() => {}, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callLog, liveTranscript]);

  useEffect(() => {
    if (phase !== "idle" && phase !== "done" && phase !== "error") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const startListening = useCallback((opts?: { preserveTranscript?: boolean; seedText?: string }) => {
    releaseMicStream();
    noSpeechBurstRef.current = 0;
    setSpeechSoftHint(null);

    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;

    const seed = (opts?.seedText ?? "").trim();
    if (opts?.preserveTranscript && seed) {
      speechFinalRef.current = seed.endsWith(" ") ? seed : `${seed} `;
      setLiveTranscript(seed);
    } else {
      speechFinalRef.current = "";
      setLiveTranscript("");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SRC = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SRC) {
      setErrorMsg("Speech recognition not supported. Try Chrome.");
      setPhase("error");
      return;
    }

    const recognition = new SRC();
    // en-US is most reliable for Web Speech API across devices; TTS accent stays separate.
    recognition.lang = "en-US";
    recognition.interimResults = true;
    // false: end after each pause so onresult/onend fire more predictably on some Chrome/macOS setups.
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onaudiostart = () => setHeardAudio(true);
    recognition.onspeechstart = () => setHeardAudio(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) speechFinalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      const piece = (speechFinalRef.current + interim).trim();
      if (piece.length > 0) {
        noSpeechBurstRef.current = 0;
        setSpeechSoftHint(null);
      }
      setLiveTranscript(piece);
      if (voiceDebugRef.current) {
        setDebugSpeechLine(
          `onresult len=${event.results.length} idx=${event.resultIndex} interimLen=${interim.length}`
        );
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        noSpeechBurstRef.current += 1;
        if (voiceDebugRef.current) {
          setDebugSpeechLine(`no-speech #${noSpeechBurstRef.current}`);
        }
        if (noSpeechBurstRef.current >= 2 && phaseRef.current === "user_talking") {
          setSpeechSoftHint(
            "No speech picked up twice in a row — speak a bit louder, move closer to the mic, or try wired headphones (speaker echo confuses recognition)."
          );
          noSpeechBurstRef.current = 0;
        }
        return;
      }
      const recoverable = ["not-allowed", "service-not-allowed", "network", "audio-capture"].includes(
        event.error
      );
      if (recoverable) console.warn("[Voice] Speech recognition:", event.error);
      else console.error("[Voice] Error:", event.error);
      const msg =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access was blocked. Allow microphone for this site in browser settings, then try again."
          : event.error === "network"
            ? "Speech recognition needs an internet connection (Chrome sends audio to Google for transcription)."
            : event.error === "audio-capture"
              ? "No microphone was found or it could not be opened. Check System Settings → Privacy → Microphone."
              : `Speech recognition error: ${event.error}`;
      if (voiceDebugRef.current) {
        setDebugSpeechLine(`error: ${event.error}`);
      }
      setErrorMsg(msg);
      setPhase("error");
      releaseMicStream();
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      if (phaseRef.current === "user_talking" && !cancelledRef.current) {
        try {
          recognition.start();
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn("[Voice] recognition.start() after onend failed:", detail);
          if (voiceDebugRef.current) {
            setDebugSpeechLine(`onend restart failed: ${detail}`);
          }
          setSpeechSoftHint(
            "Listening loop stopped unexpectedly. Hang up and start again, or open /voice-test to verify the browser can access speech recognition."
          );
        }
      }
    };

    recognitionRef.current = recognition;
    const rec = recognition;
    try {
      rec.start();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn("[Voice] recognition.start() failed:", detail);
      if (voiceDebugRef.current) setDebugSpeechLine(`start failed: ${detail}`);
      setErrorMsg("Could not start speech recognition. Try again or use another browser.");
      setPhase("error");
      releaseMicStream();
      recognitionRef.current = null;
    }
  }, [releaseMicStream]);

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
  };

  const startCall = useCallback(async () => {
    cancelledRef.current = false;
    setHeardAudio(false);
    setSpeechSoftHint(null);
    setCallDuration(0);
    setCallLog([]);
    setCollected({ what: null, component: null, when: null, scope: null, impact: null, extra: [] });
    setRound(0);
    setErrorMsg(null);
    releaseMicStream();
    setPhase("ringing");

    window.speechSynthesis?.getVoices();
    await new Promise((r) => setTimeout(r, 900));
    if (cancelledRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsr = window as any;
    if (!(wsr.SpeechRecognition || wsr.webkitSpeechRecognition)) {
      setErrorMsg("Speech recognition is not available in this browser. Use the latest Chrome or Edge.");
      setPhase("error");
      return;
    }

    setPhase("greeting");
    const greeting = "Hey there. I'm your AI support assistant. Take your time and tell me what's going on — I'm listening. When you're done, just hit the 'I'm done' button and I'll take it from there.";
    setCallLog([{ role: "ai", text: greeting }]);
    await speak(greeting);
    if (cancelledRef.current) return;

    await new Promise((r) => setTimeout(r, 500));
    if (cancelledRef.current) return;

    setHeardAudio(false);
    setPhase("user_talking");
    phaseRef.current = "user_talking";
    startListening();
  }, [startListening, releaseMicStream]);

  const handleUserDone = useCallback(() => {
    stopListening();
    const userText = liveTranscript.trim();

    if (!userText) {
      (async () => {
        const nudge = "I didn't catch anything. No rush — just tell me what's going on whenever you're ready.";
        setCallLog((prev) => [...prev, { role: "ai", text: nudge }]);
        setPhase("ai_followup");
        await speak(nudge);
        if (cancelledRef.current) return;
        await new Promise((r) => setTimeout(r, 500));
        if (cancelledRef.current) return;
        setHeardAudio(false);
        setPhase("user_talking");
        phaseRef.current = "user_talking";
        setLiveTranscript("");
        startListening();
      })();
      return;
    }

    setEditText(userText);
    setPhase("editing");
  }, [liveTranscript, startListening]);

  const handleConfirmEdit = useCallback(async () => {
    const finalText = editText.trim();
    if (!finalText) return;

    setCallLog((prev) => [...prev, { role: "user", text: finalText }]);
    setLiveTranscript("");
    setEditText("");
    setPhase("ai_thinking");

    await new Promise((r) => setTimeout(r, 800));
    if (cancelledRef.current) return;

    const { updated, missing } = analyzeTranscript(finalText, collected);
    setCollected(updated);
    const newRound = round + 1;
    setRound(newRound);

    if (missing.length === 0 || newRound >= 3) {
      setPhase("wrapping_up");
      const wrapUp = missing.length === 0
        ? "Great, I've got all the details I need. Let me put your ticket together now."
        : "I think I have enough to go on. Let me file this for you.";
      setCallLog((prev) => [...prev, { role: "ai", text: wrapUp }]);
      await speak(wrapUp);
      if (cancelledRef.current) return;
      setPhase("done");
      const desc = buildDescription(updated);
      setTimeout(() => onComplete(desc), 1500);
      return;
    }

    const ack = newRound === 1
      ? "Okay, I hear you."
      : "Got it, thanks for that.";
    const followUp = buildFollowUp(missing);
    const fullResponse = `${ack} ${followUp}`;

    setPhase("ai_followup");
    setCallLog((prev) => [...prev, { role: "ai", text: fullResponse }]);
    await speak(fullResponse);
    if (cancelledRef.current) return;

    await new Promise((r) => setTimeout(r, 500));
    if (cancelledRef.current) return;

    setHeardAudio(false);
    setPhase("user_talking");
    phaseRef.current = "user_talking";
    startListening();
  }, [editText, collected, round, onComplete, startListening]);

  const resetToIdleForRetry = useCallback(() => {
    cancelledRef.current = true;
    stopListening();
    releaseMicStream();
    window.speechSynthesis?.cancel();
    setLiveTranscript("");
    setErrorMsg(null);
    setSpeechSoftHint(null);
    setDebugSpeechLine("");
    setHeardAudio(false);
    setPhase("idle");
    cancelledRef.current = false;
  }, [releaseMicStream]);

  const endCall = () => {
    cancelledRef.current = true;
    stopListening();
    releaseMicStream();
    window.speechSynthesis?.cancel();
    setPhase("idle");
    onCancel();
  };

  if (phase === "idle") {
    return (
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden animate-fade-in">
        <div className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Talk to AI Support</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            No typing needed. After the assistant speaks, the browser will ask for the microphone for speech-to-text (Chrome / Edge + English + internet). Use headphones if the greeting plays through speakers.
          </p>

          <div className="max-w-sm mx-auto mb-6">
            <label className="block text-xs font-medium text-[var(--muted)] mb-2">
              English accent for the AI voice (speech-to-text always uses en-US for reliability)
            </label>
            <div className="flex flex-wrap justify-center gap-1.5">
              {ACCENT_OPTIONS.map((r) => (
                <button
                  key={r.code}
                  onClick={() => { setSelectedRegion(r.code); currentAccent = r.code; }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedRegion === r.code
                      ? "bg-green-100 border-green-400 text-green-800 border"
                      : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{r.flag}</span> {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-gray-50">Go back</button>
            <button onClick={startCall} className="px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-green-200">
              <Phone className="w-4 h-4" /> Start Voice Call
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-4">
            <Link href="/voice-test" className="text-blue-600 underline font-medium">
              Microphone / speech check
            </Link>
            {" — "}minimal Web Speech test on this site (isolates browser vs voice-call timing).
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-[10px] text-[var(--muted)] mt-3 max-w-md mx-auto leading-relaxed">
              Dev: run{" "}
              <code className="font-mono bg-gray-100 px-1 rounded">
                sessionStorage.setItem(&apos;{VOICE_DEBUG_KEY}&apos;,&apos;1&apos;)
              </code>{" "}
              in the console, reload, then start a call to see speech diagnostics at the bottom.
            </p>
          )}
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; text: string; label: string | null }> = {
    ringing: { bg: "bg-yellow-500/10 text-yellow-400", text: "", label: "Connecting..." },
    greeting: { bg: "bg-blue-500/10 text-blue-400", text: "", label: "AI is speaking..." },
    user_talking: { bg: "bg-green-500/10 text-green-400", text: "", label: "You're on — take your time" },
    editing: { bg: "bg-amber-500/10 text-amber-400", text: "", label: "Review what you said — fix anything that looks wrong" },
    ai_thinking: { bg: "bg-purple-500/10 text-purple-400", text: "", label: "AI is thinking..." },
    ai_followup: { bg: "bg-blue-500/10 text-blue-400", text: "", label: "AI is speaking..." },
    wrapping_up: { bg: "bg-blue-500/10 text-blue-400", text: "", label: "Wrapping up..." },
    done: { bg: "bg-green-500/10 text-green-400", text: "", label: "Ticket created! Hanging up..." },
    error: { bg: "bg-red-500/10 text-red-400", text: "", label: errorMsg },
  };
  const status = statusConfig[phase] || statusConfig.error;

  return (
    <div className="bg-gray-900 rounded-xl shadow-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${phase === "user_talking" ? "bg-green-500" : "bg-blue-500"}`}>
            {phase === "user_talking" ? <Mic className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </div>
          <div>
            <p className="text-white font-medium text-sm">AI Support Assistant</p>
            <p className="text-gray-400 text-xs">{formatTime(callDuration)}</p>
          </div>
        </div>
        <AIBadge label="Voice Call" />
      </div>

      {/* Status bar */}
      <div className="px-6 pb-2">
        <div className={`text-center py-3 rounded-lg text-sm font-medium ${status.bg}`}>
          {(phase === "ringing" || phase === "user_talking") && (
            <span className="flex items-center justify-center gap-2 flex-wrap px-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${phase === "ringing" ? "bg-yellow-400" : "bg-green-400"}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${phase === "ringing" ? "bg-yellow-400" : "bg-green-400"}`} />
              </span>
              {phase === "user_talking"
                ? heardAudio
                  ? "Listening… microphone is active"
                  : "You're on — speak clearly in English"
                : status.label}
            </span>
          )}
          {phase !== "ringing" && phase !== "user_talking" && status.label}
        </div>
      </div>

      {phase === "user_talking" && speechSoftHint && (
        <div className="px-6 pb-2">
          <p className="text-center text-xs text-amber-300/90 leading-relaxed bg-amber-950/40 border border-amber-700/50 rounded-lg py-2 px-3">
            {speechSoftHint}
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="px-6 pb-4 space-y-3">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Check site microphone permission, use Chrome, and stay online. Speech recognition uses Google&apos;s service in Chrome.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={resetToIdleForRetry}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={endCall}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-800"
            >
              Hang up
            </button>
          </div>
        </div>
      )}

      {/* Conversation log */}
      <div className="px-6 py-4 h-[280px] overflow-y-auto space-y-3">
        {callLog.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "ai" ? "bg-gray-800 text-gray-200" : "bg-blue-600 text-white"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {phase === "user_talking" && !liveTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-xs text-gray-500 border border-gray-700 border-dashed">
              Waiting for speech… If nothing appears, check the mic icon in the address bar and try headphones to avoid speaker echo.
            </div>
          </div>
        )}
        {phase === "user_talking" && liveTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-green-600/30 text-green-200 border border-green-500/30 italic">
              {liveTranscript}
              <span className="inline-block w-1.5 h-4 bg-green-400 ml-1 animate-pulse" />
            </div>
          </div>
        )}
        {phase === "editing" && (
          <div className="flex justify-end animate-fade-in">
            <div className="w-full max-w-[90%] rounded-2xl bg-gray-800 border border-amber-500/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Pencil className="w-3 h-3" />
                Edit if speech got anything wrong, then confirm:
              </div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
              />
            </div>
          </div>
        )}
        {phase === "ai_thinking" && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 bg-gray-800 text-gray-400 text-sm flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 typing-dot" />
              </span>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Controls */}
      <div className="px-6 py-5 border-t border-gray-800">
        <div className="flex items-center justify-center gap-4">
          {phase === "user_talking" && (
            <button
              onClick={handleUserDone}
              className="px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-green-900/30"
            >
              <Hand className="w-4 h-4" />
              I&apos;m done talking
            </button>
          )}
          {phase === "editing" && (
            <>
              <button
                onClick={() => {
                  const seed = editText;
                  setPhase("user_talking");
                  phaseRef.current = "user_talking";
                  setEditText("");
                  startListening({ preserveTranscript: true, seedText: seed });
                }}
                className="px-4 py-2.5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium text-sm transition-all flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Keep talking
              </button>
              <button
                onClick={handleConfirmEdit}
                className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-900/30"
              >
                <Check className="w-4 h-4" />
                Looks good, send it
              </button>
            </>
          )}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-lg shadow-red-900/30"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
        {phase === "user_talking" && (
          <p className="text-center text-xs text-gray-500 mt-3">
            Take your time. When you&apos;re finished, hit the green button above.
          </p>
        )}
        {phase === "editing" && (
          <p className="text-center text-xs text-gray-500 mt-3">
            Fix any words the speech recognition got wrong, or keep talking to add more.
          </p>
        )}
        {voiceDebugOn && (
          <p className="text-center text-[10px] text-gray-600 mt-2 font-mono break-all px-2">
            voice debug: {debugSpeechLine || "—"}
          </p>
        )}
      </div>
    </div>
  );
}
