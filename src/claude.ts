import Anthropic from "@anthropic-ai/sdk";
import { FALLACY_NAMES_FOR_PROMPT } from "./fallacies.js";
import type {
  ArgumentScore,
  FallacyDetection,
  ScoredArgument,
  DebateSession,
} from "./types.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-6";

// ─── Proposition Refinement ────────────────────────────────────────────────

export async function refineProposition(rawTopic: string): Promise<{
  proposition: string;
  explanation: string;
}> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a debate coach helping a student frame a debate topic as a proper proposition.

The student's topic: "${rawTopic}"

A good debate proposition:
- Is a clear, specific statement (not a question)
- Can be argued FOR or AGAINST
- Is falsifiable and not purely subjective
- Is stated in present tense: "X should/is/does..."

Respond with a JSON object only:
{
  "proposition": "The refined, properly-stated proposition",
  "explanation": "Brief explanation of why this framing works well for debate (1-2 sentences)"
}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === "text")?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse proposition from Claude");

  return JSON.parse(jsonMatch[0]) as { proposition: string; explanation: string };
}

// ─── Argument Scoring ──────────────────────────────────────────────────────

export async function scoreArgument(params: {
  proposition: string;
  position: string;
  argument: string;
  previousArguments: string[];
}): Promise<ScoredArgument> {
  const previousContext =
    params.previousArguments.length > 0
      ? `\nPrevious arguments made:\n${params.previousArguments.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : "";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are an expert debate coach and logician. Analyze this argument rigorously.

PROPOSITION: "${params.proposition}"
POSITION BEING ARGUED: ${params.position}
${previousContext}

NEW ARGUMENT TO ANALYZE:
"${params.argument}"

Score the argument on these criteria:
- Evidence (0-3): Does it include factual backing? Studies, data, specific examples, expert consensus?
  0 = pure opinion, 1 = vague reference, 2 = reasonable claim with some support, 3 = strong empirical backing
- Logic (0-3): Is the reasoning sound? No fallacies? Does the conclusion follow from premises?
  0 = deeply flawed, 1 = some logical problems, 2 = mostly sound, 3 = rigorous and valid
- Relevance (0-2): Does it actually address and support the specific proposition?
  0 = tangential, 1 = partially relevant, 2 = directly on-point
- Originality (0-2): Is this a nuanced/specific point or a generic/obvious one?
  0 = very common/generic, 1 = somewhat specific, 2 = genuinely nuanced insight

Detect ALL logical fallacies present (from this list):
${FALLACY_NAMES_FOR_PROMPT}

Respond with a JSON object ONLY (no other text):
{
  "scores": {
    "evidence": <0-3>,
    "logic": <0-3>,
    "relevance": <0-2>,
    "originality": <0-2>
  },
  "fallacies": [
    {
      "type": "<fallacy_type_key>",
      "name": "<Human readable name>",
      "description": "<what this fallacy is>",
      "explanation": "<exactly how it appears in this specific argument>",
      "quote": "<the specific phrase in the argument that contains the fallacy>"
    }
  ],
  "feedback": "<2-3 sentence evaluation: what's strong, what's weak, how it relates to the proposition>",
  "strengtheningSuggestion": "<specific, actionable suggestion to make this argument stronger>"
}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === "text")?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse argument score from Claude");

  const parsed = JSON.parse(jsonMatch[0]) as {
    scores: { evidence: number; logic: number; relevance: number; originality: number };
    fallacies: FallacyDetection[];
    feedback: string;
    strengtheningSuggestion: string;
  };

  const score: ArgumentScore = {
    evidence: Math.min(3, Math.max(0, parsed.scores.evidence)),
    logic: Math.min(3, Math.max(0, parsed.scores.logic)),
    relevance: Math.min(2, Math.max(0, parsed.scores.relevance)),
    originality: Math.min(2, Math.max(0, parsed.scores.originality)),
    total:
      Math.min(3, Math.max(0, parsed.scores.evidence)) +
      Math.min(3, Math.max(0, parsed.scores.logic)) +
      Math.min(2, Math.max(0, parsed.scores.relevance)) +
      Math.min(2, Math.max(0, parsed.scores.originality)),
  };

  return {
    text: params.argument,
    score,
    fallacies: parsed.fallacies || [],
    feedback: parsed.feedback || "",
    strengtheningSuggestion: parsed.strengtheningSuggestion || "",
    timestamp: new Date().toISOString(),
  };
}

// ─── Steel-Man Generation ──────────────────────────────────────────────────

export async function generateSteelman(session: DebateSession): Promise<{
  steelman: string;
  keyCounterArguments: string[];
}> {
  const proArgsSummary = session.proArguments
    .map((a, i) => `${i + 1}. "${a.text}" (Score: ${a.score.total}/10)`)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a master debater and philosopher. A student has just argued FOR the following proposition.

PROPOSITION: "${session.proposition}"

THE STUDENT'S ARGUMENTS (arguing FOR):
${proArgsSummary}

Your task: Present the STRONGEST POSSIBLE CASE AGAINST this proposition.
This is steel-manning — you must construct the best version of the opposing argument,
not a straw man. Think like the best lawyer for the opposing side.

Rules:
- Engage with the actual strongest version of the opposing position
- Use real evidence, studies, and expert perspectives where possible
- Acknowledge any valid points in the student's arguments while showing their limits
- Be intellectually honest — this should be a genuinely challenging counter-case
- This will help the student understand what they're really up against

Respond with a JSON object ONLY:
{
  "steelman": "<A compelling, well-reasoned paragraph (150-250 words) presenting the strongest case AGAINST the proposition. Write in first person as if you are arguing this side.>",
  "keyCounterArguments": [
    "<Counter-argument 1: specific, evidence-backed, most powerful>",
    "<Counter-argument 2: addresses a weakness in the student's arguments>",
    "<Counter-argument 3: presents a genuine trade-off or unintended consequence>",
    "<Counter-argument 4: philosophical or values-based counter>",
    "<Counter-argument 5: empirical/practical counter>"
  ]
}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === "text")?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse steelman from Claude");

  return JSON.parse(jsonMatch[0]) as {
    steelman: string;
    keyCounterArguments: string[];
  };
}

// ─── Debate Synthesis ──────────────────────────────────────────────────────

export async function generateSynthesis(session: DebateSession): Promise<string> {
  const proArgsSummary = session.proArguments
    .map(
      (a, i) =>
        `  ${i + 1}. "${a.text.substring(0, 100)}..." — Score: ${a.score.total}/10, Fallacies: ${a.fallacies.length}`
    )
    .join("\n");

  const conArgsSummary = session.conArguments
    .map(
      (a, i) =>
        `  ${i + 1}. "${a.text.substring(0, 100)}..." — Score: ${a.score.total}/10, Fallacies: ${a.fallacies.length}`
    )
    .join("\n");

  const proAvg =
    session.proArguments.length > 0
      ? (
          session.proArguments.reduce((s, a) => s + a.score.total, 0) /
          session.proArguments.length
        ).toFixed(1)
      : "N/A";

  const conAvg =
    session.conArguments.length > 0
      ? (
          session.conArguments.reduce((s, a) => s + a.score.total, 0) /
          session.conArguments.length
        ).toFixed(1)
      : "N/A";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a master debate coach providing a final synthesis after a student has argued BOTH sides of a proposition.

PROPOSITION: "${session.proposition}"

ARGUMENTS FOR (avg score: ${proAvg}/10):
${proArgsSummary}

ARGUMENTS AGAINST (avg score: ${conAvg}/10):
${conArgsSummary}

Write a final synthesis (200-300 words) that:
1. Acknowledges what the student did well on BOTH sides
2. Identifies the strongest arguments that emerged from the full debate
3. Explains what "the strongest version of this debate" looks like — what would a professional debater argue on each side?
4. Names the key tension or core value clash at the heart of this debate
5. Leaves the student with a philosophical insight about why these debates matter

Be encouraging but honest. This synthesis should make the student feel they've grown intellectually.

Write as flowing prose, no bullet points, no JSON — just a thoughtful paragraph.`,
      },
    ],
  });

  return response.content.find(b => b.type === "text")?.text ?? "Debate completed.";
}

