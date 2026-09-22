// Scripted terminal reels for the featured project cards (TerminalReel).
//
// Nothing here executes. Each reel is a replay written from the repo itself:
//   quick-seed, flowsquire, env-guard  - commands from the READMEs, output
//     strings copied from the CLIs' own console.log calls.
//   DriftGuard-ETC  - condensed from the notebook's saved cell output (the
//     drift loop over CIC-IDS2017), numbers unchanged.
//   FitAI-backend, DisMan  - the services are offline, so these are sample
//     runs: real routes, ports and log lines from the code, with an example
//     request and model reply. Their `note` says so in the title bar.
//
// Keyed by GitHub repo name, same as FEATURED in constants/projects.ts. A repo
// with no entry simply renders no reel.

export type ReelTone = "dim" | "ok" | "err" | "warn" | "accent";

export type ReelLine =
  /** Typed character by character after the prompt. */
  | { kind: "cmd"; text: string }
  /** Printed whole once the previous line finishes. */
  | { kind: "out"; text: string; tone?: ReelTone }
  /** A cli-progress style bar that fills, then settles at 100%. */
  | { kind: "bar"; label: string; total: number }
  /** A blank line. */
  | { kind: "gap" };

export type Reel = {
  /** Title bar text, e.g. the working directory. */
  title: string;
  /** Prompt glyph shown before typed commands. Defaults to "$". */
  prompt?: string;
  /** Small right-aligned tag in the title bar. */
  note?: string;
  lines: ReelLine[];
};

