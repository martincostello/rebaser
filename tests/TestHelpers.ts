// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as exec from '@actions/exec';
import * as fs from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function createEmptyFile(fileName: string) {
  await fs.promises.writeFile(fileName, '');
}

export async function createTemporaryDirectory(): Promise<string> {
  return await fs.promises.mkdtemp(join(tmpdir(), 'rebaser-'));
}

export async function createGitRepo(path: string): Promise<void> {
  const ignoreReturnCode = true;

  const git = async (...args: string[]): Promise<void> => {
    await execGit(args, path, ignoreReturnCode);
  };

  await git('init');
  await git('config', 'core.autocrlf', 'false');
  await git('config', 'core.eol', 'lf');
  await git('config', 'core.safecrlf', 'false');
  await git('config', 'user.email', 'test@test.local');
  await git('config', 'user.name', 'test');

  const ignores = ['.DS_Store', '.vscode', 'bin', 'obj', 'node_modules'];
  await fs.promises.writeFile(join(path, '.gitignore'), ignores.join('\n'));

  await commitChanges(path, 'Initial commit');
}

export async function checkoutBranch(path: string, branch: string): Promise<void> {
  await execGit(['checkout', branch], path, true);
}

export async function createBranch(path: string, branch: string): Promise<void> {
  await execGit(['checkout', '-b', branch], path, true);
}

export async function commitChanges(path: string, message: string): Promise<void> {
  const ignoreReturnCode = true;
  const git = async (...args: string[]): Promise<void> => {
    await execGit(args, path, ignoreReturnCode);
  };
  await git('add', '.');
  await git('commit', '-m', message);
}

export async function execGit(args: string[], cwd: string, ignoreReturnCode: boolean = false): Promise<string> {
  let commandOutput = '';
  let commandError = '';

  const options = {
    cwd,
    ignoreReturnCode,
    silent: ignoreReturnCode,
    listeners: {
      stdout: (data: Buffer) => {
        commandOutput += data.toString();
      },
      stderr: (data: Buffer) => {
        commandError += data.toString();
      },
    },
  };

  try {
    await exec.exec('git', args, options);
  } catch (error: any) {
    throw new Error(`The command 'git ${args.join(' ')}' failed: ${error}`);
  }

  if (commandError && !ignoreReturnCode) {
    throw new Error(commandError);
  }

  return commandOutput.trimEnd();
}
