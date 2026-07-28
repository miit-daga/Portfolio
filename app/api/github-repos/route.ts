import { NextResponse } from 'next/server';
import { Octokit } from "@octokit/core";
import { FEATURED, isVisible, orderByCuration, type CuratedRepo } from '@/constants/projects';

export const revalidate = 10;

// Octokit types `response.data` as `any` for this endpoint, so pin the fields
// we actually read rather than letting them go implicitly untyped.
type GhRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics?: string[];
  fork: boolean;
};

// Curation (which repos show, and in what order) lives in constants/projects.ts
// and is applied here rather than in the UI, so the Projects section and the
// terminal's `projects` command stay in sync automatically.
export async function GET() {
  const token = process.env.GITHUB_API_TOKEN;
  const octokit = new Octokit({
    auth: token
  });

  try {
    const response = await octokit.request('GET /users/miit-daga/repos', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
      visibility: 'public' // Ensure only public repositories are fetched
    });

    const visibleRepos = (response.data as GhRepo[]).filter((repo) => isVisible(repo));

    // Fetch language breakdowns for each repo in parallel
    const reposWithLanguages: CuratedRepo[] = await Promise.all(
      visibleRepos.map(async (repo) => {
        let languages: Record<string, number> = {};
        try {
          const langResponse = await octokit.request('GET /repos/{owner}/{repo}/languages', {
            owner: 'miit-daga',
            repo: repo.name,
            headers: { 'X-GitHub-Api-Version': '2022-11-28' },
          });
          languages = langResponse.data as Record<string, number>;
        } catch {
          languages = {};
        }
        return {
          name: repo.name,
          description: repo.description,
          html_url: repo.html_url,
          // Empty strings are common on GitHub; normalise to null so consumers
          // can truthiness-check before rendering a "live" affordance.
          homepage: repo.homepage || null,
          topics: repo.topics ?? [],
          languages,
          featured: FEATURED.includes(repo.name),
        };
      })
    );

    return NextResponse.json(orderByCuration(reposWithLanguages));

  } catch (error) {
    console.error('Error fetching repositories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Detailed Error: ${errorMessage}`); // Log details server-side
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
