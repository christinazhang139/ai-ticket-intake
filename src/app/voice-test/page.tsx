"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";

/**
 * Minimal Web Speech API check on the same origin as the app.
 * Use this to see if the browser/network can reach Google speech (Chrome)
 * independently of VoiceCall / TTS timing.
 */
export default function VoiceTestPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const log = useCallback((msg: string) => {
    setLines((prev) => [...prev.slice(-50), `${new Date().toISOString().slice(11, 23)} ${msg}`]);
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    log("stopped");
  }, [log]);

  const start = useCallback(() => {
    stop();
    setTranscript("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Src = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Src) {
      log("ERROR: SpeechRecognition not available (use Chrome or Edge)");
      return;
    }
    const r = new Src();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onaudiostart = () => log("onaudiostart");
    r.onspeechstart = () => log("onspeechstart");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setTranscript(t.trim());
      log(`onresult len=${e.results.length} idx=${e.resultIndex} text=${JSON.stringify(t.slice(0, 80))}`);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (e: any) => log(`onerror: ${e.error}`);
    r.onend = () => log("onend");
    recognitionRef.current = r;
    try {
      r.start();
      log("recognition.start() ok — speak in English");
    } catch (err) {
      log(`recognition.start() threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [log, stop]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <p>
          <Link href="/" className="text-blue-600 underline">
            Back to intake
          </Link>
        </p>
        <h1 className="text-xl font-semibold">Microphone / Web Speech check</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          This page only uses <code className="bg-gray-200 px-1 rounded">webkitSpeechRecognition</code> (no
          TTS, no ringing). If you never see <strong>onresult</strong> here, the issue is likely browser, network
          (VPN / Google), or microphone permission — not the voice-call UI timing.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={start}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            Start recognition
          </button>
          <button
            type="button"
            onClick={stop}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
          >
            Stop
          </button>
        </div>
        {transcript && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
            <span className="font-medium text-green-900">Transcript: </span>
            {transcript || "(empty)"}
          </div>
        )}
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Event log</h2>
          <pre className="text-xs font-mono bg-gray-900 text-green-200 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[50vh]">
            {lines.length === 0 ? "Click Start recognition, then allow the microphone if prompted." : lines.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  );
}
