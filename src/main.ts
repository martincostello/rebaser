// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { Context } from '@actions/github/lib/context';
import { RebaseResult, tryRebase } from './Rebaser';

export async function run(): Promise<void> {
  try {
    const context = new Context();
    const options = {
      repository: core.getInput('repository', { required: false }) || process.cwd(),
      targetBranch: core.getInput('branch', { required: false }) || context.payload.repository?.['default_branch'] || 'main',
      userEmail: core.getInput('user-email', { required: false }) || 'github-actions[bot]@users.noreply.github.com',
      userName: core.getInput('user-name', { required: false }) || 'github-actions[bot]',
    };

    const result = await tryRebase(options);

    core.setOutput('result', result.toString());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    core.error(error);
    if (error instanceof Error) {
      if (error.stack) {
        core.error(error.stack);
      }
      core.setFailed(error.message);
    }
    core.setOutput('result', RebaseResult.error.toString());
  }
}

if (require.main === module) {
  run();
}
