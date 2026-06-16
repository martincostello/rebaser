// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { exec } from '@actions/exec';
import { join } from 'path';

/* eslint-disable-next-line import/named */
import { SimpleGit, TaskOptions, simpleGit } from 'simple-git';

import { FileChanges, GitHubClient } from './GitHubClient';
import { tryResolveConflicts } from './Resolver';

async function rebase(git: SimpleGit, options: TaskOptions): Promise<RebaseOutcome> {
  try {
    const result = await git.rebase(options);
    core.debug(`Rebase result:\n${result}`);
    return { result: result?.includes('up to date') ? RebaseResult.upToDate : RebaseResult.success };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.debug(`Rebase failed:\n${message}`);
    return { result: RebaseResult.conflicts, error: message };
  }
}

async function getFilesWithConflicts(git: SimpleGit, repository: string): Promise<string[]> {
  const conflicts = await git.diff(['--name-only', '--diff-filter=U', '--relative']);
  core.debug(`Files with conflicts:\n${conflicts}`);
  const paths = conflicts
    .split('\n')
    .filter((p) => p.length > 0)
    .map((p) => join(repository, p));

  // Return in reverse so package-lock.json is fixed after package.json
  return paths.reverse();
}

// Error thrown when a rebased commit contains a change that cannot be faithfully
// reproduced through the GitHub API (a symlink, a submodule or a file mode change).
export class UnsupportedChangeError extends Error {}

// Git file modes that cannot be represented by the GitHub API, which only ever creates
// regular non-executable file blobs (mode 100644), mapped to a human-readable reason.
const unsupportedModes: Record<string, string> = {
  '100755': 'has an executable file mode',
  '120000': 'is a symbolic link',
  '160000': 'is a submodule',
};

// Build the set of file changes for a single rebased commit relative to its parent so
// that they can be replayed via the GitHub API. Renames are disabled so that a renamed
// file is expressed as a deletion of the old path and an addition of the new path.
//
// Throws an UnsupportedChangeError if the commit contains a change that the API cannot
// reproduce as a verified commit, so that detection happens before any API calls are made.
async function getFileChanges(git: SimpleGit, commit: string): Promise<FileChanges> {
  const output = await git.raw(['diff', '--raw', '--no-renames', '-z', `${commit}~1`, commit]);

  const additions: Array<{ path: string; contents: string }> = [];
  const deletions: Array<{ path: string }> = [];

  // The --raw -z format emits NUL-separated records of the form:
  //   :<src-mode> <dst-mode> <src-sha> <dst-sha> <status> NUL <path> NUL
  const fields = output.split('\0').filter((p) => p.length > 0);

  for (let index = 0; index < fields.length; index += 2) {
    const meta = fields[index];
    const path = fields[index + 1];

    if (!meta || !path) {
      continue;
    }

    const [, dstMode, , , status] = meta.replace(/^:/, '').split(' ');

    if (status?.startsWith('D')) {
      deletions.push({ path });
      continue;
    }

    const reason = unsupportedModes[dstMode];
    if (reason) {
      throw new UnsupportedChangeError(
        `Cannot rebase using the GitHub API because '${path}' ${reason}, which cannot be reproduced as a verified commit.`
      );
    }

    const contents = await git.show([`${commit}:${path}`]);
    additions.push({ path, contents: Buffer.from(contents, 'utf8').toString('base64') });
  }

  return { additions, deletions };
}

// Reconstruct the rebased branch on the remote via the GitHub API so that every commit is
// signed by GitHub. The head branch is first reset to the new base (the tip of the target
// branch the commits were rebased onto) and then each rebased commit is replayed on top of
// it, preserving the original author via a Co-authored-by trailer.
async function pushRebasedCommits(
  git: SimpleGit,
  client: GitHubClient,
  options: {
    owner: string;
    repo: string;
    targetBranch: string;
  }
): Promise<void> {
  const headBranch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();

  const revList = await git.raw(['rev-list', '--reverse', `${options.targetBranch}..HEAD`]);
  const commits = revList.split('\n').filter((p) => p.length > 0);

  if (commits.length === 0) {
    core.debug('There are no rebased commits to push via the GitHub API.');
    return;
  }

  // The parent of the first rebased commit is the tip of the target branch that the
  // commits were rebased onto and is the commit that already exists on the remote.
  const baseOid = (await git.revparse([`${commits[0]}~1`])).trim();

  // Compute the file changes for every commit up-front so that any change that cannot be
  // reproduced via the API (which throws an UnsupportedChangeError) aborts the rebase
  // before the remote branch is modified by any API call.
  const changes: Array<{ commit: string; fileChanges: FileChanges }> = [];
  for (const commit of commits) {
    changes.push({ commit, fileChanges: await getFileChanges(git, commit) });
  }

  await client.forceUpdateBranch(options.owner, options.repo, headBranch, baseOid);

  const repositoryNameWithOwner = `${options.owner}/${options.repo}`;
  let expectedHeadOid = baseOid;

  for (const { commit, fileChanges } of changes) {
    if (fileChanges.additions.length === 0 && fileChanges.deletions.length === 0) {
      // A commit that is empty after the rebase cannot be recreated via the API, so skip it.
      core.warning(`Skipping empty commit ${commit.substring(0, 7)} as it has no file changes to apply.`);
      continue;
    }

    // Read the author and the message in a single invocation, separated by a NUL, to
    // minimise the number of Git processes spawned while reconstructing each commit.
    const details = await git.raw(['show', '-s', '--format=%an <%ae>%x00%B', commit]);
    const separator = details.indexOf('\0');
    const author = details.substring(0, separator).trim();
    const message = details.substring(separator + 1);

    const lines = message.split('\n');
    const headline = lines[0];
    let body = lines.slice(1).join('\n').trim();

    // Preserve the original author of the commit via a trailer, as the GitHub API
    // attributes the author and committer to the identity of the access token.
    const coAuthor = `Co-authored-by: ${author}`;
    if (!body.includes(coAuthor)) {
      body = body.length > 0 ? `${body}\n\n${coAuthor}` : coAuthor;
    }

    expectedHeadOid = await client.createCommitOnBranch({
      repositoryNameWithOwner,
      branch: headBranch,
      expectedHeadOid,
      headline,
      body,
      fileChanges,
    });

    core.info(`Created verified commit ${expectedHeadOid.substring(0, 7)} on ${headBranch}.`);
  }
}

