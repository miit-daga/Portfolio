import { NextResponse } from 'next/server';
import { Octokit } from "@octokit/core";


export const revalidate = 10;

export async function GET() {
  const token = process.env.NEXT_PUBLIC_GITHUB_API_TOKEN;
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
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}