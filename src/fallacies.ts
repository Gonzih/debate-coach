export interface FallacyDefinition {
  type: string;
  name: string;
  description: string;
  examples: string[];
  howToAvoid: string;
}

export const FALLACIES: Record<string, FallacyDefinition> = {
  ad_hominem: {
    type: "ad_hominem",
    name: "Ad Hominem",
    description: "Attacking the person making the argument instead of the argument itself",
    examples: [
      "You can't trust their climate research — they drive a gas car.",
      "His opinion on taxes doesn't matter, he's never run a business.",
    ],
    howToAvoid: "Critique the argument's evidence and reasoning, not the person.",
  },
  straw_man: {
    type: "straw_man",
    name: "Straw Man",
    description: "Misrepresenting an opponent's position to make it easier to attack",
    examples: [
      "They want gun control, so they want to leave everyone defenseless.",
      "She said we should eat less meat, so she wants to ban all animal products.",
    ],
    howToAvoid: "Engage with the actual argument as stated, not an exaggerated version.",
  },
  false_dichotomy: {
    type: "false_dichotomy",
    name: "False Dichotomy",
    description: "Presenting only two options when more exist (also: false dilemma)",
    examples: [
      "You're either with us or against us.",
      "Either we ban social media or teen depression will keep rising.",
    ],
    howToAvoid: "Acknowledge the full spectrum of options and nuance.",
  },
  slippery_slope: {
    type: "slippery_slope",
    name: "Slippery Slope",
    description: "Assuming one event inevitably leads to extreme outcomes without sufficient evidence",
    examples: [
      "If we allow same-sex marriage, next people will want to marry animals.",
      "If students get phones in class, no one will learn anything ever again.",
    ],
    howToAvoid: "Show causal links between steps; don't assume runaway effects.",
  },
  hasty_generalization: {
    type: "hasty_generalization",
    name: "Hasty Generalization",
    description: "Drawing broad conclusions from insufficient or unrepresentative evidence",
    examples: [
      "My cousin tried the keto diet and gained weight, so keto doesn't work.",
      "Three teens I know are addicted to TikTok, so all teens are addicted to social media.",
    ],
    howToAvoid: "Use representative samples and acknowledge exceptions.",
  },
  appeal_to_authority: {
    type: "appeal_to_authority",
    name: "Appeal to Authority",
    description: "Using authority as the sole evidence without supporting reasoning",
    examples: [
      "Dr. X said it's true, so it must be.",
      "Einstein believed in God, therefore God exists.",
    ],
    howToAvoid: "Cite authorities as supporting evidence, but provide the actual reasoning too.",
  },
  appeal_to_emotion: {
    type: "appeal_to_emotion",
    name: "Appeal to Emotion",
    description: "Using emotional manipulation instead of logical reasoning",
    examples: [
      "Think of the children! We must ban this immediately.",
      "How can you support this policy when people are suffering?",
    ],
    howToAvoid: "Ground your argument in evidence; emotions can support but not replace logic.",
  },
  circular_reasoning: {
    type: "circular_reasoning",
    name: "Circular Reasoning",
    description: "Using the conclusion as a premise (begging the question)",
    examples: [
      "The Bible is true because it says so in the Bible.",
      "Social media is harmful because it causes harm.",
    ],
    howToAvoid: "Ensure your premises are independent from your conclusion.",
  },
  red_herring: {
    type: "red_herring",
    name: "Red Herring",
    description: "Introducing irrelevant information to distract from the actual issue",
    examples: [
      "We shouldn't worry about climate change when people are dying of poverty.",
      "Why focus on school uniforms when teachers are underpaid?",
    ],
    howToAvoid: "Stay on topic; address the specific claim at hand.",
  },
  bandwagon: {
    type: "bandwagon",
    name: "Bandwagon (Appeal to Popularity)",
    description: "Claiming something is true or right because many people believe it",
    examples: [
      "Everyone is buying organic food, so it must be healthier.",
      "Millions of people believe vaccines are harmful, so there must be something to it.",
    ],
    howToAvoid: "Popularity doesn't equal truth; provide evidence independent of consensus.",
  },
  false_equivalence: {
    type: "false_equivalence",
    name: "False Equivalence",
    description: "Treating two significantly different things as if they were equal",
    examples: [
      "Hitler was a vegetarian and so is she — they're basically the same.",
      "Jaywalking and murder are both crimes, so they deserve similar punishments.",
    ],
    howToAvoid: "Acknowledge the meaningful differences between the things you're comparing.",
  },
  appeal_to_nature: {
    type: "appeal_to_nature",
    name: "Appeal to Nature",
    description: "Claiming something is good or right because it is natural",
    examples: [
      "Herbal medicine is better than pharmaceuticals because it's natural.",
      "Homosexuality is wrong because it doesn't occur in nature.",
    ],
    howToAvoid: "Natural ≠ good; unnatural ≠ bad. Evaluate on actual merits.",
  },
  anecdotal_evidence: {
    type: "anecdotal_evidence",
    name: "Anecdotal Evidence",
    description: "Using personal experience or isolated stories instead of systematic evidence",
    examples: [
      "My grandfather smoked his whole life and lived to 95, so smoking isn't that bad.",
      "I know someone who was cured by homeopathy, so it works.",
    ],
    howToAvoid: "Individual stories can illustrate points but need systematic data to prove them.",
  },
  post_hoc: {
    type: "post_hoc",
    name: "Post Hoc (Correlation ≠ Causation)",
    description: "Assuming causation from correlation or sequence",
    examples: [
      "After we introduced the new policy, crime went up — so the policy caused crime.",
      "Teen depression rose after smartphones became common, so smartphones cause depression.",
    ],
    howToAvoid: "Show a plausible causal mechanism; account for confounding variables.",
  },
  tu_quoque: {
    type: "tu_quoque",
    name: "Tu Quoque (Appeal to Hypocrisy)",
    description: "Deflecting a criticism by pointing to the opponent's flaws or inconsistencies",
    examples: [
      "You tell me to exercise more, but you're out of shape yourself.",
      "Politicians shouldn't lecture us on taxes — they all dodge them anyway.",
    ],
    howToAvoid: "The critic's behavior doesn't affect the validity of their argument.",
  },
  loaded_question: {
    type: "loaded_question",
    name: "Loaded Question",
    description: "Asking a question with a false or controversial assumption built in",
    examples: [
      "Have you stopped cheating on your exams yet?",
      "Why do young people today have no work ethic?",
    ],
    howToAvoid: "Challenge the hidden assumption before answering.",
  },
  appeal_to_tradition: {
    type: "appeal_to_tradition",
    name: "Appeal to Tradition",
    description: "Arguing that something is right or good because it has always been done that way",
    examples: [
      "We've always had standardized tests — why change now?",
      "Marriage has always been between a man and a woman.",
    ],
    howToAvoid: "Ask whether the tradition still serves its original purpose in today's context.",
  },
  no_true_scotsman: {
    type: "no_true_scotsman",
    name: "No True Scotsman",
    description: "Dismissing counterexamples by arbitrarily redefining terms",
    examples: [
      "No real socialist would support that policy.",
      "No true feminist would say that.",
    ],
    howToAvoid: "Define your terms clearly upfront and don't shift them to exclude counterexamples.",
  },
  moving_goalposts: {
    type: "moving_goalposts",
    name: "Moving the Goalposts",
    description: "Changing the requirements for evidence or proof after they have been met",
    examples: [
      "Show me one study. [Study provided.] Well, show me 10 studies. [Done.] Well, they're all biased.",
      "If you can get 1000 signatures, we'll consider it. [Done.] Well, 1000 isn't really enough.",
    ],
    howToAvoid: "Agree on standards of evidence before the debate begins.",
  },
  cherry_picking: {
    type: "cherry_picking",
    name: "Cherry Picking",
    description: "Selecting only supporting evidence while ignoring contrary evidence",
    examples: [
      "Three studies show my supplement works! (ignoring 20 that show it doesn't)",
      "Unemployment fell this quarter! (while ignoring wage stagnation and underemployment)",
    ],
    howToAvoid: "Engage with the totality of evidence, including evidence against your position.",
  },
};

export const FALLACY_LIST = Object.values(FALLACIES);

export const FALLACY_NAMES_FOR_PROMPT = FALLACY_LIST
  .map(f => `- ${f.type}: "${f.description}"`)
  .join("\n");
