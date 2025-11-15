// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import * as io from '@actions/io';
import * as os from 'os';
import * as path from 'path';
import { vi } from 'vitest';
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
  public stepSummary: string = '';
  public baseBranch: string;
  public targetBranch: string;
  private repository: string = '';
  private tempDir: string = '';
  private outputPath: string = '';
  private outputs: Record<string, string> = {};

  constructor(baseBranch = '', targetBranch = '') {
    const randomString = () => Math.random().toString(36).substring(7);
    this.baseBranch = baseBranch || `base-${randomString()}`;
    this.targetBranch = targetBranch || `target-${randomString()}`;
  }

  get path(): string {
    return this.repository;
  }

  async initialize(repository = ''): Promise<void> {
    this.tempDir = await createTemporaryDirectory();

    if (repository) {
      this.repository = repository;
    } else {
      this.repository = this.tempDir;
    }

    this.outputPath = path.join(this.tempDir, 'github-outputs');
    await createEmptyFile(this.outputPath);

    if (!repository) {
      await createGitRepo(this.tempDir);
    }

    this.setupEnvironment();
    this.setupMocks();
  }

  async setupRepositoryFromFixture(name: string): Promise<void> {
    const fixturePath = path.join(__dirname, 'fixtures', name);

    const applyContent = async (dir: string): Promise<void> => {
      await io.cp(dir, this.tempDir, { recursive: true, copySourceDirectory: false });
    };

    await this.setupRepository(
      async () => {
        await applyContent(path.join(fixturePath, 'base'));
        await this.commit('Apply base');
      },
      async () => {
        await applyContent(path.join(fixturePath, 'target'));
        await this.commit('Apply target');
      },
      async () => {
        await applyContent(path.join(fixturePath, 'patch'));
        await this.commit('Apply patch');
      }
    );
  }

  async setupRepository(
    setupBase: (branch: string) => Promise<void>,
    setupTarget: (branch: string) => Promise<void>,
    setupConflicts: (branch: string) => Promise<void>
  ): Promise<void> {
    // Create the initial branch and seed it
    await this.checkout(this.baseBranch, true);
    await setupBase(this.baseBranch);

    // Create the target branch and seed it
    await this.checkout(this.targetBranch, true);
    await setupTarget(this.targetBranch);

    // Create conflicts on the base branch
    await this.checkout(this.baseBranch);
    await setupConflicts(this.baseBranch);

    // Check out the target branch ready to rebase
    await this.checkout(this.targetBranch);
  }

  async run(): Promise<void> {
    await run();

    const content = await fs.promises.readFile(this.outputPath, 'utf8');

    const lines = content.split(os.EOL);
    for (let index = 0; index < lines.length; index += 3) {
      const key = lines[index].split('<<')[0];
      const value = lines[index + 1];
      this.outputs[key] = value;
    }
  }

  async reset(): Promise<void> {
    this.stepSummary = '';
    await createEmptyFile(this.outputPath);
    this.outputs = {};
  }

  async destroy(): Promise<void> {
    try {
      await io.rmRF(this.tempDir);
    } catch {
      console.log(`Failed to remove fixture directory '${this.path}'.`);
    }
  }

  async getFileContent(name: string): Promise<string> {
    const fileName = this.getFileName(name);
    return await fs.promises.readFile(fileName, 'utf8');
  }

  getFileName(name: string): string {
    return path.join(this.repository, name);
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

  async diff(count: number = 1): Promise<string[]> {
    const fileNames = await execGit(['diff', `HEAD~${count}`, 'HEAD', '--name-only'], this.tempDir);
    return fileNames.split('\n').filter((p) => p.length > 0);
  }

  async writeFile(name: string, content: string): Promise<void> {
    const filePath = path.join(this.tempDir, name);
    await fs.promises.writeFile(filePath, content);
  }

  private setupEnvironment(): void {
    const inputs = {
      GITHUB_OUTPUT: this.outputPath,
      INPUT_BRANCH: this.baseBranch,
      INPUT_REPOSITORY: this.repository,
      RUNNER_DEBUG: '1',
    };

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
  }

  private setupMocks(): void {
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
    this.setupLogging();
  }

  private setupLogging(): void {
    const logger = (level: string, arg: string | Error) => {
      console.debug(`[${level}] ${arg}`);
    };

    vi.spyOn(core, 'debug').mockImplementation((arg) => {
      logger('debug', arg);
    });
    vi.spyOn(core, 'info').mockImplementation((arg) => {
      logger('info', arg);
    });
    vi.spyOn(core, 'notice').mockImplementation((arg) => {
      logger('notice', arg);
    });
    vi.spyOn(core, 'warning').mockImplementation((arg) => {
      logger('warning', arg);
    });
    vi.spyOn(core, 'error').mockImplementation((arg) => {
      logger('error', arg);
    });

    vi.spyOn(core.summary, 'addRaw').mockImplementation((text: string) => {
      this.stepSummary += text;
      return core.summary;
    });
    vi.spyOn(core.summary, 'write').mockReturnThis();
  }
}
