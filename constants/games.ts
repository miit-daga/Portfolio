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
};

export const GAMES: Record<GameKey, GameMeta> = {
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