export const PROJECT_REELS: Record<string, Reel> = {
  "quick-seed": {
    title: "~/blog-api",
    lines: [
      { kind: "cmd", text: "npx quick-seed seed --schema schema.js" },
      { kind: "out", text: "🌱 Starting the seeding process..." },
      { kind: "out", text: "Database connection established.", tone: "dim" },
      { kind: "out", text: "Seeding order: users -> posts", tone: "accent" },
      { kind: "out", text: "Processing table: users" },
      { kind: "out", text: "Generated 10 records for users.", tone: "dim" },
      { kind: "out", text: "Successfully inserted data into users.", tone: "dim" },
      { kind: "out", text: "Processing table: posts" },
      { kind: "out", text: "Generated 50 records for posts.", tone: "dim" },
      { kind: "out", text: "Successfully inserted data into posts.", tone: "dim" },
      { kind: "bar", label: "Records processed", total: 60 },
      { kind: "out", text: "✅ Seeding completed successfully in 1.84s!", tone: "ok" },
    ],
  },

  flowsquire: {
    title: "~",
    lines: [
      { kind: "cmd", text: "flowsquire start" },
      { kind: "out", text: "🚀 FlowSquire Agent starting..." },
      { kind: "out", text: "📋 Loaded 14 rule(s)", tone: "dim" },
      { kind: "out", text: "  📁 ~/Downloads (13 rule(s))", tone: "dim" },
      { kind: "out", text: "  📁 ~/Downloads/Screenshots (1 rule(s))", tone: "dim" },
      { kind: "out", text: "👁  Watching 2 folder(s)..." },
      { kind: "gap" },
      { kind: "out", text: "📄 invoice_march.pdf" },
      { kind: "out", text: "  → Rule: PDF Invoice Organizer", tone: "accent" },
      { kind: "out", text: "    ✓ MOVE: invoice_march.pdf", tone: "ok" },
      { kind: "out", text: "📄 2601.16163v1.pdf" },
      { kind: "out", text: "  → Rule: PDF arXiv Research Paper Organizer", tone: "accent" },
      { kind: "out", text: "    ✓ MOVE: 2601.16163v1.pdf", tone: "ok" },
    ],
  },

  "env-guard": {
    title: "~/api",
    lines: [
      { kind: "cmd", text: "env-guard validate --schema schema.js" },
      { kind: "out", text: "❌ Validation failed", tone: "err" },
      { kind: "out", text: "Errors found:", tone: "dim" },
      { kind: "out", text: "  1. PORT: Port must be an integer between 1 and 65535" },
      { kind: "out", text: "     Type: FormatError, Value: 99999", tone: "dim" },
      { kind: "out", text: "  2. API_KEY: String must be at least 32 characters long" },
      { kind: "out", text: "     Type: FormatError, Value: abc", tone: "dim" },
      { kind: "cmd", text: "env-guard validate --schema schema.js --env-file .env.local" },
      { kind: "out", text: "✅ Validation successful", tone: "ok" },
      { kind: "out", text: "Validated environment variables:", tone: "dim" },
      { kind: "out", text: "  PORT: 3000 (number)" },
      { kind: "out", text: "  NODE_ENV: production (string)" },
      { kind: "out", text: "  DEBUG: false (boolean)" },
    ],
  },

  "DriftGuard-ETC": {
    title: "DriftGuard_ETC.ipynb",
    prompt: ">>>",
    note: "saved output",
    lines: [
      { kind: "cmd", text: "drift_threshold = 0.17; warm_up_samples = 1000" },
      { kind: "out", text: "Starting drift detection loop with warm-up period of 1000 samples...", tone: "dim" },
      { kind: "out", text: "Warm-up progress: 1000/1000 samples processed.", tone: "dim" },
      { kind: "out", text: "Processing sample 9999... Current Drift Rate: 0.1428" },
      { kind: "out", text: "Processing sample 11999... Current Drift Rate: 0.1591" },
      { kind: "out", text: "Processing sample 13999... Current Drift Rate: 0.1675", tone: "warn" },
      { kind: "out", text: "Drift Detected at sample index: 14334 (Drift Rate: 0.1711)", tone: "err" },
      { kind: "out", text: "   Retraining XGBoost model (multi-class)...", tone: "accent" },
      { kind: "out", text: "Model retrained successfully with XGBoost!", tone: "ok" },
      { kind: "out", text: "  F1-score : 0.9622 before, 0.9785 after", tone: "ok" },
      { kind: "out", text: "Processing sample 14999... Current Drift Rate: 0.0361" },
      { kind: "out", text: "Processing sample 21999... Current Drift Rate: 0.0540" },
    ],
  },

  "FitAI-backend": {
    title: "~/fitai-backend",
    note: "sample run",
    lines: [
      { kind: "cmd", text: "node index.js" },
      { kind: "out", text: "Server is running on port 3001", tone: "dim" },
      {
        kind: "cmd",
        text: `curl -X POST localhost:3001/auth/model -d '{"userId":"9XK2QP","query":"How did I sleep this week?"}'`,
      },
      { kind: "out", text: "{" },
      { kind: "out", text: '  "userId": "9XK2QP",', tone: "accent" },
      {
        kind: "out",
        text: '  "response": "Your latest Fitbit sync shows 6.4 h of sleep and 7,842 steps. That is about an hour under the 7 to 8 h target; winding down earlier on weeknights would close most of the gap."',
      },
      { kind: "out", text: "}" },
    ],
  },

  DisMan: {
    title: "~/DisasterManagement/server",
    note: "sample call",
    lines: [
      { kind: "cmd", text: "python app.py" },
      { kind: "out", text: " * Running on http://127.0.0.1:5000", tone: "dim" },
      { kind: "out", text: '"POST /voice HTTP/1.1" 200', tone: "dim" },
      { kind: "out", text: '"POST /language-selection HTTP/1.1" 200', tone: "dim" },
      { kind: "out", text: "Selected language in handle_recording: hi" },
      {
        kind: "out",
        text: "Transcribed Text: There is a fire in the building near Park Street. My name is Rahul, please send help.",
      },
      { kind: "out", text: "Generative AI Analysis Results:", tone: "accent" },
      { kind: "out", text: '{ "names": ["Rahul"], "addresses": ["Park Street"],', tone: "warn" },
      { kind: "out", text: '  "disaster": "fire", "sentiment": "distressed" }', tone: "warn" },
      { kind: "out", text: '"POST /handle-recording HTTP/1.1" 200', tone: "ok" },
    ],
  },
};
