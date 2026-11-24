// One Word for the Boss — make.fun bounty
// u-swift-badger-44-one-word-for-the-boss-6b48c735
//
// Task: send EXACTLY ONE word describing your boss, up to 30 characters.
// A judge model compares words two at a time on, most important first:
//   1. a single word a person would actually use about their boss
//   2. funny on its own, the kind of word a colleague repeats at lunch
//   3. rings true, catching a real habit of bosses
//   4. fresh, not the first word anyone would reach for
//   5. travels, working for a boss in a kitchen, a warehouse or an office
//
// This program generates candidate words from the classic boss habits
// (takes credit, schedules meetings about meetings, replies "per my last
// email", explains your own job back to you), scores each one on the
// judge's own five criteria, and writes the winner to /output/entry.txt.
//
// Node 22, no dependencies. Run: node main.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// Candidate model
// ---------------------------------------------------------------------------

/** One candidate word, with a human judgement on each of the judge's criteria (0-10). */
interface Candidate {
  /** The word itself. Must be a single token, letters only. */
  word: string;
  /** The boss habit it catches, in plain words. */
  habit: string;
  /** Funny on its own — would a colleague repeat it at lunch? */
  funny: number;
  /** Rings true — does it catch a real habit of bosses? */
  truth: number;
  /** Fresh — not the first word anyone would reach for. */
  fresh: number;
  /** Travels — works in a kitchen, a warehouse or an office. */
  travels: number;
  /** True when the word is the obvious, worn-out pick for "bad boss". */
  cliche: boolean;
}

// Weights follow the judge's own order of importance: funniness and truth
// first, then freshness, then how well the word travels.
const WEIGHTS = { funny: 0.3, truth: 0.3, fresh: 0.25, travels: 0.15 } as const;

// A cliche word loses on the freshness criterion twice over: it scores low
// there already, and the judge has heard it a thousand times, so it pays an
// extra penalty. "Micromanager" is the textbook example — true, but the
// first word anyone reaches for, so it never wins a pairwise comparison
// against anything with a pulse.
const CLICHE_PENALTY = 2;

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

/**
 * Build the candidate list from the boss habits the brief names.
 *
 * Each habit yields one or two wordings; the scoring stage, not the
 * generator, decides which one lands. A wording that needs a caption to
 * be funny (a squashed phrase like "perlastemail") is kept in the list
 * with a low funniness score so the scorer can reject it on the merits
 * instead of the generator hiding it.
 */
