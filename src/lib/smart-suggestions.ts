/**
 * Rule-based smart chips for the intake description field.
 * Strong rules take precedence; fallback only when no strong rule matches.
 */

export interface ResolvedSmartSuggestion {
  id: string;
  label: string;
  chips: string[];
}

interface InternalRule {
  id: string;
  label: string;
  chips: string[];
  /** Higher = shown first; strong rules should be >> fallback */
  priority: number;
  /** When true, only used if zero non-fallback rules matched */
  isFallback?: boolean;
  /** Minimum description length for this rule (default 8) */
  minLength?: number;
  trigger: (text: string) => boolean;
}

const RULES: InternalRule[] = [
  {
    id: "area-vague",
    priority: 44,
    minLength: 8,
    label: "Which area might be affected?",
    chips: [
      "Email / Outlook",
      "CRM / Salesforce",
      "VPN / Remote Access",
      "File Server / Shared Drives",
      "Active Directory / SSO",
      "Printer",
      "Microsoft Teams",
      "Network / Wi-Fi",
      "Cloud Storage / OneDrive",
    ],
    trigger: (t) =>
      /don'?t know (which|what) (component|part|module|system|thing)/i.test(t) ||
      /not sure (which|what) (component|part|system)/i.test(t) ||
      /don'?t know what('s|\s+is)?\s*(wrong|going on|happening|the problem)/i.test(t) ||
      /don'?t know what goes wrong/i.test(t) ||
      /no idea what('s|\s+is)?\s*(wrong|going on)/i.test(t) ||
      /not sure what('s)? wrong/i.test(t),
  },
  {
    id: "error-vague",
    priority: 46,
    minLength: 8,
    label: "Can you describe the error?",
    chips: [
      "I saw an error code / message",
      "The app froze and closed",
      "I got a blue screen",
      "A popup appeared but I couldn't read it",
      "The page went blank / white",
    ],
    trigger: (t) =>
      !/\bno problems?\b/i.test(t) &&
      ((/error|crash|broke|blew up|issue|problem|weird|acting up|not working|hasn'?t been working|glitch|bug/i.test(t) &&
        !/error (code|message|number)/i.test(t)) ||
        /\b(something is wrong|something'?s wrong)\b/i.test(t)),
  },
  {
    id: "login",
    priority: 54,
    minLength: 8,
    label: "What happens when you try?",
    chips: [
      "'Invalid password' message",
      "Spinning wheel, then nothing",
      "'Access Denied' or 'Forbidden'",
      "Page won't load at all",
      "MFA / 2FA code not working",
      "Account locked out",
    ],
    trigger: (t) => /(can'?t|cannot|won'?t|unable to) (log ?in|sign ?in|access|get in)/i.test(t),
  },
  {
    id: "slow",
    priority: 48,
    minLength: 6,
    label: "What's slow exactly?",
    chips: [
      "Everything — the whole computer",
      "Just one app (e.g., Outlook, CRM)",
      "Internet / websites only",
      "File transfers / saving documents",
      "It comes and goes — intermittent",
    ],
    trigger: (t) => /slow|lag|hang|freez|crawl|taking (forever|ages|long)/i.test(t),
  },
  {
    id: "update",
    priority: 50,
    minLength: 8,
    label: "What changed after the update?",
    chips: [
      "Some features disappeared",
      "Dashboards / reports won't load",
      "App crashes on startup",
      "Things are much slower than before",
      "Formatting / layout looks wrong",
      "Can't log in since the update",
    ],
    trigger: (t) => /(updat|upgrad|new version|patch|after .* update)/i.test(t),
  },
  {
    id: "deploy-fail",
    priority: 52,
    minLength: 8,
    label: "Where in the process did it fail?",
    chips: [
      "During database migration",
      "While installing dependencies",
      "At the build / compile step",
      "During startup after install",
      "Not sure — there's too much log output",
    ],
    trigger: (t) => /(deploy|install|setup|migration)/i.test(t) && /(fail|error|stuck|broke|bomb)/i.test(t),
  },
  {
    id: "permission",
    priority: 52,
    minLength: 8,
    label: "What kind of access issue?",
    chips: [
      "I can't open the app at all",
      "I can open it but some pages are blocked",
      "Buttons / features are greyed out",
      "It says 'Forbidden' or '403'",
      "I think my role changed recently",
    ],
    trigger: (t) => /(permission|access denied|forbidden|role|rbac)/i.test(t),
  },
  {
    id: "printer",
    priority: 54,
    minLength: 6,
    label: "What's the printer doing?",
    chips: [
      "Nothing — no response at all",
      "Paper jam",
      "Printing blank pages",
      "Prints but quality is bad",
      "Shows 'offline' but it's turned on",
      "Can't find the printer on the network",
    ],
    trigger: (t) => /(print|printer|scanning|scanner)/i.test(t),
  },
  {
    id: "email",
    priority: 58,
    minLength: 8,
    label: "What's going on with email?",
    chips: [
      "Can't send emails",
      "Can't receive — inbox not updating",
      "Outlook keeps crashing",
      "Attachments won't open / download",
      "Getting spam / phishing emails",
      "Calendar invites not syncing",
    ],
    trigger: (t) => /(email|outlook|inbox|mail)/i.test(t) && !/login|log in|access/i.test(t),
  },
  {
    id: "outage-scope",
    priority: 56,
    minLength: 8,
    label: "How widespread is this?",
    chips: [
      "Just me",
      "My whole team / department",
      "The entire office",
      "Multiple offices / locations",
      "Clients are affected too",
    ],
    trigger: (t) =>
      /(down|outage|offline|nothing works|everything.*(down|broken|dead)|everything is (down|broken)|everything'?s (down|broken))/i.test(
        t
      ) ||
      /\b(everyone|whole team|entire team)\b.*\b(issue|issues|problem|slow|down|broken|offline)\b/i.test(t) ||
      /\b(issue|issues|problem|slow|down|broken|offline)\b.*\b(everyone|whole team|entire team)\b/i.test(t),
  },
  {
    id: "fallback-vague",
    priority: 2,
    minLength: 12,
    isFallback: true,
    label: "What kind of issue is closest?",
    chips: [
      "Something broke / it crashes",
      "It's slow or freezes",
      "I can't sign in",
      "Email or calendar problem",
      "Network or VPN problem",
      "Printer or hardware",
      "Not sure — I need help describing it",
    ],
    trigger: (t) =>
      /\b(not sure|no idea|can'?t explain|hard to describe|don'?t know how to|need help|something happened|unsure what)\b/i.test(
        t
      ),
  },
];

const MAX_SUGGESTIONS = 2;

export function getActiveSmartSuggestions(text: string): ResolvedSmartSuggestion[] {
  const t = text.trim();
  if (t.length === 0) return [];

  const matches: InternalRule[] = [];
  for (const rule of RULES) {
    const minLen = rule.minLength ?? 8;
    if (t.length < minLen) continue;
    if (rule.trigger(t)) matches.push(rule);
  }

  const strong = matches.filter((m) => !m.isFallback);
  const pool = strong.length > 0 ? strong : matches.filter((m) => m.isFallback);

  return pool
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SUGGESTIONS)
    .map((r) => ({ id: r.id, label: r.label, chips: r.chips }));
}

/** Manual / script self-tests: substring must appear in at least one active card label */
export const SMART_SUGGESTION_SELF_TESTS: { input: string; expectLabelIncludes: string[] }[] = [
  { input: "I don't know what goes wrong.", expectLabelIncludes: ["Which area might be affected"] },
  { input: "Outlook keeps freezing and I have no idea what's wrong.", expectLabelIncludes: ["email", "slow"] },
  { input: "The VPN is really slow today.", expectLabelIncludes: ["slow"] },
  { input: "Can't log in to Salesforce — spinning wheel.", expectLabelIncludes: ["try"] },
  { input: "After the Windows update yesterday things are weird.", expectLabelIncludes: ["update"] },
  { input: "Deploy failed with thousands of lines in the log.", expectLabelIncludes: ["process"] },
  { input: "403 forbidden on the admin page for my role.", expectLabelIncludes: ["access"] },
  { input: "The printer shows offline but it is on.", expectLabelIncludes: ["printer"] },
  { input: "Inbox not updating since this morning.", expectLabelIncludes: ["email"] },
  { input: "Nothing works in the office, whole team affected.", expectLabelIncludes: ["widespread"] },
  { input: "I'm not sure how to explain — something feels off.", expectLabelIncludes: ["closest"] },
  { input: "x".repeat(50), expectLabelIncludes: [] },
  { input: "The app is acting up after lunch, not sure what to say.", expectLabelIncludes: ["describe the error"] },
  { input: "VPN is slow for everyone in sales.", expectLabelIncludes: ["widespread", "slow"] },
  { input: "Printer jammed again, paper everywhere.", expectLabelIncludes: ["printer"] },
  { input: "No problem here, just testing.", expectLabelIncludes: [] },
  { input: "Something is broken in the build pipeline.", expectLabelIncludes: ["describe"] },
  { input: "Deploy failed during npm install and the log is huge.", expectLabelIncludes: ["process"] },
];

export function verifySmartSuggestionTests(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const tc of SMART_SUGGESTION_SELF_TESTS) {
    const got = getActiveSmartSuggestions(tc.input);
    if (tc.expectLabelIncludes.length === 0) {
      if (got.length > 0) errors.push(`"${tc.input.slice(0, 20)}...": expected no suggestions, got ${got.map((g) => g.label).join(" | ")}`);
      continue;
    }
    for (const frag of tc.expectLabelIncludes) {
      const found = got.some((g) => g.label.toLowerCase().includes(frag.toLowerCase()));
      if (!found) {
        errors.push(
          `Input "${tc.input.slice(0, 48)}...": expected a card whose label includes "${frag}", got: ${got.map((g) => g.label).join(" | ") || "(none)"}`
        );
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
