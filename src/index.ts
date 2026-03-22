#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createSession,
  getSession,
  addArgument,
  setSteeleman,
  flipSides,
  setSynthesis,
  getSessionStats,
} from "./session.js";
import {
  refineProposition,
  scoreArgument,
  generateSteelman,
  generateSynthesis,
  scaffoldArgument,
  formatScoredArgument,
} from "./claude.js";
import { saveDebate, getProgressReport } from "./database.js";
import { filterTopics, CATEGORIES, AGE_GROUPS } from "./topics.js";
import { FALLACIES } from "./fallacies.js";
import type { DebateSession } from "./types.js";

const server = new McpServer({
  name: "debate-coach",
  version: "0.1.0",
});

// ─── start_debate ──────────────────────────────────────────────────────────

server.tool(
  "start_debate",
  "Start a new debate session. The student proposes a topic (or leaves it blank to pick from the curated list) and the AI frames it as a proper debate proposition. Returns session ID and instructions.",
  {
    profileId: z.string().describe("Unique identifier for the student/user"),
    topic: z
      .string()
      .optional()
      .describe(
        "Topic or proposition to debate. Leave blank to get topic suggestions."
      ),
    position: z
      .string()
      .optional()
      .describe(
        "The position the student wants to argue first (e.g., 'FOR', 'AGAINST'). Defaults to FOR."
      ),
  },
  async ({ profileId, topic, position }) => {
    if (!topic) {
      const suggestions = filterTopics().slice(0, 10);
      return {
        content: [
          {
            type: "text",
            text: `No topic provided. Use \`get_topic_list\` to browse 50+ curated debate topics, or provide your own topic.\n\nHere are 10 popular topics to get you started:\n\n${suggestions.map((t, i) => `${i + 1}. **${t.title}** — "${t.proposition}"`).join("\n")}\n\nCall \`start_debate\` again with a \`topic\` parameter.`,
          },
        ],
      };
    }

    // Refine the proposition
    const refined = await refineProposition(topic);
    const finalPosition = position ?? "FOR the proposition";

    const session = createSession({
      profileId,
      topic,
      proposition: refined.proposition,
      position: finalPosition,
    });

    const instructions = [
      `🎯 **Debate Session Started!**`,
      ``,
      `**Proposition:** "${refined.proposition}"`,
      `**${refined.explanation}**`,
      ``,
      `**Your position:** You are arguing ${finalPosition}`,
      ``,
      `**How this works:**`,
      `1. Submit your 3-5 strongest arguments using \`submit_argument\``,
      `2. Each argument will be scored (0-10) and checked for logical fallacies`,
      `3. After at least 3 arguments, call \`get_steelman\` to see the strongest opposing case`,
      `4. Then call \`flip_sides\` — now argue the OPPOSITE position`,
      `5. Submit 3-5 arguments for the other side`,
      `6. Call \`complete_debate\` to receive your final synthesis`,
      ``,
      `This is how lawyers and scientists think. Let's begin — make your first argument!`,
      ``,
      `**Session ID:** \`${session.id}\``,
    ].join("\n");

    return {
      content: [
        {
          type: "text",
          text: instructions,
        },
      ],
    };
  }
);

// ─── submit_argument ───────────────────────────────────────────────────────

