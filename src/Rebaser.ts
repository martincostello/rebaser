// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { join } from 'path';

/* eslint-disable-next-line import/named */
import { SimpleGit, TaskOptions, simpleGit } from 'simple-git';

import { tryResolveConflicts } from './Resolver';

async function rebase(git: SimpleGit, options: TaskOptions): Promise<RebaseResult> {
  try {
    const result = await git.rebase(options);
    core.debug(`Rebase result:\n${result}`);
    return result?.includes('up to date') ? RebaseResult.upToDate : RebaseResult.success;
  } catch (error: any) {
    core.debug(`Rebase failed:\n${error}`);
    return RebaseResult.conflicts;
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
  branch: string;
  repository: string;
  userEmail: string;
  userName: string;
}): Promise<RebaseResult> {
  core.debug(`Rebasing '${options.branch}' branch in '${options.repository}'`);

  const git = simpleGit({
    baseDir: options.repository,
    config: [
      'core.editor=true', // Do not open editor for commit messages
      `user.email=${options.userEmail}`,
      `user.name=${options.userName}`,
    ],
  });

  let result = RebaseResult.success;
  let rebaseOptions = [options.branch];

  try {
    while ((result = await rebase(git, rebaseOptions)) === RebaseResult.conflicts) {
      const filesWithConflicts = await getFilesWithConflicts(git, options.repository);

      if (filesWithConflicts.length === 0) {
        core.warning('Failed to determine files with conflicts.');
        result = RebaseResult.error;
        break;
      }

      let resolved = false;

      for (const file of filesWithConflicts) {
        resolved = await tryResolveConflicts(file);
        if (!resolved) {
          core.warning(`Failed to resolve conflicts in '${file}'.`);
          break;
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
      core.warning(`${options.branch} could not be rebased due to conflicts that could not be automatically resolved.`);
      break;

    case RebaseResult.error:
      core.error(`Failed to rebase ${options.branch} due to an error.`);
      break;

    case RebaseResult.success:
      core.info(`${options.branch} was successfully rebased.`);
      break;

    case RebaseResult.upToDate:
      core.info(`${options.branch} is already up to date.`);
      break;
  }

  return result;
}

// eslint-disable-next-line no-shadow
export enum RebaseResult {
  upToDate = 'upToDate',
  success = 'success',
  conflicts = 'conflicts',
  error = 'error',
}
