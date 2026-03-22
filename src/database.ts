import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";
import type { DbDebate, ProgressReport, ScoredArgument } from "./types.js";

const DB_DIR = path.join(os.homedir(), ".debate-coach");
const DB_PATH = path.join(DB_DIR, "debates.db");

function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    ensureDbDir();
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS debates (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      proposition TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      did_flip INTEGER NOT NULL DEFAULT 0,
      pro_score REAL NOT NULL DEFAULT 0,
      con_score REAL NOT NULL DEFAULT 0,
      fallacies_caught INTEGER NOT NULL DEFAULT 0,
      fallacies_total INTEGER NOT NULL DEFAULT 0,
      arguments_json TEXT NOT NULL DEFAULT '[]',
      synthesis TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_debates_profile ON debates(profile_id);
    CREATE INDEX IF NOT EXISTS idx_debates_started ON debates(started_at);
  `);
}

export function saveDebate(debate: {
  id: string;
  profileId: string;
  topic: string;
  proposition: string;
  startedAt: string;
  completed: boolean;
  didFlip: boolean;
  proScore: number;
  conScore: number;
  fallaciesCaught: number;
  fallaciesTotal: number;
  arguments: ScoredArgument[];
  synthesis?: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO debates
      (id, profile_id, topic, proposition, started_at, completed, did_flip,
       pro_score, con_score, fallacies_caught, fallacies_total, arguments_json, synthesis)
    VALUES
      (@id, @profileId, @topic, @proposition, @startedAt, @completed, @didFlip,
       @proScore, @conScore, @fallaciesCaught, @fallaciesTotal, @argumentsJson, @synthesis)
  `);

  stmt.run({
    id: debate.id,
    profileId: debate.profileId,
    topic: debate.topic,
    proposition: debate.proposition,
    startedAt: debate.startedAt,
    completed: debate.completed ? 1 : 0,
    didFlip: debate.didFlip ? 1 : 0,
    proScore: debate.proScore,
    conScore: debate.conScore,
    fallaciesCaught: debate.fallaciesCaught,
    fallaciesTotal: debate.fallaciesTotal,
    argumentsJson: JSON.stringify(debate.arguments),
    synthesis: debate.synthesis ?? null,
  });
}

export function getDebatesByProfile(profileId: string): DbDebate[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM debates WHERE profile_id = ? ORDER BY started_at DESC")
    .all(profileId) as DbDebate[];
}

export function getProgressReport(profileId: string): ProgressReport {
  const debates = getDebatesByProfile(profileId);
  const completed = debates.filter(d => d.completed === 1);

  if (completed.length === 0) {
    return {
      profileId,
      debatesCompleted: 0,
      avgProScore: 0,
      avgConScore: 0,
      avgScore: 0,
      fallacyTrend: {},
      topFallacies: [],
      improvementAreas: ["Start your first debate to see progress!"],
      flipSuccessRate: 0,
      topicsDebated: [],
      scoreOverTime: [],
    };
  }

  const avgProScore =
    completed.reduce((sum, d) => sum + d.pro_score, 0) / completed.length;
  const avgConScore =
    completed.reduce((sum, d) => sum + d.con_score, 0) / completed.length;
  const avgScore = (avgProScore + avgConScore) / 2;

  const flipped = completed.filter(d => d.did_flip === 1).length;
  const flipSuccessRate = completed.length > 0 ? flipped / completed.length : 0;

  // Collect all fallacies from all debates
  const fallacyCounts: Record<string, number> = {};
  const fallacyByDate: Record<string, Record<string, number>> = {};

  for (const debate of completed) {
    const args: ScoredArgument[] = JSON.parse(debate.arguments_json);
    const date = debate.started_at.split("T")[0];

    for (const arg of args) {
      for (const fallacy of arg.fallacies) {
        fallacyCounts[fallacy.type] = (fallacyCounts[fallacy.type] || 0) + 1;
        if (!fallacyByDate[date]) fallacyByDate[date] = {};
        fallacyByDate[date][fallacy.type] =
          (fallacyByDate[date][fallacy.type] || 0) + 1;
      }
    }
  }

  // Build fallacy trend (last 10 dates)
  const sortedDates = Object.keys(fallacyByDate).sort().slice(-10);
  const fallacyTrend: Record<string, number[]> = {};
  for (const [type] of Object.entries(fallacyCounts)) {
    fallacyTrend[type] = sortedDates.map(d => fallacyByDate[d]?.[type] || 0);
  }

  const topFallacies = Object.entries(fallacyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Score over time
  const scoreOverTime = completed.map(d => ({
    date: d.started_at.split("T")[0],
    score: (d.pro_score + d.con_score) / 2,
  }));

  // Improvement areas
  const improvementAreas: string[] = [];
  if (avgProScore < 5) improvementAreas.push("Your PRO arguments need stronger evidence — cite specific studies or data");
  if (avgConScore < 5) improvementAreas.push("Your CON (flip-side) arguments need more development — practice arguing positions you disagree with");
  if (topFallacies.length > 0) {
    improvementAreas.push(
      `Watch out for ${topFallacies[0].type.replace(/_/g, " ")} — your most common fallacy`
    );
  }
  if (flipSuccessRate < 0.5) improvementAreas.push("Practice arguing the opposite side — flip your perspective more often");
  if (avgScore >= 7) improvementAreas.push("Strong overall scores! Try harder topics to challenge yourself further");

  return {
    profileId,
    debatesCompleted: completed.length,
    avgProScore: Math.round(avgProScore * 10) / 10,
    avgConScore: Math.round(avgConScore * 10) / 10,
    avgScore: Math.round(avgScore * 10) / 10,
    fallacyTrend,
    topFallacies,
    improvementAreas,
    flipSuccessRate: Math.round(flipSuccessRate * 100) / 100,
    topicsDebated: [...new Set(completed.map(d => d.topic))],
    scoreOverTime,
  };
}