server.tool(
  "submit_argument",
  "Submit an argument for the current debate. The AI scores it on evidence, logic, relevance, and originality (0-10), detects logical fallacies, and provides feedback.",
  {
    sessionId: z.string().describe("The session ID from start_debate"),
    argument: z
      .string()
      .min(10)
      .describe("Your argument text (at least one complete sentence)"),
  },
  async ({ sessionId, argument }) => {
    const session = getSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `Session \`${sessionId}\` not found. Please start a new debate with \`start_debate\`.`,
          },
        ],
      };
    }

    if (session.phase === "FLIP_READY" || session.phase === "COMPLETED") {
      return {
        content: [
          {
            type: "text",
            text:
              session.phase === "FLIP_READY"
                ? "You've already made your PRO arguments. Call `flip_sides` to switch positions, then submit your CON arguments."
                : "This debate is complete. Call `complete_debate` for your final synthesis or start a new one.",
          },
        ],
      };
    }

    const isProPhase =
      session.phase === "PRO_ARGUMENTS" || session.phase === "STEELMAN_READY";
    const previousArguments = isProPhase
      ? session.proArguments.map(a => a.text)
      : session.conArguments.map(a => a.text);

    const scored = await scoreArgument({
      proposition: session.proposition,
      position: session.currentPosition,
      argument,
      previousArguments,
    });

    const updatedSession = addArgument(sessionId, scored);

    const phaseArgs = isProPhase
      ? updatedSession.proArguments
      : updatedSession.conArguments;
    const argNumber = phaseArgs.length;
    const phase = isProPhase ? "PRO" : "CON";

    const formattedScore = formatScoredArgument(scored);

    let nextStepHint = "";
    if (argNumber < 3) {
      nextStepHint = `\n\n📝 **Argument ${argNumber}/5 submitted.** Submit at least ${3 - argNumber} more argument${3 - argNumber > 1 ? "s" : ""} before you can see the steel-man.`;
    } else if (argNumber >= 3 && isProPhase) {
      nextStepHint = `\n\n✅ **Argument ${argNumber}/5 submitted.** You've made enough arguments! You can:\n- Submit more arguments (up to 5)\n- Call \`get_steelman\` to see the strongest opposing case`;
    } else if (argNumber < 3 && !isProPhase) {
      nextStepHint = `\n\n📝 **CON Argument ${argNumber}/5 submitted.** Submit ${3 - argNumber} more to complete the flip challenge.`;
    } else if (argNumber >= 3 && !isProPhase) {
      nextStepHint = `\n\n🎉 **CON Argument ${argNumber}/5 submitted.** Excellent work arguing both sides! Call \`complete_debate\` for your final synthesis.`;
    }

    return {
      content: [
        {
          type: "text",
          text:
            `## Argument ${argNumber} (${phase}) — Analysis\n\n` +
            `> "${argument.length > 150 ? argument.substring(0, 150) + "..." : argument}"\n\n` +
            formattedScore +
            nextStepHint,
        },
      ],
    };
  }
);

// ─── get_steelman ──────────────────────────────────────────────────────────

