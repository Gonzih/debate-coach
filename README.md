# debate-coach

> An MCP server that trains critical thinking by making students argue both sides of any topic, catching logical fallacies in real time, scoring argument quality, and teaching the difference between an opinion and a reasoned position.

[![npm](https://img.shields.io/npm/v/@gonzih/debate-coach)](https://www.npmjs.com/package/@gonzih/debate-coach)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## The Dream

A 16-year-old says *"I think social media should be banned for under 18s."*

Instead of agreeing or disagreeing, the AI says: *"Interesting. Make your case — give me your 3 strongest arguments."*

The student argues. The AI rates each argument:
- *"Argument 1: solid (evidence-based)."*
- *"Argument 2: weak (anecdotal, logical fallacy: hasty generalization)."*
- *"Argument 3: strong."*

Then: *"Now flip sides. Argue against your own position as convincingly as you can."*

This is how lawyers are trained. This is how scientists think. This is how good citizens reason.

---

## What It Does

### 1. Argument Quality Scoring (0–10 per argument)
Each argument is scored on four dimensions:
- **Evidence (0–3):** Factual backing — studies, data, expert consensus
- **Logic (0–3):** Soundness — no fallacies, valid reasoning
- **Relevance (0–2):** Does it actually support the proposition?
- **Originality (0–2):** Nuanced insight vs. generic platitude

### 2. Real-Time Logical Fallacy Detection
Detects 20 logical fallacies including:
- Ad hominem, straw man, false dichotomy
- Slippery slope, hasty generalization, appeal to authority
- Post hoc (correlation ≠ causation), cherry picking, and 12 more

### 3. Steel-Manning
After you argue your side, the AI presents the *strongest possible opposing argument* — not a strawman. This prepares you for the flip challenge and teaches genuine intellectual honesty.

### 4. Mandatory Flip-Sides Exercise
You must argue the *opposite* of your original position. This is the hardest and most valuable part. It teaches:
- Epistemic humility
- Understanding of opposing views
- How to construct genuinely compelling arguments you disagree with

### 5. 50+ Curated Debate Topics
Categories: Social/Ethical, Science/Environment, Politics/Policy, Philosophy/Values, Technology, Historical, Economics, Health

### 6. Progress Tracking
- Fallacy rate over time: *"You used hasty generalization 8 times 3 weeks ago, 2 times this week"*
- Average argument score trend
- Topics breadth
- Flip success rate

---

## Installation

```bash
npm install -g @gonzih/debate-coach
```

Or use with `npx`:
```bash
npx @gonzih/debate-coach
```

---

## MCP Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "debate-coach": {
      "command": "npx",
      "args": ["@gonzih/debate-coach"]
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "debate-coach": {
      "command": "debate-coach"
    }
  }
}
```

---

## MCP Tools

### `start_debate`
```
start_debate({ profileId, topic?, position? })
→ { proposition, sessionId, instructions }
```
Start a new debate session. The AI frames your topic as a proper debate proposition.

### `submit_argument`
```
submit_argument({ sessionId, argument })
→ { score, fallacies[], feedback, strengtheningSuggestion }
```
Submit an argument. Get scored on evidence/logic/relevance/originality and fallacy-checked.

### `get_steelman`
```
get_steelman({ sessionId })
→ { steelman, keyCounterArguments[] }
```
After 3+ PRO arguments: see the strongest possible case against your position.

### `flip_sides`
```
flip_sides({ sessionId })
→ { prompt, newPosition }
```
Switch to arguing the opposite side.

### `complete_debate`
```
complete_debate({ sessionId })
→ { synthesis, scores, fallaciesDetected }
```
Finalize the debate and receive a synthesis of both sides.

### `build_argument`
```
build_argument({ sessionId, thought })
→ { questions[], hint }
```
Argument Builder Mode: Socratic scaffolding for students who don't know where to start.

### `get_topic_list`
```
get_topic_list({ category?, ageGroup?, difficulty? })
→ Topic[]
```
Browse 50+ curated debate topics.

### `get_progress`
```
get_progress({ profileId })
→ { debatesCompleted, avgScore, fallacyTrend, improvementAreas, ... }
```
View progress over time.

### `get_fallacy_guide`
```
get_fallacy_guide({ fallacyType? })
→ Fallacy guide or specific fallacy detail
```
Learn about the 20 logical fallacies the system detects.

---

## Debate Flow

```
start_debate
    ↓
submit_argument  ×3-5  (PRO phase)
    ↓
get_steelman           (see opposing case)
    ↓
flip_sides             (switch positions)
    ↓
submit_argument  ×3-5  (CON phase)
    ↓
complete_debate        (synthesis + scoring)
    ↓
get_progress           (track improvement)
```

---

## The Socratic Method Connection

Socrates never stated opinions — he asked questions until his interlocutors discovered contradictions in their own positions. The *elenchus* (cross-examination) was designed not to teach facts but to develop the capacity for rigorous thinking.

debate-coach uses the same approach: it doesn't tell you what to think, it forces you to *defend* what you think — and then defend the opposite.

---

## Debate Formats Supported Conceptually

### Lincoln-Douglas (LD) Debate
One-on-one. Values-focused. Emphasizes philosophical and ethical clash. Perfect for the philosophical and policy topics in the topic list.

**Structure adapted here:** PRO arguments → Steel-man → CON arguments → Synthesis

### Oxford-Style Debate
Motion-based. Audience votes before and after. The Oxford format's key insight: you must be able to articulate *why* the other side is reasonable before you can effectively argue against it. This is exactly what the steel-man step provides.

### Karl Popper Format
Teams of three argue competing positions. Focus on cross-examination. The Karl Popper format explicitly teaches students to attack *the strongest version* of the opposition — which is the steel-manning principle.

---

## Classroom Integration Guide

### Individual Practice
Students use debate-coach independently to prepare for class discussions. The progress tracking helps teachers see who is improving.

### Paired Debate Prep
Two students start debates on the same topic but opposite sides. They compare their steel-mans — seeing how well each predicted the other's actual arguments.

### Flipped Classroom
Assign debate-coach sessions as homework. Class time is spent discussing: *"What surprised you when you had to argue the other side?"*

### Formative Assessment
Use `get_progress` to track:
- Which fallacies students commit most
- Score improvement over the term
- Whether students attempt the flip challenge

### Discussion Starter
After completing a debate session, share the synthesis in class. Use it as a jumping-off point: *"The AI says the core tension here is X vs. Y — do you agree?"*

---

## Progress Data Storage

Debate history is stored locally in `~/.debate-coach/debates.db` (SQLite). No data is sent to any server. API calls are made only to Anthropic's Claude API for AI-powered scoring and analysis.

---

## Requirements

- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable

---

## License

MIT © Gonzih