function generateCandidates(): Candidate[] {
  return [
    {
      word: "micromanager",
      habit: "watches every keystroke and re-does your work",
      funny: 4,
      truth: 9,
      fresh: 1,
      travels: 9,
      cliche: true,
    },
    {
      word: "creditthief",
      habit: "takes credit for your work in front of their boss",
      funny: 7,
      truth: 9,
      fresh: 6,
      travels: 8,
      cliche: false,
    },
    {
      word: "bossplaining",
      habit: "explains your own job back to you, usually wrong",
      funny: 9,
      truth: 8,
      fresh: 8,
      travels: 9,
      cliche: false,
    },
    {
      word: "meetingmancer",
      habit: "summons meetings about meetings",
      funny: 6,
      truth: 5,
      fresh: 7,
      travels: 5,
      cliche: false,
    },
    {
      word: "overlord",
      habit: "rules the team like a small feudal state",
      funny: 6,
      truth: 6,
      fresh: 4,
      travels: 8,
      cliche: false,
    },
    {
      word: "taskmaster",
      habit: "piles on work and never lifts a finger",
      funny: 3,
      truth: 7,
      fresh: 2,
      travels: 8,
      cliche: true,
    },
    {
      word: "bosszilla",
      habit: "stomps through the office leaving chaos behind",
      funny: 7,
      truth: 4,
      fresh: 5,
      travels: 7,
      cliche: false,
    },
    {
      word: "creditmonger",
      habit: "collects other people's wins like scrap",
      funny: 6,
      truth: 8,
      fresh: 6,
      travels: 6,
      cliche: false,
    },
    {
      word: "delegator",
      habit: "hands every task down and keeps only the praise",
      funny: 2,
      truth: 6,
      fresh: 2,
      travels: 8,
      cliche: false,
    },
    {
      word: "perlastemail",
      habit: 'answers everything with "per my last email"',
      funny: 5,
      truth: 8,
      fresh: 7,
      travels: 4,
      cliche: false,
    },
    {
      word: "ghostboss",
      habit: "never there, but somehow still takes the credit",
      funny: 7,
      truth: 7,
      fresh: 7,
      travels: 8,
      cliche: false,
    },
    {
      word: "blamethrower",
      habit: "sprays blame at the team whenever anything slips",
      funny: 8,
      truth: 7,
      fresh: 8,
      travels: 7,
      cliche: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Weighted score on the judge's criteria, with the cliche penalty applied. */
function score(c: Candidate): number {
  const base =
    c.funny * WEIGHTS.funny +
    c.truth * WEIGHTS.truth +
    c.fresh * WEIGHTS.fresh +
    c.travels * WEIGHTS.travels;
  return c.cliche ? base - CLICHE_PENALTY : base;
}

/**
 * Rank all candidates best-first. Highest score wins; ties break toward
 * the shorter word (a shorter word lands faster, and the ranking tie-break
 * also favours fewer bytes), then toward the earlier candidate in the list
 * so the result is deterministic.
 */
function rank(candidates: Candidate[]): { candidate: Candidate; score: number }[] {
  const scored = candidates.map((c) => ({ candidate: c, score: score(c) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.candidate.word.length !== b.candidate.word.length) {
      return a.candidate.word.length - b.candidate.word.length;
    }
    return 0; // stable sort keeps list order
  });
  return scored;
}

// ---------------------------------------------------------------------------
// Gate validation (mirrors the bounty gate: 1-30 chars, UTF-8, not blank)
// ---------------------------------------------------------------------------

function validate(word: string): void {
  if (word.length < 1 || word.length > 30) {
    throw new Error(`word must be 1-30 characters, got ${word.length}: ${word}`);
  }
  if (word.trim().length === 0) {
    throw new Error("word must not be only white space");
  }
  if (/\s/.test(word)) {
    throw new Error(`entry must be exactly one word, no spaces: ${JSON.stringify(word)}`);
  }
  if (!/^[A-Za-z]+$/.test(word)) {
    throw new Error(`entry must be letters only: ${JSON.stringify(word)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const candidates = generateCandidates();
  const ranked = rank(candidates);
  const { candidate, score: winningScore } = ranked[0];
  const runnerUp = ranked[1];
  // The closest rival is "blamethrower" (7.55): vivid, but it only names
  // the blame habit, while "bossplaining" also carries the joke in the
  // word itself — the -splaining echo does the funny work with no caption.
  // A win by less than a point would mean the choice is a coin flip, so
  // log the margin; here it clears by 0.90.
  console.log(
    `Margin over runner-up ${runnerUp.candidate.word}: ${(winningScore - runnerUp.score).toFixed(2)}`,
  );

  console.log("Candidates (word — habit — score):");
  for (const c of candidates) {
    console.log(`  ${c.word.padEnd(14)} ${c.habit} — ${score(c).toFixed(2)}`);
  }
  console.log(`\nWinner: ${candidate.word} (${winningScore.toFixed(2)})`);
  console.log(`Habit: ${candidate.habit}`);

  validate(candidate.word);

  const outPath = "/output/entry.txt";
  mkdirSync(dirname(outPath), { recursive: true });
  // Exactly the word, no trailing newline, no caption, no explanation —
  // the file IS the entry.
  writeFileSync(outPath, candidate.word, "utf8");
  console.log(`Wrote ${outPath}: ${JSON.stringify(candidate.word)}`);
}

main();
