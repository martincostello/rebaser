// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { Context } from '@actions/github/lib/context';
import { RebaseResult, tryRebase } from './Rebaser';

export async function run(): Promise<void> {
  try {
    const context = new Context();
    const options = {
      branch: core.getInput('branch', { required: false }) || context.payload.repository?.['default_branch'] || 'main',
      repository: core.getInput('repository', { required: false }) || process.cwd(),
      userEmail: core.getInput('user-email', { required: false }) || 'github-actions[bot]@users.noreply.github.com',
      userName: core.getInput('user-name', { required: false }) || 'github-actions[bot]',
    };

    const result = await tryRebase(options);

    core.setOutput('result', result.toString());
  } catch (error: any) {
    core.error(error);
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
    core.setOutput('result', RebaseResult.error.toString());
  }
}

if (require.main === module) {
  run();
}
