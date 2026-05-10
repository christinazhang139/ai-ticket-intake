export interface SpellCorrection {
  original: string;
  corrected: string;
}

export interface AIAnalysis {
  summary: string;
  category: string;
  subcategory: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  priorityReason: string;
  categoryReason: string;
  missingFields: string[];
  clarifyingQuestions: string[];
  corrections: SpellCorrection[];
  duplicateTicket: {
    id: string;
    title: string;
    similarity: number;
    created: string;
  } | null;
  aiGeneratedDescription: string | null;
  severityAssessment: string | null;
  statusCheck: {
    ticketId: string;
    status: string;
    assignedTo: string | null;
    waitTime: string;
    recommendation: string;
  } | null;
  knownIssues: {
    id: string;
    title: string;
    type: "known_issue" | "kcs";
    version: string;
  }[] | null;
  guidedFlow: {
    label: string;
    options: string[];
  }[] | null;
  scenarioTag: string;
  needsManualReview: boolean;
}

export interface TicketData {
  description: string;
  contactName: string;
  contactEmail: string;
  company: string;
  summary: string;
  category: string;
  subcategory: string;
  priority: string;
  affectedUsers: string;
  additionalDetails: string;
}

const BASE: Omit<AIAnalysis, "summary" | "category" | "subcategory" | "priority" | "priorityReason" | "categoryReason" | "scenarioTag"> = {
  missingFields: [],
  clarifyingQuestions: [],
  corrections: [],
  needsManualReview: false,
  duplicateTicket: null,
  aiGeneratedDescription: null,
  severityAssessment: null,
  statusCheck: null,
  knownIssues: null,
  guidedFlow: null,
};

// Levenshtein distance for fuzzy matching
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

const SPELL_DICT: Record<string, string[]> = {
  "error": ["eror", "errro", "erorr", "erro", "errer", "erreur", "err0r"],
  "crash": ["carsh", "crahs", "crsh", "chrash", "crsah"],
  "login": ["logn", "lgin", "log in", "logni", "loign", "lgoin"],
  "password": ["pasword", "passowrd", "passwrod", "passwodr", "passsword", "pssword"],
  "slow": ["slwo", "solw", "slw", "sow", "sloww"],
  "performance": ["performace", "preformance", "perfomance", "performnce", "peformance"],
  "update": ["udpate", "updte", "upadte", "upate", "updaet"],
  "upgrade": ["upgarde", "ugrade", "upgrad", "upgade", "upgraed"],
  "deploy": ["delpoy", "deplyo", "depoly", "dploy", "deply"],
  "network": ["netwrok", "newtork", "netowrk", "netwrk", "nework"],
  "storage": ["stoarge", "stroage", "storag", "strage", "stoage"],
  "monitoring": ["monitroing", "montioring", "monitoing", "monioring", "monitring"],
  "permission": ["permision", "permsision", "premission", "permssion", "permisison"],
  "access": ["acess", "acces", "accces", "acss", "acsess"],
  "denied": ["deneid", "deniед", "denid", "dennied", "deined"],
  "version": ["verison", "vresion", "verion", "versoin", "vesion"],
  "waiting": ["wating", "waitng", "watiting", "waitting", "wiating"],
  "computer": ["compuer", "comptuer", "compueter", "comuter", "cmputer"],
  "working": ["workng", "wroking", "workin", "wokring", "worknig"],
  "internet": ["internett", "intenet", "inernet", "interent", "interet"],
  "printer": ["prnter", "pirntrer", "pritnter", "prinetr", "printter"],
  "email": ["emial", "eamil", "emal", "emali", "emaol"],
  "database": ["databse", "datbase", "dataase", "databsae", "dataabase"],
  "install": ["instal", "intall", "insatll", "instll", "isntall"],
  "loading": ["loadign", "laoding", "lodaing", "loadng", "loaidng"],
  "frozen": ["forzen", "frozne", "froze", "frzoen"],
  "broken": ["borken", "brkoen", "brken", "brokne"],
  "status": ["staus", "stauts", "sttaus", "satus"],
};