export async function tryRebase(options: {
  apiUrl?: string;
  owner: string;
  repo: string;
  targetBranch: string;
  repository: string;
  token: string;
  userEmail: string;
  userName: string;
}): Promise<RebaseResult> {
  core.debug(`Rebasing onto '${options.targetBranch}' branch in '${options.repository}'`);

  const git = simpleGit({
    baseDir: options.repository,
    config: [
      'core.editor=true', // Do not open editor for commit messages
      `user.email=${options.userEmail}`,
      `user.name=${options.userName}`,
    ],
    unsafe: { allowUnsafeEditor: true },
  });

  let result = RebaseResult.success;
  let rebaseOptions = [options.targetBranch];

  const isInteractive = process.env.REBASER_INTERACTIVE === 'true' && process.env.GITHUB_ACTIONS !== 'true';

  try {
    while (true) {
      const outcome = await rebase(git, rebaseOptions);
      result = outcome.result;

      if (result !== RebaseResult.conflicts) {
        break;
      }

      const filesWithConflicts = await getFilesWithConflicts(git, options.repository);

      if (filesWithConflicts.length === 0) {
        // The rebase stopped but there are no files with conflicts to resolve, so it
        // failed for some reason other than merge conflicts (for example a fatal Git
        // error, such as being unable to fetch an object from a promisor remote when
        // the repository is a partial clone). Surface the underlying error so that the
        // cause is visible without debug logging being enabled.
        core.error(
          `Failed to rebase onto ${options.targetBranch} due to an error other than file conflicts:\n${outcome.error ?? 'Unknown error.'}`
        );
        result = RebaseResult.error;
        break;
      }

      let resolved = false;

      for (const file of filesWithConflicts) {
        resolved = await tryResolveConflicts(file);
        if (!resolved) {
          if (isInteractive) {
            if ((await exec('code', [file, '--wait'])) !== 0) {
              core.warning(`Unable to resolve merge conflict in ${file} using Visual Studio Code.`);
              break;
            }
            resolved = true;
          } else {
            core.warning(`Failed to resolve conflicts in '${file}'.`);
            break;
          }
        }
      }

      if (!resolved) {
        break;
      }

      await git.add(['.']);
      rebaseOptions = ['--continue'];
    }
  } finally {
    if (result === RebaseResult.conflicts) {
      await rebase(git, ['--abort']);
    }
  }

  if (result === RebaseResult.success) {
    // The local rebase rewrote history, so push the result to the remote via the GitHub
    // API instead of leaving it to the caller. This ensures every commit is GPG-verified.
    try {
      const client = new GitHubClient(options.token, options.apiUrl);
      await pushRebasedCommits(git, client, {
        owner: options.owner,
        repo: options.repo,
        targetBranch: options.targetBranch,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof UnsupportedChangeError) {
        core.error(message);
      } else {
        core.error(`Failed to push the rebased commits onto ${options.targetBranch} using the GitHub API:\n${message}`);
      }
      result = RebaseResult.error;
    }
  }

  core.debug(`Rebase result: ${result}`);

  switch (result) {
    case RebaseResult.conflicts:
      core.warning(`Could not rebase onto ${options.targetBranch} due to conflicts that could not be automatically resolved.`);
      break;

    case RebaseResult.error:
      core.error(`Failed to rebase onto ${options.targetBranch} due to an error.`);
      break;

    case RebaseResult.success:
      core.info(`Successfully rebased onto ${options.targetBranch}.`);
      break;

    case RebaseResult.upToDate:
      core.info(`Already up to date with ${options.targetBranch}.`);
      break;
  }

  return result;
}

export enum RebaseResult {
  upToDate = 'upToDate',
  success = 'success',
  conflicts = 'conflicts',
  error = 'error',
}

type RebaseOutcome = {
  result: RebaseResult;
  error?: string;
};
