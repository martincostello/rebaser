// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { join } from 'path';

/* eslint-disable-next-line import/named */
import { SimpleGit, TaskOptions, simpleGit } from 'simple-git';

import { tryResolveConflicts } from './Resolver';

async function rebase(git: SimpleGit, options: TaskOptions): Promise<boolean> {
  try {
    const result = await git.rebase(options);
    core.debug(result);
    return true;
  } catch (error: any) {
    core.debug(error);
    return false;
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

export async function tryRebase(options: { branch: string; repository: string }): Promise<boolean> {
  core.debug(`Rebasing '${options.branch}' branch in '${options.repository}'.`);

  const git = simpleGit({
    baseDir: options.repository,
    config: ['core.editor=true'], // Do not open editor for commit messages
  });

  let abort = false;
  let rebaseOptions = [options.branch];

  try {
    while (!(await rebase(git, rebaseOptions))) {
      const filesWithConflicts = await getFilesWithConflicts(git, options.repository);

      if (filesWithConflicts.length === 0) {
        core.warning(`Failed to determine files with conflicts.`);
        abort = true;
        break;
      }

      for (const file of filesWithConflicts) {
        const resolved = await tryResolveConflicts(file);
        if (!resolved) {
          core.warning(`Failed to resolve conflicts in '${file}'.`);
          abort = true;
          break;
        }
      }

      if (abort) {
        break;
      }

      await git.add(['.']);
      rebaseOptions = ['--continue'];
    }
  } finally {
    if (abort) {
      await rebase(git, ['--abort']);
    }
  }

  if (!abort) {
    core.debug(`Rebased '${options.branch}' branch in '${options.repository}'.`);
    return true;
  }

  return !abort;
}