function findCorrections(text: string): { corrected: string; corrections: SpellCorrection[] } {
  const corrections: SpellCorrection[] = [];
  const words = text.split(/(\s+)/);
  const correctedWords = words.map(word => {
    if (/^\s+$/.test(word)) return word;
    const clean = word.replace(/[.,!?;:'"()]/g, "");
    const punct = word.slice(clean.length);
    const lower = clean.toLowerCase();

    for (const [correct, typos] of Object.entries(SPELL_DICT)) {
      if (lower === correct) return word;
      if (typos.includes(lower) || editDistance(lower, correct) <= 1) {
        const cased = clean[0] === clean[0].toUpperCase()
          ? correct.charAt(0).toUpperCase() + correct.slice(1)
          : correct;
        corrections.push({ original: clean, corrected: cased });
        return cased + punct;
      }
      if (clean.length >= 5 && editDistance(lower, correct) === 2) {
        const cased = clean[0] === clean[0].toUpperCase()
          ? correct.charAt(0).toUpperCase() + correct.slice(1)
          : correct;
        corrections.push({ original: clean, corrected: cased });
        return cased + punct;
      }
    }
    return word;
  });
  return { corrected: correctedWords.join(""), corrections };
}

// UC1: System error — user can't describe the component or the error
function buildUC1(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc1_error_parse",
    summary: "CRM crashes when exporting reports",
    category: "Software",
    subcategory: "Crash / Error",
    priority: "High",
    priorityReason: "The app crash is preventing the user from completing their work. Needs same-day investigation.",
    categoryReason: "Mentions a crash during report export — routed to Software > Crash / Error.",
    aiGeneratedDescription:
      "Here's what we gathered from your description:\n\nThe CRM application is crashing when you try to export a report. An error dialog appeared briefly but you weren't able to catch the details. The app now won't open at all.\n\n**What AI thinks is going on:**\nThis looks like a crash in the CRM's report export module. Since the app won't reopen, the crash may have corrupted a local cache or temp file.\n\nNo error code was provided — if you see one next time, paste it here and we can narrow this down faster.",
    clarifyingQuestions: [
      "If you see an error code or message pop up again, can you type or screenshot it?",
      "Which report were you trying to pull when it crashed?",
    ],
  };
}

// UC2: Feature not working — could be bug, config issue, or access problem
function buildUC2(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc2_feature_broken",
    summary: "Can't log in to CRM — root cause unclear",
    category: "Access Management",
    subcategory: "Password Reset",
    priority: "High",
    priorityReason: "You're locked out of a system you need for work. We're treating this as high priority.",
    categoryReason: "Login issue detected — could be credentials, permissions, or a system problem. Let's figure out which one.",
    guidedFlow: [
      {
        label: "What happens when you try to log in?",
        options: [
          "I see 'Invalid password' or 'Account locked'",
          "The page loads but shows a blank screen or error",
          "I get a 'Permission denied' or 'Access not authorized' message",
          "The login page itself doesn't load at all",
        ],
      },
      {
        label: "Has this ever worked before?",
        options: [
          "Yes — it worked fine until today",
          "It stopped working after a recent change or update",
          "This is a new account — it has never worked",
          "It works sometimes but not consistently",
        ],
      },
      {
        label: "Are other users experiencing the same issue?",
        options: [
          "Yes — multiple people can't log in",
          "No — only me",
          "I'm not sure",
        ],
      },
    ],
  };
}

// UC3: Performance / latency — user unsure if it's serious
function buildUC3(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc3_performance",
    summary: "Widespread slowness — everything is lagging",
    category: "Workstation",
    subcategory: "Performance",
    priority: "Medium",
    priorityReason: "Things are slow but still working. Not an outage, but it's hurting productivity.",
    categoryReason: "You're describing general slowness — routed to Workstation > Performance.",
    severityAssessment:
      "This sounds like a **moderate performance issue** — annoying and disruptive, but not a full outage.\n\nHere's what could be going on:\n\n• **Network congestion** — especially if others on your floor are seeing this too\n• **Your machine specifically** — if it's just you, it might be a local issue (low disk space, too many apps open)\n• **Server-side load** — if specific apps like the CRM are slow for everyone, the backend might be under stress\n\n**Bottom line:** This doesn't look like an emergency, but it should be looked at today before it gets worse.",
    clarifyingQuestions: [
      "Is everything slow, or just certain apps?",
      "Is it just you, or are your coworkers seeing the same thing?",
    ],
  };
}

