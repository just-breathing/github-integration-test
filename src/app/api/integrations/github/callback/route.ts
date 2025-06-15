// File: pages/api/integrations/github/callback.ts
import fs from "fs";
import path from "path";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) {
      return NextResponse.json({ error: "Failed to obtain access token" }, { status: 401 });
    }

    const headers = {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/vnd.github+json",
    };

    // Get user info
    const userRes = await fetch("https://api.github.com/user", { headers });
    const userData = await userRes.json();
    const owner = userData.login;

    // Get user repos (for orgs, change endpoint)
    const repos = await fetch(`https://api.github.com/users/${owner}/repos`, { headers }).then(res => res.json());

    const allData = await Promise.all(
      repos.map(async (repo: any) => {
        // Get PRs, commits, issues
        const [prs, commits, issues] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo.name}/pulls?state=all`, { headers }).then(res => res.json()),
          fetch(`https://api.github.com/repos/${owner}/${repo.name}/commits`, { headers }).then(res => res.json()),
          fetch(`https://api.github.com/repos/${owner}/${repo.name}/issues?state=all`, { headers }).then(res => res.json()),
        ]);

        // PR details
        const prDetails = await Promise.all(
          prs.map(async (pr: any) => {
            const comments = await fetch(pr.comments_url, { headers }).then(res => res.json());
            return {
              id: pr.id,
              number: pr.number,
              title: pr.title,
              state: pr.state,
              created_at: pr.created_at,
              merged_at: pr.merged_at,
              user: pr.user?.login,
              from_branch: pr.head?.ref,
              to_branch: pr.base?.ref,
              approvals: pr.requested_reviewers,
              comments,
              url: pr.html_url,
            };
          })
        );

        // Commit details
        const commitDetails = commits.map((commit: any) => ({
          sha: commit.sha,
          message: commit.commit?.message,
          author: commit.commit?.author?.name,
          email: commit.commit?.author?.email,
          timestamp: commit.commit?.author?.date,
          url: commit.html_url,
        }));

        // Issue details
        const issueDetails = await Promise.all(
          issues.map(async (issue: any) => {
            const comments = await fetch(issue.comments_url, { headers }).then(res => res.json());
            return {
              id: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body,
              state: issue.state,
              created_at: issue.created_at,
              user: issue.user?.login,
              comments,
              url: issue.html_url,
            };
          })
        );

        // Add more repo details here
        return {
          repo: {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            owner: repo.owner?.login,
            description: repo.description,
            private: repo.private,
            html_url: repo.html_url,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            default_branch: repo.default_branch,
            language: repo.language,
            forks_count: repo.forks_count,
            stargazers_count: repo.stargazers_count,
            watchers_count: repo.watchers_count,
            open_issues_count: repo.open_issues_count,
          },
          pull_requests: prDetails,
          commits: commitDetails,
          issues: issueDetails,
        };
      })
    );

    const result = {
      user: {
        login: userData.login,
        id: userData.id,
        name: userData.name,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        email: userData.email,
      },
      repositories: allData,
    };

    // Write to file
    const filePath = path.join(process.cwd(), "public", "github_data.json");
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));

    console.log("GitHub data fetched and saved to /public/github_data.json");

    // Return the data as JSON response
    return NextResponse.json(result);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
