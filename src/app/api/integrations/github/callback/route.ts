// File: pages/api/integrations/github/callback.ts
import fs from "fs";
import path from "path";
import { NextResponse, NextRequest } from "next/server";

export  async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
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

  const headers = {
    Authorization: `Bearer ${access_token}`,
    Accept: "application/vnd.github+json",
  };

  const owner = "your-org";
  const repo = "your-repo";

  const [prs, commits, issues] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all`, { headers }).then(res => res.json()),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, { headers }).then(res => res.json()),
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all`, { headers }).then(res => res.json()),
  ]);

  const prDetails = await Promise.all(
    prs.map(async (pr: any) => {
      const comments = await fetch(pr.comments_url, { headers }).then(res => res.json());
      return {
        id: pr.id,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        merged_at: pr.merged_at,
        user: pr.user?.login,
        from_branch: pr.head?.ref,
        to_branch: pr.base?.ref,
        approvals: pr.requested_reviewers,
        comments,
      };
    })
  );

  const commitDetails = commits.map((commit: any) => ({
    sha: commit.sha,
    message: commit.commit?.message,
    author: commit.commit?.author?.name,
    email: commit.commit?.author?.email,
    timestamp: commit.commit?.author?.date,
  }));

  const issueDetails = await Promise.all(
    issues.map(async (issue: any) => {
      const comments = await fetch(issue.comments_url, { headers }).then(res => res.json());
      return {
        id: issue.id,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        created_at: issue.created_at,
        user: issue.user?.login,
        comments,
      };
    })
  );

  const result = {
    pr: prDetails,
    commits: commitDetails,
    issues: issueDetails,
  };

  const filePath = path.join(process.cwd(), "public", "github_data.json");
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));

  console.log("GitHub data fetched and saved to /public/github_data.json");
  
  return NextResponse.redirect("http://localhost:3000/data");
}