server.tool(
  "get_steelman",
  "After submitting at least 3 PRO arguments, call this to see the strongest possible case for the opposing side. This prepares you for the flip challenge.",
  {
    sessionId: z.string().describe("The session ID from start_debate"),
  },
  async ({ sessionId }) => {
    const session = getSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `Session \`${sessionId}\` not found. Start a new debate with \`start_debate\`.`,
          },
        ],
      };
    }

    if (session.proArguments.length < 3) {
      return {
        content: [
          {
            type: "text",
            text: `You need at least 3 arguments before getting the steel-man. You've submitted ${session.proArguments.length} so far. Keep going!`,
          },
        ],
      };
    }

    if (session.phase === "CON_ARGUMENTS" || session.phase === "SYNTHESIS_READY") {
      return {
        content: [
          {
            type: "text",
            text:
              session.steelman ??
              "You've already flipped sides. Keep submitting your CON arguments!",
          },
        ],
      };
    }

    const result = await generateSteelman(session);
    setSteeleman(sessionId, result.steelman, result.keyCounterArguments);

    const output = [
      `## 🔄 The Steel-Man: Strongest Case AGAINST Your Position`,
      ``,
      `**Proposition:** "${session.proposition}"`,
      ``,
      `Here is the most compelling case *against* what you just argued. This is what a skilled opposing debater would say:`,
      ``,
      `---`,
      ``,
      result.steelman,
      ``,
      `---`,
      ``,
      `### Key Counter-Arguments You'll Face:`,
      ``,
      result.keyCounterArguments.map((a, i) => `${i + 1}. ${a}`).join("\n"),
      ``,
      `---`,
      ``,
      `🔄 **Now it's your turn to argue AGAINST the proposition.**`,
      `Call \`flip_sides\` to accept the challenge — argue the side you just saw steel-manned.`,
      `This is how lawyers train. This is how scientists think.`,
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── flip_sides ────────────────────────────────────────────────────────────

server.tool(
  "flip_sides",
  "Flip to argue the opposing side. After seeing the steel-man, you must now argue against your original position as convincingly as possible.",
  {
    sessionId: z.string().describe("The session ID from start_debate"),
  },
  async ({ sessionId }) => {
    const session = getSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `Session \`${sessionId}\` not found.`,
          },
        ],
      };
    }

    if (session.phase !== "FLIP_READY") {
      const msg =
        session.phase === "PRO_ARGUMENTS"
          ? "You need to submit at least 3 arguments and then call `get_steelman` before flipping."
          : session.phase === "STEELMAN_READY"
          ? "Call `get_steelman` first to see the opposing case, then flip."
          : session.phase === "CON_ARGUMENTS" || session.phase === "SYNTHESIS_READY"
          ? "You've already flipped! Keep submitting CON arguments."
          : "Debate is complete. Start a new one!";

      return {
        content: [{ type: "text", text: msg }],
      };
    }

    const updatedSession = flipSides(sessionId);

    const output = [
      `## 🔄 Sides Flipped!`,
      ``,
      `**Proposition:** "${updatedSession.proposition}"`,
      ``,
      `You are NOW arguing: **${updatedSession.currentPosition}**`,
      ``,
      `This is the hard part. You just spent time building the FOR case — now dismantle it.`,
      ``,
      `**Your challenge:** Submit 3-5 arguments AGAINST the proposition. The best version of`,
      `the opposing case isn't just pointing out problems — it's making a genuinely compelling`,
      `alternative argument.`,
      ``,
      `**Hints from the steel-man you just read:**`,
      updatedSession.keyCounterArguments
        ? updatedSession.keyCounterArguments.map(a => `- ${a}`).join("\n")
        : "Use the counter-arguments from the steel-man as starting points.",
      ``,
      `Use \`submit_argument\` to make your first CON argument. Go!`,
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── complete_debate ───────────────────────────────────────────────────────

server.tool(
  "complete_debate",
  "Finalize the debate session and receive a synthesis of both sides, what the strongest version of this debate looks like, and personalized feedback. Saves results to your progress history.",
  {
    sessionId: z.string().describe("The session ID from start_debate"),
  },
  async ({ sessionId }) => {
    const session = getSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `Session \`${sessionId}\` not found.`,
          },
        ],
      };
    }

    if (session.proArguments.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "You haven't submitted any arguments yet! Use `submit_argument` to make your case.",
          },
        ],
      };
    }

    // Generate synthesis
    const synthesis = await generateSynthesis(session);
    const finalSession = setSynthesis(sessionId, synthesis);

    const stats = getSessionStats(finalSession);

    // Save to database
    saveDebate({
      id: finalSession.id,
      profileId: finalSession.profileId,
      topic: finalSession.topic,
      proposition: finalSession.proposition,
      startedAt: finalSession.startedAt,
      completed: true,
      didFlip: finalSession.conArguments.length > 0,
      proScore: stats.proScore,
      conScore: stats.conScore,
      fallaciesCaught: stats.fallaciesCaught,
      fallaciesTotal: stats.fallaciesTotal,
      arguments: [
        ...finalSession.proArguments,
        ...finalSession.conArguments,
      ],
      synthesis,
    });

    const proScoreBar = scoreBar(stats.proScore, 10);
    const conScoreBar = scoreBar(stats.conScore, 10);

    const output = [
      `## 🎓 Debate Complete!`,
      ``,
      `**Proposition:** "${finalSession.proposition}"`,
      ``,
      `### Your Performance`,
      ``,
      `| Side | Arguments | Avg Score | |`,
      `|------|-----------|-----------|--|`,
      `| FOR  | ${finalSession.proArguments.length} | ${stats.proScore}/10 | ${proScoreBar} |`,
      `| AGAINST | ${finalSession.conArguments.length} | ${stats.conScore}/10 | ${conScoreBar} |`,
      ``,
      `**Logical fallacies caught:** ${stats.fallaciesCaught}`,
      `**Flip challenge:** ${finalSession.conArguments.length > 0 ? "✅ Completed" : "❌ Not attempted"}`,
      ``,
      `---`,
      ``,
      `### 🧠 Final Synthesis`,
      ``,
      synthesis,
      ``,
      `---`,
      ``,
      `*Use \`get_progress\` with profileId \`${finalSession.profileId}\` to track your improvement over time.*`,
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── get_topic_list ────────────────────────────────────────────────────────

server.tool(
  "get_topic_list",
  "Browse the curated list of 50+ debate topics. Filter by category or age group.",
  {
    category: z
      .string()
      .optional()
      .describe(
        `Filter by category. Options: ${CATEGORIES.join(", ")}`
      ),
    ageGroup: z
      .string()
      .optional()
      .describe(
        `Filter by age group. Options: ${AGE_GROUPS.join(", ")}`
      ),
    difficulty: z
      .enum(["easy", "medium", "hard"])
      .optional()
      .describe("Filter by difficulty level"),
  },
  async ({ category, ageGroup, difficulty }) => {
    let topics = filterTopics(category, ageGroup);
    if (difficulty) topics = topics.filter(t => t.difficulty === difficulty);

    if (topics.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No topics found with those filters. Categories: ${CATEGORIES.join(", ")}. Age groups: ${AGE_GROUPS.join(", ")}.`,
          },
        ],
      };
    }

    const grouped: Record<string, typeof topics> = {};
    for (const topic of topics) {
      if (!grouped[topic.category]) grouped[topic.category] = [];
      grouped[topic.category].push(topic);
    }

    const lines: string[] = [
      `## 📚 Debate Topics (${topics.length} total)`,
      ``,
    ];

    for (const [cat, catTopics] of Object.entries(grouped)) {
      lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
      lines.push(``);
      for (const t of catTopics) {
        const diffIcon =
          t.difficulty === "easy" ? "🟢" : t.difficulty === "medium" ? "🟡" : "🔴";
        lines.push(`${diffIcon} **${t.title}**`);
        lines.push(`   *"${t.proposition}"*`);
        lines.push(`   Tags: ${t.tags.join(", ")}`);
        lines.push(``);
      }
    }

    lines.push(
      `*Start a debate: \`start_debate({ profileId: "you", topic: "<paste proposition here>" })\`*`
    );

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

// ─── get_progress ──────────────────────────────────────────────────────────

server.tool(
  "get_progress",
  "View your debate progress over time: scores, fallacy trends, improvement areas, and statistics.",
  {
    profileId: z
      .string()
      .describe("The profile ID used when starting debates"),
  },
  async ({ profileId }) => {
    const progress = getProgressReport(profileId);

    if (progress.debatesCompleted === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No completed debates found for profile \`${profileId}\`. Start your first debate with \`start_debate\`!`,
          },
        ],
      };
    }

    const scoreBar10 = (score: number) => scoreBar(score, 10);

    const topFallaciesText =
      progress.topFallacies.length > 0
        ? progress.topFallacies
            .map(f => `- **${f.type.replace(/_/g, " ")}**: ${f.count} times`)
            .join("\n")
        : "- None detected yet — excellent logical hygiene!";

    const improvementText = progress.improvementAreas
      .map(a => `- ${a}`)
      .join("\n");

    const recentScores = progress.scoreOverTime.slice(-5);
    const scoreTrend =
      recentScores.length > 1
        ? recentScores[recentScores.length - 1].score >
          recentScores[0].score
          ? "📈 Improving"
          : recentScores[recentScores.length - 1].score <
            recentScores[0].score
          ? "📉 Declining"
          : "➡️ Steady"
        : "Not enough data";

    const output = [
      `## 📊 Debate Progress — @${profileId}`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Debates completed | ${progress.debatesCompleted} |`,
      `| Average PRO score | ${progress.avgProScore}/10 ${scoreBar10(progress.avgProScore)} |`,
      `| Average CON score | ${progress.avgConScore}/10 ${scoreBar10(progress.avgConScore)} |`,
      `| Overall average | ${progress.avgScore}/10 ${scoreBar10(progress.avgScore)} |`,
      `| Flip success rate | ${Math.round(progress.flipSuccessRate * 100)}% |`,
      `| Score trend | ${scoreTrend} |`,
      ``,
      `### 🧠 Top Logical Fallacies Detected`,
      ``,
      topFallaciesText,
      ``,
      `### 📈 Score Over Time (last ${recentScores.length} debates)`,
      ``,
      recentScores
        .map(s => `- ${s.date}: ${s.score.toFixed(1)}/10 ${scoreBar(s.score, 10)}`)
        .join("\n"),
      ``,
      `### 🎯 Topics Debated (${progress.topicsDebated.length})`,
      ``,
      progress.topicsDebated.map(t => `- ${t}`).join("\n"),
      ``,
      `### 💡 Improvement Areas`,
      ``,
      improvementText,
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── build_argument ────────────────────────────────────────────────────────

server.tool(
  "build_argument",
  "Argument Builder Mode: For students who don't know where to start. Provide a rough thought and get Socratic scaffolding questions to develop it into a strong argument.",
  {
    sessionId: z.string().describe("The session ID from start_debate"),
    thought: z
      .string()
      .describe("Your rough idea or belief about the topic, however unformed"),
  },
  async ({ sessionId, thought }) => {
    const session = getSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: `Session \`${sessionId}\` not found. Start a debate with \`start_debate\` first.`,
          },
        ],
      };
    }

    const scaffold = await scaffoldArgument({
      proposition: session.proposition,
      position: session.currentPosition,
      userThought: thought,
    });

    const output = [
      `## 🏗️ Argument Builder`,
      ``,
      `**Your thought:** "${thought}"`,
      ``,
      `**Hint:** ${scaffold.hint}`,
      ``,
      `### Socratic Questions to Develop This Argument`,
      ``,
      `Think through these questions to strengthen your argument before submitting it:`,
      ``,
      scaffold.questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
      ``,
      `Once you've thought through these, use \`submit_argument\` to submit your refined version!`,
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── get_fallacy_guide ─────────────────────────────────────────────────────

server.tool(
  "get_fallacy_guide",
  "Get a comprehensive guide to the 20 logical fallacies that debate-coach detects. Optionally get details on a specific fallacy.",
  {
    fallacyType: z
      .string()
      .optional()
      .describe(
        "Specific fallacy type to look up (e.g., 'ad_hominem', 'straw_man'). Leave blank for full guide."
      ),
  },
  async ({ fallacyType }) => {
    if (fallacyType) {
      const fallacy = FALLACIES[fallacyType];
      if (!fallacy) {
        const keys = Object.keys(FALLACIES).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `Fallacy type \`${fallacyType}\` not found. Available types:\n${keys}`,
            },
          ],
        };
      }

      const output = [
        `## ${fallacy.name}`,
        ``,
        `**Definition:** ${fallacy.description}`,
        ``,
        `### Examples`,
        fallacy.examples.map(e => `- "${e}"`).join("\n"),
        ``,
        `### How to Avoid It`,
        fallacy.howToAvoid,
      ].join("\n");

      return {
        content: [{ type: "text", text: output }],
      };
    }

    const lines: string[] = [
      `## 📖 Logical Fallacy Guide`,
      ``,
      `debate-coach detects these 20 logical fallacies in real time:`,
      ``,
    ];

    const fallacyList = Object.values(FALLACIES);
    for (let i = 0; i < fallacyList.length; i++) {
      const f = fallacyList[i];
      lines.push(
        `${i + 1}. **${f.name}** (\`${f.type}\`)`,
        `   ${f.description}`,
        ``
      );
    }

    lines.push(
      `*Use \`get_fallacy_guide\` with a \`fallacyType\` parameter for detailed examples and how to avoid each one.*`
    );

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

// ─── Helpers ───────────────────────────────────────────────────────────────

function scoreBar(score: number, max: number): string {
  const pct = Math.min(1, score / max);
  const filled = Math.round(pct * 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// ─── Start server ──────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