// UC4: Status inquiry — user waiting too long, wants an update
function buildUC4(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc4_status_check",
    summary: "Follow-up on existing ticket",
    category: "General",
    subcategory: "Service Request",
    priority: "Medium",
    priorityReason: "This is a follow-up, not a new issue. Priority carries over from the original ticket.",
    categoryReason: "Looks like you're checking on an existing ticket rather than reporting something new.",
    statusCheck: {
      ticketId: "TKT-4398",
      status: "In Progress — Awaiting Parts",
      assignedTo: "Mike Chen (L2 Technician)",
      waitTime: "Submitted 26 hours ago · Last updated 18 hours ago",
      recommendation:
        "Good news: your ticket is assigned to Mike Chen and being worked on. The not-so-good news: there hasn't been an update in 18 hours. Your SLA allows up to 8 hours for a response, so you're still within window — but it's getting close. We picked up on some urgency in your message, so it might be worth requesting a direct update from Mike or escalating if you need this resolved sooner.",
    },
  };
}

// UC5: Non-technical user — doesn't know terms, info is incomplete
function buildUC5(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc5_guided_intake",
    needsManualReview: true,
    summary: "IT issue — need more details",
    category: "General",
    subcategory: "Unclassified",
    priority: "Medium",
    priorityReason: "Can't tell how urgent this is yet — let's get a few more details first.",
    categoryReason: "Your description was pretty short, so we'll walk you through a few quick questions to get you the right help.",
    missingFields: ["Issue type", "Affected system", "Impact scope", "When it started"],
    guidedFlow: [
      {
        label: "What type of problem are you experiencing?",
        options: [
          "I can't open or use a program/app",
          "My internet or email isn't working",
          "My computer is slow or frozen",
          "I can't log in or access something",
          "My printer or other device isn't working",
          "Something else / I'm not sure",
        ],
      },
      {
        label: "When did this start?",
        options: [
          "Just now / today",
          "Yesterday",
          "It's been like this for a few days",
          "I'm not sure",
        ],
      },
      {
        label: "Is anyone else having this problem?",
        options: [
          "Yes — others on my team too",
          "I'm not sure",
          "No — just me",
        ],
      },
      {
        label: "How much does this affect your work?",
        options: [
          "I'm completely blocked — can't do my job",
          "It's slowing me down but I can still work",
          "It's a minor annoyance",
        ],
      },
    ],
  };
}

// UC6: Post-upgrade issue — version-related, may be known bug or compatibility
function buildUC6(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc6_version_issue",
    summary: "Things broke after Salesforce update to v248.1",
    category: "Software",
    subcategory: "Update / Patch",
    priority: "High",
    priorityReason: "Features that worked before the update are now broken — likely affecting anyone on the new version.",
    categoryReason: "You mentioned an update, so we checked against known issues for that version.",
    knownIssues: [
      {
        id: "KI-2024-0189",
        title: "Dashboard widgets fail to load after v248.1 upgrade — rendering engine conflict",
        type: "known_issue",
        version: "v248.1",
      },
      {
        id: "KCS-00547",
        title: "How to clear cache and reset UI components after a major version upgrade",
        type: "kcs",
        version: "v248.x",
      },
      {
        id: "KI-2024-0192",
        title: "Custom report exports broken in v248.1 — hotfix available (v248.1.2)",
        type: "known_issue",
        version: "v248.1",
      },
    ],
    clarifyingQuestions: [
      "Which specific features stopped working after the upgrade?",
      "Have you tried clearing your browser cache since the update?",
    ],
  };
}

// UC7: Installation/deployment failure — too many logs, can't find the problem
function buildUC7(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc7_log_parse",
    summary: "Deploy failed at database migration step",
    category: "Software",
    subcategory: "Installation",
    priority: "High",
    priorityReason: "The deploy is stuck and the release pipeline is blocked. Needs to be looked at now.",
    categoryReason: "You described a deployment failure — routed to Software > Installation.",
    aiGeneratedDescription:
      "We dug into what you described and here's what it looks like:\n\n**Where it failed:**\n• Stage: Database migration (Step 3 of 5)\n• Error type: Connection timeout after 120 seconds\n• Likely cause: The DB connection pool got exhausted, or there was a network hiccup during the schema migration\n• Component: Migration runner → DB connector\n\nYou mentioned the logs are overwhelming — we focused on the migration step since that's where the timing matches up with what you described. If you can grab the last ~20 lines of the deploy log, that'll help us confirm.",
    clarifyingQuestions: [
      "Can you paste the last 20 lines or so from the deploy log?",
      "Was this your first attempt, or have you tried rerunning it?",
    ],
  };
}

