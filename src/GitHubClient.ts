// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

export type FileAddition = {
  path: string;
  contents: string;
};

export type FileChanges = {
  additions: FileAddition[];
  deletions: Array<{ path: string }>;
};

export type CommitOnBranch = {
  repositoryNameWithOwner: string;
  branch: string;
  expectedHeadOid: string;
  headline: string;
  body: string;
  fileChanges: FileChanges;
};

export class GitHubClient {
  private readonly octokit: Octokit;

  constructor(token: string, baseUrl?: string) {
    this.octokit = github.getOctokit(token, baseUrl ? { baseUrl } : undefined);
  }

  // Force-update a branch reference to point at the specified commit. This is used to
  // reset the head branch to the new base before the rebased commits are replayed on
  // top of it via the GraphQL API so that each commit is signed by GitHub.
  async forceUpdateBranch(owner: string, repo: string, branch: string, sha: string): Promise<void> {
    core.debug(`Force-updating branch '${branch}' in ${owner}/${repo} to ${sha}.`);
    await this.octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha,
      force: true,
    });
  }

  // Create a commit on a branch via the GraphQL API so that it has a verified GPG
  // signature applied by GitHub, returning the OID of the commit that was created.
  async createCommitOnBranch(change: CommitOnBranch): Promise<string> {
    const mutation = `mutation ($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }`;

    const input = {
      branch: {
        repositoryNameWithOwner: change.repositoryNameWithOwner,
        branchName: change.branch,
      },
      expectedHeadOid: change.expectedHeadOid,
      message: {
        headline: change.headline,
        body: change.body,
      },
      fileChanges: change.fileChanges,
    };

    const response = await this.octokit.graphql<{ createCommitOnBranch: { commit: { oid: string } } }>(mutation, { input });

    return response.createCommitOnBranch.commit.oid;
  }
}
