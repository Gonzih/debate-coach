export interface ArgumentScore {
  evidence: number;   // 0-3
  logic: number;      // 0-3
  relevance: number;  // 0-2
  originality: number; // 0-2
  total: number;      // 0-10
}

export interface FallacyDetection {
  type: string;
  name: string;
  description: string;
  explanation: string;
  quote?: string;
}

export interface ScoredArgument {
  text: string;
  score: ArgumentScore;
  fallacies: FallacyDetection[];
  feedback: string;
  strengtheningSuggestion: string;
  timestamp: string;
}

export type DebatePhase =
  | "PRO_ARGUMENTS"
  | "STEELMAN_READY"
  | "FLIP_READY"
  | "CON_ARGUMENTS"
  | "SYNTHESIS_READY"
  | "COMPLETED";

export interface DebateSession {
  id: string;
  profileId: string;
  topic: string;
  proposition: string;
  startedAt: string;
  phase: DebatePhase;
  proPosition: string;
  conPosition: string;
  currentPosition: string;
  proArguments: ScoredArgument[];
  conArguments: ScoredArgument[];
  steelman?: string;
  keyCounterArguments?: string[];
  synthesis?: string;
}

export interface Topic {
  id: string;
  title: string;
  proposition: string;
  category: string;
  ageGroup: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

export interface ProgressReport {
  profileId: string;
  debatesCompleted: number;
  avgProScore: number;
  avgConScore: number;
  avgScore: number;
  fallacyTrend: Record<string, number[]>;
  topFallacies: Array<{ type: string; count: number }>;
  improvementAreas: string[];
  flipSuccessRate: number;
  topicsDebated: string[];
  scoreOverTime: Array<{ date: string; score: number }>;
}

export interface DbDebate {
  id: string;
  profile_id: string;
  topic: string;
  proposition: string;
  started_at: string;
  completed: number;
  did_flip: number;
  pro_score: number;
  con_score: number;
  fallacies_caught: number;
  fallacies_total: number;
  arguments_json: string;
  synthesis: string | null;
}