// UC8: Access/authentication issue — can't log in, might be permissions
function buildUC8(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc8_auth_rbac",
    summary: "Getting 'Access Denied' — permissions may have changed",
    category: "Access Management",
    subcategory: "Permission Change",
    priority: "High",
    priorityReason: "You're locked out of something you need for work. We'll fast-track this.",
    categoryReason: "This looks like a permissions or access control issue rather than a system outage.",
    guidedFlow: [
      {
        label: "What type of access issue are you experiencing?",
        options: [
          "I can't log in at all (password/credentials rejected)",
          "I can log in but get 'Access Denied' or 'Forbidden' on certain pages",
          "I can see the app but some features/buttons are greyed out or missing",
          "I'm getting an MFA/2FA error",
        ],
      },
      {
        label: "Has your role or team changed recently?",
        options: [
          "Yes — I moved to a new team or got a new role",
          "No — nothing has changed on my end",
          "I'm a new employee / this is a new account",
        ],
      },
    ],
    clarifyingQuestions: [
      "What is the exact error message you see when access is denied?",
      "Which specific application or system are you trying to access?",
    ],
  };
}

// UC9: Multi-component issue — network, storage, monitoring, logging involved
function buildUC9(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc9_multi_component",
    summary: "Multiple systems acting up — network, storage, monitoring all affected",
    category: "Network",
    subcategory: "Other",
    priority: "High",
    priorityReason: "This touches several systems at once, which usually means something bigger is going on. Routing to the senior team.",
    categoryReason: "You mentioned issues across network, storage, and monitoring — this needs cross-team coordination.",
    aiGeneratedDescription:
      "It sounds like several things are going wrong at the same time. Here's how we're breaking it down:\n\n**What we're seeing:**\n• **Network** — connections are dropping in and out\n• **Storage** — file shares and disk access are sluggish\n• **Monitoring** — Grafana or your dashboards stopped updating\n• **Logging** — the log pipeline might be affected too\n\n**What this probably means:**\nWhen multiple systems go sideways at once, it's often a shared dependency — could be a core switch, a SAN, or a DNS issue cascading through everything.\n\n**Next step:**\nWe're routing this to the senior SE team. They may split this into separate tickets per component after they assess the situation.",
    clarifyingQuestions: [
      "Which one feels worst right now — the network drops, the storage lag, or something else?",
      "Did all of this start around the same time, or did it creep up gradually?",
      "Are your monitoring dashboards totally blank, or showing stale/old data?",
    ],
  };
}

// UC10: System down — core business impacted, needs immediate escalation
function buildUC10(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "uc10_system_down",
    summary: "CRITICAL — Production is down, business at a standstill",
    category: "Network",
    subcategory: "Internet Connectivity",
    priority: "Critical",
    priorityReason: "Production is down and the business is stopped. This is a Severity 1 — escalation has been triggered automatically.",
    categoryReason: "Full outage with business impact detected — auto-classified as Severity 1.",
    severityAssessment:
      "**SEVERITY 1 — WE'RE ON IT**\n\nThis is a production outage and it's been automatically escalated to the highest level. Here's what's happening right now:\n\n**What we've done:**\n• Marked this as CRITICAL — Severity 1 (this can't be downgraded without manager approval)\n• The on-call engineer is being paged right now\n• SLA clock is running — target first response: 15 minutes\n\n**What to expect:**\n• You'll hear from the on-call engineer shortly\n• If this isn't resolved within 30 minutes, a bridge call will be set up\n• Everyone on your company's escalation contact list will get status updates automatically\n\nHang tight — this is top priority.",
  };
}

// Duplicate ticket scenario
function buildDuplicate(): AIAnalysis {
  return {
    ...BASE,
    scenarioTag: "duplicate",
    summary: "Outlook keeps crashing when opening attachments",
    category: "Email",
    subcategory: "Client Application",
    priority: "Medium",
    priorityReason: "Single-user issue with a workaround available, but a similar ticket is already open at your company.",
    categoryReason: "Email client crash — routed to Email > Client Application.",
    duplicateTicket: {
      id: "TKT-4521",
      title: "Outlook crashing — reported by others at your company",
      similarity: 84,
      created: "3 hours ago",
    },
  };
}

