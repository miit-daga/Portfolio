// Single source of truth for which repositories appear in the Projects section
// and in the terminal's `projects` command. Both read the already-ordered list
// from /api/github-repos, so curation only ever lives here.

// Rendered first, in exactly this order. Everything else keeps GitHub's own
// ordering behind them, so a newly pushed repo still shows up on its own.
export const FEATURED: readonly string[] = [
  "quick-seed",
  "flowsquire",
  "env-guard",
  "DriftGuard-ETC",
  "FitAI-backend",
  "DisMan",
];

// Never rendered anywhere.
// eye-convnext has no GitHub description, so it would render the placeholder
// card; ConvoLink's deployment is currently down.
export const HIDDEN: readonly string[] = ["eye-convnext", "ConvoLink"];

// Excluded regardless of curation: the profile README repo and this site.
export const ALWAYS_EXCLUDED: readonly string[] = ["miit-daga", "Portfolio"];

// Forks are dropped unless named here.
export const FORK_ALLOWLIST: readonly string[] = ["DisMan"];

// The shape /api/github-repos returns. Deliberately lean: the raw GitHub repo
// object is ~1 KB of JSON each, and consumers only need these fields.
export type CuratedRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics: string[];
  languages: Record<string, number>;
  featured: boolean;
};

/**
 * Featured repos lead in FEATURED order; the rest follow in the order GitHub
 * returned them. Relies on Array.prototype.sort being stable, which it is in
 * every engine we target.
 */
export function orderByCuration<T extends { name: string }>(repos: T[]): T[] {
  const rank = (name: string) => {
    const i = FEATURED.indexOf(name);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...repos].sort((a, b) => rank(a.name) - rank(b.name));
}

/** Whether a repo survives the exclusion rules. */
export function isVisible(repo: { name: string; fork: boolean }): boolean {
  if (ALWAYS_EXCLUDED.includes(repo.name)) return false;
  if (HIDDEN.includes(repo.name)) return false;
  if (repo.fork && !FORK_ALLOWLIST.includes(repo.name)) return false;
  return true;
}
