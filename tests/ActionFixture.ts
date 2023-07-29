// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import * as io from '@actions/io';
import * as os from 'os';
import * as path from 'path';
import { jest } from '@jest/globals';
import {
  checkoutBranch,
  commitChanges,
  createBranch,
  createEmptyFile,
  createGitRepo,
  createTemporaryDirectory,
  execGit,
} from './TestHelpers';
import { run } from '../src/main';

export class ActionFixture {
  private tempDir: string = '';
  private githubStepSummary: string = '';
  private outputPath: string = '';
  private outputs: Record<string, string> = {};
  public logs: string[] = [];

  constructor(public branch: string = 'main') {}

  get path(): string {
    return this.tempDir;
  }

  async initialize(): Promise<void> {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(core, 'setFailed').mockImplementation(() => {});

    const logger = (level, arg) => {
      this.logs.push(`[${level}] ${arg}`);
    };

    jest.spyOn(core, 'debug').mockImplementation((arg) => {
      logger('debug', arg);
    });
    jest.spyOn(core, 'info').mockImplementation((arg) => {
      logger('info', arg);
    });
    jest.spyOn(core, 'notice').mockImplementation((arg) => {
      logger('notice', arg);
    });
    jest.spyOn(core, 'warning').mockImplementation((arg) => {
      logger('warning', arg);
    });
    jest.spyOn(core, 'error').mockImplementation((arg) => {
      logger('error', arg);
    });

    this.tempDir = await createTemporaryDirectory();
    this.githubStepSummary = path.join(this.tempDir, 'github-step-summary.md');
    this.outputPath = path.join(this.tempDir, 'github-outputs');

    await createEmptyFile(this.githubStepSummary);
    await createEmptyFile(this.outputPath);
    await createGitRepo(this.tempDir);

    this.setupEnvironment();
  }

  async run(): Promise<void> {
    await run();

    const buffer = await fs.promises.readFile(this.outputPath);
    const content = buffer.toString();

    const lines = content.split(os.EOL);
    for (let index = 0; index < lines.length; index += 3) {
      const key = lines[index].split('<<')[0];
      const value = lines[index + 1];
      this.outputs[key] = value;
    }

    for (const message of this.logs) {
      console.log(message);
    }
  }

  async destroy(): Promise<void> {
    try {
      await io.rmRF(this.tempDir);
    } catch {
      console.log(`Failed to remove fixture directory '${this.path}'.`);
    }
  }

  getOutput(name: string): string {
    return this.outputs[name];
  }

  async checkout(name: string, create: boolean = false): Promise<void> {
    if (create) {
      await createBranch(this.tempDir, name);
    } else {
      await checkoutBranch(this.tempDir, name);
    }
  }

  async commitHistory(count: number = 1): Promise<string[]> {
    const history = await execGit(['log', (count * -1).toString(10), '--pretty=%B'], this.tempDir);
    return history.split('\n').filter((p) => p.length > 0);
  }

  async commit(message: string): Promise<void> {
    await commitChanges(this.tempDir, message);
  }

  async writeFile(name: string, content: string): Promise<void> {
    const filePath = path.join(this.tempDir, name);
    await fs.promises.writeFile(filePath, content);
  }

  private setupEnvironment(): void {
    const inputs = {
      GITHUB_OUTPUT: this.outputPath,
      GITHUB_STEP_SUMMARY: this.githubStepSummary,
      INPUT_BRANCH: this.branch,
      INPUT_REPOSITORY: this.tempDir,
      RUNNER_DEBUG: '1',
    };

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
  }
}