function detectScenario(description: string): string {
  const d = description.toLowerCase();

  // Duplicate: Outlook/email crash (specific trigger)
  if ((d.includes("outlook") || d.includes("email client")) && (d.includes("crash") || d.includes("freez") || d.includes("keeps closing")))
    return "duplicate";
  // UC10: System down — check first (highest urgency)
  if ((d.includes("down") || d.includes("outage")) && (d.includes("business") || d.includes("production") || d.includes("core") || d.includes("all users") || d.includes("everyone")))
    return "uc10";
  // UC7: Deployment/installation failure with logs
  if ((d.includes("deploy") || d.includes("install")) && (d.includes("fail") || d.includes("log") || d.includes("error")))
    return "uc7";
  // UC9: Multi-component (mentions 2+ infra components)
  if ([d.includes("network"), d.includes("storage"), d.includes("monitoring"), d.includes("logging"), d.includes("database")].filter(Boolean).length >= 2)
    return "uc9";
  // UC1: Error/crash
  if (d.includes("error") || d.includes("crash") || d.includes("报错") || (d.includes("broke") && d.includes("don't know")))
    return "uc1";
  // UC8: Access/auth with permission signals
  if (d.includes("permission") || d.includes("access denied") || d.includes("forbidden") || d.includes("rbac") || d.includes("role") || d.includes("权限"))
    return "uc8";
  // UC2: Login / feature broken
  if (d.includes("can't log") || d.includes("cannot log") || d.includes("login") || d.includes("won't let me") || d.includes("登录") || d.includes("无法"))
    return "uc2";
  // UC3: Performance
  if (d.includes("slow") || d.includes("latency") || d.includes("performance") || d.includes("loading") || d.includes("慢") || d.includes("卡"))
    return "uc3";
  // UC4: Status inquiry
  if (d.includes("status") || d.includes("waiting") || d.includes("how long") || d.includes("follow up") || d.includes("followup") || d.includes("haven't heard") || d.includes("等待") || d.includes("进度"))
    return "uc4";
  // UC6: Post-upgrade
  if (d.includes("upgrade") || d.includes("new version") || d.includes("after update") || d.includes("since update") || d.includes("升级") || d.includes("版本"))
    return "uc6";
  // UC5: Short / vague, or long but pure emotion with no actionable info
  if (description.length < 50) return "uc5";
  const emotionWords = /frustrated|angry|ridiculous|hate|terrible|annoyed|furious|useless|awful|sick of|fed up|unacceptable/i;
  const actionWords = /outlook|email|login|password|slow|error|crash|network|vpn|printer|deploy|install|access|update|monitor|storage|computer|laptop/i;
  if (emotionWords.test(d) && !actionWords.test(d)) return "uc5";

  return "default";
}

const builders: Record<string, () => AIAnalysis> = {
  duplicate: buildDuplicate,
  uc1: buildUC1,
  uc2: buildUC2,
  uc3: buildUC3,
  uc4: buildUC4,
  uc5: buildUC5,
  uc6: buildUC6,
  uc7: buildUC7,
  uc8: buildUC8,
  uc9: buildUC9,
  uc10: buildUC10,
};

export function simulateAIAnalysis(description: string): Promise<AIAnalysis> {
  return new Promise((resolve) => {
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
      const { corrected, corrections } = findCorrections(description);
      const scenario = detectScenario(corrected);
      const builder = builders[scenario];
      const result = builder
        ? builder()
        : {
            ...BASE,
            scenarioTag: "default" as const,
            summary: corrected.length > 60 ? corrected.substring(0, 57) + "..." : corrected,
            category: "General" as const,
            subcategory: "Service Request",
            priority: "Medium" as const,
            priorityReason: "Standard priority — no urgency signals detected.",
            categoryReason: "Classified based on content analysis.",
          };
      result.corrections = corrections;
      resolve(result);
    }, delay);
  });
}

