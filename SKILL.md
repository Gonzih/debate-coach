# debate-coach Skill Guide

## What Is This?
debate-coach is an MCP server that trains critical thinking through structured debate. It implements the Socratic method digitally: instead of telling you what to think, it forces you to defend what you think — and then defend the opposite.

## Quick Start

### 1. Start a Debate
```
Use the start_debate tool with:
- profileId: "student_alice"
- topic: "Social media should be banned for users under 18"
```

### 2. Submit Arguments (PRO side first)
```
Use submit_argument with your sessionId and each argument.
Example: "Multiple peer-reviewed studies, including the Haidt/Twenge research,
show strong correlations between heavy social media use and increased rates of
anxiety and depression in adolescent girls."
```

### 3. Get the Steel-Man
```
After 3+ arguments, call get_steelman to see the strongest opposing case.
This is essential preparation for the flip challenge.
```

### 4. Flip Sides
```
Call flip_sides to switch to arguing AGAINST your original position.
This is the hardest and most valuable part.
```

### 5. Submit CON Arguments
```
Submit 3-5 arguments against the proposition using submit_argument.
```

### 6. Complete & Synthesize
```
Call complete_debate to receive your final synthesis and save progress.
```

## Argument Builder Mode (For Beginners)
If you don't know where to start:
```
Call build_argument with:
- sessionId: your session ID
- thought: "I think social media is bad but I don't know why exactly"
```
You'll receive Socratic questions to develop your rough thought into a strong argument.

## Browse Topics
```
Call get_topic_list to browse 50+ curated topics.
Filter by category: social, science, policy, philosophy, technology, historical, economics, health
Filter by difficulty: easy, medium, hard
Filter by ageGroup: teens, general
```

## Track Progress
```
Call get_progress with your profileId to see:
- Score improvement over time
- Which logical fallacies you commit most
- Flip success rate
- Topics debated
```

## What Makes a Good Argument?
A strong argument (7+/10) has:
- **Specific evidence**: Not just "studies show" but "the 2019 Twenge et al. meta-analysis of..."
- **Logical structure**: Premise → Reasoning → Conclusion with no gaps
- **Relevance**: Directly addresses the proposition, not a tangent
- **Nuance**: Goes beyond the obvious — acknowledge complexity

## Common Mistakes to Avoid
1. **Anecdotal evidence**: "My cousin tried X and it worked" — use systematic data
2. **Hasty generalization**: "Three examples prove all cases" — be careful with scale
3. **False dichotomy**: "Either we do X or catastrophe" — more options usually exist
4. **Post hoc**: "A happened, then B happened, so A caused B" — correlation ≠ causation
5. **Appeal to emotion**: Emotional language without supporting logic

## Learning Outcomes
After regular use of debate-coach, students develop:
- Ability to construct evidence-based arguments
- Recognition of logical fallacies in real-world discourse (news, politics, advertising)
- Intellectual empathy — understanding why reasonable people disagree
- Comfort arguing positions they personally disagree with
- Awareness of their own cognitive biases