// ─── Argument Builder Scaffold ─────────────────────────────────────────────

export async function scaffoldArgument(params: {
  proposition: string;
  position: string;
  userThought: string;
}): Promise<{
  questions: string[];
  hint: string;
}> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a Socratic debate coach. A student wants to argue ${params.position} on this proposition:

"${params.proposition}"

The student says: "${params.userThought}"

Guide them to build a stronger argument using the Socratic method.

Respond with JSON ONLY:
{
  "questions": [
    "<Question 1: ask them to clarify or deepen their belief>",
    "<Question 2: ask for evidence or examples>",
    "<Question 3: ask how they'd respond to the strongest counter-argument>",
    "<Question 4: ask about trade-offs or unintended consequences>"
  ],
  "hint": "<1-sentence suggestion for how to turn their thought into a strong argument>"
}`,
      },
    ],
  });

  const text = response.content.find(b => b.type === "text")?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse scaffold from Claude");

  return JSON.parse(jsonMatch[0]) as { questions: string[]; hint: string };
}

// ─── Format Scoring Output ─────────────────────────────────────────────────

export function formatScoredArgument(arg: ScoredArgument): string {
  const scoreEmoji = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.8) return "✅";
    if (pct >= 0.5) return "⚠️";
    return "❌";
  };

  const lines: string[] = [
    `**Score: ${arg.score.total}/10**`,
    "",
    `${scoreEmoji(arg.score.evidence, 3)} **Evidence (${arg.score.evidence}/3):** ${arg.score.evidence === 3 ? "Strong factual backing" : arg.score.evidence === 2 ? "Reasonable support" : arg.score.evidence === 1 ? "Vague, needs specifics" : "No evidence — pure opinion"}`,
    `${scoreEmoji(arg.score.logic, 3)} **Logic (${arg.score.logic}/3):** ${arg.score.logic === 3 ? "Sound and valid reasoning" : arg.score.logic === 2 ? "Mostly sound reasoning" : arg.score.logic === 1 ? "Some logical problems" : "Flawed reasoning"}`,
    `${scoreEmoji(arg.score.relevance, 2)} **Relevance (${arg.score.relevance}/2):** ${arg.score.relevance === 2 ? "Directly supports the proposition" : arg.score.relevance === 1 ? "Partially relevant" : "Off-topic"}`,
    `${scoreEmoji(arg.score.originality, 2)} **Originality (${arg.score.originality}/2):** ${arg.score.originality === 2 ? "Nuanced insight" : arg.score.originality === 1 ? "Somewhat specific" : "Common/generic point"}`,
    "",
    `**Feedback:** ${arg.feedback}`,
    "",
    `💡 **Could strengthen:** ${arg.strengtheningSuggestion}`,
  ];

  if (arg.fallacies.length > 0) {
    lines.push("");
    lines.push(`**⚠️ Logical fallacies detected (${arg.fallacies.length}):**`);
    for (const fallacy of arg.fallacies) {
      lines.push(`- **${fallacy.name}**: ${fallacy.explanation}`);
      if (fallacy.quote) lines.push(`  *"${fallacy.quote}"*`);
    }
  } else {
    lines.push("");
    lines.push("**✅ No logical fallacies detected**");
  }

  return lines.join("\n");
}
