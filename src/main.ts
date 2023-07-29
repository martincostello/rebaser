// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';

import { Context } from '@actions/github/lib/context';
import { tryRebase } from './Rebaser';

export async function run(): Promise<void> {
  try {
    const context = new Context();
    const options = {
      branch: core.getInput('branch', { required: false }) || context.payload.repository?.['default_branch'] || 'main',
      repository: core.getInput('repository', { required: false }) || process.cwd(),
    };

    let rebased = false;

    try {
      rebased = await tryRebase(options);
    } catch (error: any) {
      core.setFailed(`Failed to rebase the '${options.branch}' branch.`);
      throw error;
    }

    core.setOutput('rebased', rebased);
  } catch (error: any) {
    core.error(error);
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

if (require.main === module) {
  run();
}
