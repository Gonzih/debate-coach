import { randomUUID } from "crypto";
import type { DebateSession, DebatePhase, ScoredArgument } from "./types.js";

// In-memory session store
const sessions = new Map<string, DebateSession>();

export function createSession(params: {
  profileId: string;
  topic: string;
  proposition: string;
  position?: string;
}): DebateSession {
  const id = randomUUID();
  const proPosition = params.position ?? "FOR the proposition";
  const conPosition = "AGAINST the proposition";

  const session: DebateSession = {
    id,
    profileId: params.profileId,
    topic: params.topic,
    proposition: params.proposition,
    startedAt: new Date().toISOString(),
    phase: "PRO_ARGUMENTS",
    proPosition,
    conPosition,
    currentPosition: proPosition,
    proArguments: [],
    conArguments: [],
  };

  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): DebateSession | undefined {
  return sessions.get(sessionId);
}

export function addArgument(
  sessionId: string,
  argument: ScoredArgument
): DebateSession {
  const session = requireSession(sessionId);

  if (
    session.phase === "PRO_ARGUMENTS" ||
    session.phase === "STEELMAN_READY"
  ) {
    session.proArguments.push(argument);
    // After 3+ arguments, mark steelman as ready
    if (session.proArguments.length >= 3) {
      session.phase = "STEELMAN_READY";
    }
  } else if (
    session.phase === "CON_ARGUMENTS" ||
    session.phase === "SYNTHESIS_READY"
  ) {
    session.conArguments.push(argument);
    if (session.conArguments.length >= 3) {
      session.phase = "SYNTHESIS_READY";
    }
  }

  sessions.set(sessionId, session);
  return session;
}

export function setSteeleman(
  sessionId: string,
  steelman: string,
  keyCounterArguments: string[]
): DebateSession {
  const session = requireSession(sessionId);
  session.steelman = steelman;
  session.keyCounterArguments = keyCounterArguments;
  session.phase = "FLIP_READY";
  sessions.set(sessionId, session);
  return session;
}

export function flipSides(sessionId: string): DebateSession {
  const session = requireSession(sessionId);
  if (session.phase !== "FLIP_READY") {
    throw new Error(
      `Cannot flip sides in phase: ${session.phase}. First call get_steelman.`
    );
  }
  session.phase = "CON_ARGUMENTS";
  session.currentPosition = session.conPosition;
  sessions.set(sessionId, session);
  return session;
}

export function setSynthesis(
  sessionId: string,
  synthesis: string
): DebateSession {
  const session = requireSession(sessionId);
  session.synthesis = synthesis;
  session.phase = "COMPLETED";
  sessions.set(sessionId, session);
  return session;
}

export function completeSession(sessionId: string): DebateSession {
  const session = requireSession(sessionId);
  session.phase = "COMPLETED";
  sessions.set(sessionId, session);
  return session;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

function requireSession(sessionId: string): DebateSession {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(
      `Session ${sessionId} not found. Start a new debate with start_debate.`
    );
  }
  return session;
}

export function getSessionStats(session: DebateSession): {
  proScore: number;
  conScore: number;
  fallaciesCaught: number;
  fallaciesTotal: number;
  didFlip: boolean;
} {
  const proArgs = session.proArguments;
  const conArgs = session.conArguments;

  const avgScore = (args: ScoredArgument[]) =>
    args.length === 0
      ? 0
      : args.reduce((sum, a) => sum + a.score.total, 0) / args.length;

  const allArgs = [...proArgs, ...conArgs];
  const fallaciesTotal = allArgs.reduce(
    (sum, a) => sum + a.fallacies.length,
    0
  );

  return {
    proScore: Math.round(avgScore(proArgs) * 10) / 10,
    conScore: Math.round(avgScore(conArgs) * 10) / 10,
    fallaciesCaught: fallaciesTotal,
    fallaciesTotal,
    didFlip: conArgs.length > 0,
  };
}