export const CATEGORIES = [
  { name: "Email", subcategories: ["Client Application", "Server / Exchange", "Spam / Phishing", "Other"] },
  { name: "Network", subcategories: ["VPN / Remote Access", "Wi-Fi", "Internet Connectivity", "DNS / DHCP", "Other"] },
  { name: "Hardware", subcategories: ["Workstation", "Printer / Scanner", "Monitor / Display", "Peripheral", "Other"] },
  { name: "Software", subcategories: ["Installation", "Update / Patch", "Licensing", "Crash / Error", "Other"] },
  { name: "Access Management", subcategories: ["Password Reset", "New Account", "Permission Change", "MFA", "Other"] },
  { name: "Workstation", subcategories: ["Performance", "Blue Screen / Crash", "Startup Issue", "Other"] },
  { name: "Cloud Services", subcategories: ["Microsoft 365", "Azure", "Google Workspace", "Other"] },
  { name: "Security", subcategories: ["Suspected Breach", "Malware", "Phishing Report", "Other"] },
  { name: "General", subcategories: ["Unclassified", "Question", "Service Request", "Other"] },
];

export const PRIORITIES = [
  { name: "Critical", color: "text-red-700 bg-red-50 border-red-200" },
  { name: "High", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { name: "Medium", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { name: "Low", color: "text-green-700 bg-green-50 border-green-200" },
];

export const DEMO_SCENARIOS = [
  {
    label: "Got an error, no idea what it means",
    description: "I was trying to pull a report and the whole thing just blew up. Some kind of error box popped up but it went away before I could read it. Now the app won't open at all.",
    color: "hover:bg-red-50 hover:border-red-300",
  },
  {
    label: "Can't log in",
    description: "CRM won't let me in. I type my password and it just spins forever, then nothing. Tried resetting my password already but same thing. Could be my account, could be the system — no clue.",
    color: "hover:bg-orange-50 hover:border-orange-300",
  },
  {
    label: "Everything is painfully slow",
    description: "Is it just me or is everything crawling today? Emails take ages to load, the CRM keeps hanging, and even saving a document takes like 30 seconds. It's been like this all morning.",
    color: "hover:bg-yellow-50 hover:border-yellow-300",
  },
  {
    label: "Where's my ticket?",
    description: "Hey, I put in a ticket yesterday about my second monitor being dead and I still haven't heard a word. Is anyone even looking at this? I've got a presentation tomorrow and I really need both screens.",
    color: "hover:bg-blue-50 hover:border-blue-300",
  },
  {
    label: "Vague / non-technical",
    description: "My computer is acting weird",
    color: "hover:bg-purple-50 hover:border-purple-300",
  },
  {
    label: "Broke after an update",
    description: "Ever since the Salesforce update last night, half my dashboard widgets are just blank. The custom reports I use every day won't export anymore either. Was working fine yesterday.",
    color: "hover:bg-teal-50 hover:border-teal-300",
  },
  {
    label: "Deploy failed, wall of logs",
    description: "Deployment bombed out about halfway through and now I'm staring at a massive log file with no idea what to look for. I think it died somewhere around the database migration step but honestly there's too much output to tell.",
    color: "hover:bg-rose-50 hover:border-rose-300",
  },
  {
    label: "Locked out / permission issue",
    description: "I keep getting 'Access Denied' on the reporting dashboard. This was working fine last week — I haven't changed anything on my end. Did somebody change the permissions? I need this for a client meeting at 2pm.",
    color: "hover:bg-amber-50 hover:border-amber-300",
  },
  {
    label: "Multiple things broken at once",
    description: "Not sure what's going on but a bunch of stuff seems off — the network keeps dropping, file shares are super laggy, and Grafana stopped showing any data about an hour ago. Feels like something bigger is wrong but I don't know where to even start looking.",
    color: "hover:bg-indigo-50 hover:border-indigo-300",
  },
  {
    label: "Same issue someone else reported",
    description: "My Outlook keeps crashing every time I try to open an attachment. It just freezes for a second and then closes itself. Been happening all morning.",
    color: "hover:bg-orange-50 hover:border-orange-300",
  },
  {
    label: "Everything is down",
    description: "URGENT — production is completely down right now. Nobody in the office can get to anything. Phones are ringing off the hook from clients. We need someone on this ASAP, this is affecting everyone and the business is at a standstill.",
    color: "hover:bg-red-50 hover:border-red-400",
  },
];
