// The arcade's games, and the highest score each can actually emit.
//
// These ceilings are the server's only defence on the leaderboard. Scores are
// produced on the client and always will be, so nothing here makes them
// trustworthy; it only keeps a one-line curl from putting 9,999,999 at the top
// of every board.
//
// Two are derived from the games' own mechanics. The rest sit far past any
// plausible human run, deliberately: rejecting a real score costs more than
// accepting a fake one.

export type GameKey =
  | "asteroid-run"
  | "stack-station"
  | "assist-daily"
  | "assist-mission"
  | "run-daily"
  | "stack-daily"
  | "free-flight"
  | "flight-daily"
  | "snake"
  | "invaders"
  | "dodge"
  | "tetris"
  | "typing"
  | "flappy"
  | "defense";

export type GameMeta = {
  label: string;
  /** localStorage key the terminal writes its personal best to. */
  storageKey: string;
  max: number;
  /** Shown when a score is rejected, so the limit is never arbitrary. */
  why: string;
  /** The 3D arcade's boards (app/arcade): kept out of the terminal's list,
   *  signed with initials (so grouped by player, not by name). */
  arcade?: boolean;
  /** Lower is better (a time). */
  lower?: boolean;
};

export const GAMES: Record<GameKey, GameMeta> = {
  "asteroid-run": {
    label: "Asteroid Run",
    storageKey: "arcade-run-best",
    // at most about 90 points a second flat out, boosts and fragments included
    max: 400000,
    why: "that is over an hour flat out without a scratch",
    arcade: true,
  },
  "stack-station": {
    label: "Stack the Station",
    storageKey: "arcade-stack-best",
    max: 5000,
    why: "that is a module a second for well over an hour",
    arcade: true,
  },
  "assist-daily": {
    label: "Gravity Assist, today's sky",
    storageKey: "arcade-assist-daily",
    // a flight's time in hundredths of a second, checked by flying it again
    max: 4000,
    why: "a flight gives up after 40 seconds",
    arcade: true,
    lower: true,
  },
  "assist-mission": {
    label: "Gravity Assist, a mission",
    storageKey: "arcade-assist-mission",
    // a flight's time in hundredths, checked by flying it again, per mission
    max: 4000,
    why: "a flight gives up after 40 seconds",
    arcade: true,
    lower: true,
  },
  "run-daily": {
    label: "Asteroid Run, today's field",
    storageKey: "arcade-run-daily",
    max: 400000,
    why: "that is over an hour flat out without a scratch",
    arcade: true,
  },
  "stack-daily": {
    label: "Stack the Station, today's station",
    storageKey: "arcade-stack-daily",
    max: 5000,
    why: "that is a module a second for well over an hour",
    arcade: true,
  },
  "free-flight": {
    label: "Asteroid Run, free flight",
    storageKey: "arcade-flight-best",
    // at most about 5 points a second flat out, plus a ring every few seconds
    max: 400000,
    why: "that is several hours flat out without a scratch",
    arcade: true,
  },
  "flight-daily": {
    label: "Free flight, today's field",
    storageKey: "arcade-flight-daily",
    max: 400000,
    why: "that is several hours flat out without a scratch",
    arcade: true,
  },
  snake: {
    label: "Snake",
    storageKey: "snake-highscore",
    max: 483,
    why: "the grid is 22 by 22, so 483 is literally every cell",
  },
  defense: {
    label: "Defense Mode",
    storageKey: "defense-highscore",
    // A frame-stepped simulation of the spawn ramp gives exactly 36 asteroids
    // in the 45s session, so a perfect round is 360. The cap sits above that.
    max: 400,
    why: "the session is 45 seconds and only 36 asteroids can spawn, at 10 points each",
  },
  flappy: {
    label: "Flappy Rocket",
    storageKey: "flappy-highscore",
    max: 2200,
    why: "columns arrive every 1.65s, so that is an hour of unbroken flight",
  },
  dodge: {
    label: "Meteor Dodge",
    storageKey: "dodge-highscore",
    max: 36000,
    why: "the counter ticks ten a second, so that is an hour without a scratch",
  },
  invaders: {
    label: "Invaders",
    storageKey: "invaders-highscore",
    max: 100000,
    why: "that is ten thousand aliens",
  },
  typing: {
    label: "Typing",
    storageKey: "typing-highscore",
    max: 100000,
    why: "roughly fifteen thousand words, none of them mistyped",
  },
  tetris: {
    label: "Tetris",
    storageKey: "tetris-highscore",
    max: 2000000,
    why: "more lines than the piece bag has ever produced",
  },
};

export const GAME_KEYS = Object.keys(GAMES) as GameKey[];

export function isGameKey(v: unknown): v is GameKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(GAMES, v);
}
