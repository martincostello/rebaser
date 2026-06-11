// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { exec } from '@actions/exec';
import { join } from 'path';

/* eslint-disable-next-line import/named */
import { SimpleGit, TaskOptions, simpleGit } from 'simple-git';

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

export async function tryRebase(options: {
  targetBranch: string;
  repository: string;
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
