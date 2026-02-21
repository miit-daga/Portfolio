import { NextResponse } from 'next/server';
import { Octokit } from "@octokit/core";


export const revalidate = 10;

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

    const filteredRepos = response.data.filter((repo: { name: string; fork: boolean }) =>
      repo.name !== 'miit-daga' &&
      repo.name !== 'Portfolio' &&
      (!repo.fork || repo.name === 'DisMan')
    );

    // Fetch language breakdowns for each repo in parallel
    const reposWithLanguages = await Promise.all(
      filteredRepos.map(async (repo: { full_name: string }) => {
        try {
          const langResponse = await octokit.request('GET /repos/{owner}/{repo}/languages', {
            owner: 'miit-daga',
            repo: repo.full_name.split('/')[1],
            headers: { 'X-GitHub-Api-Version': '2022-11-28' },
          });
          return { ...repo, languages: langResponse.data };
        } catch {
          return { ...repo, languages: {} };
        }
      })
    );

    return NextResponse.json(reposWithLanguages);

  } catch (error) {
    console.error('Error fetching repositories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Detailed Error: ${errorMessage}`); // Log details server-side
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
