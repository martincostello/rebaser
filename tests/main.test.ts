// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { vi } from 'vitest';

type UpdateRefCall = { owner: string; repo: string; ref: string; sha: string; force: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommitInput = any;

const { apiCalls, clearApiCalls } = vi.hoisted(() => {
  const apiCalls: { updateRef: UpdateRefCall[]; commits: CommitInput[] } = { updateRef: [], commits: [] };
  return {
    apiCalls,
    clearApiCalls: () => {
      apiCalls.updateRef = [];
      apiCalls.commits = [];
    },
  };
});

vi.mock('@actions/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/github')>();
  return {
    ...actual,
    getOctokit: () => ({
      rest: {
        git: {
          updateRef: async (params: UpdateRefCall) => {
            apiCalls.updateRef.push(params);
            return { data: {} };
          },
        },
      },
      graphql: async (_query: string, variables: { input: CommitInput }) => {
        apiCalls.commits.push(variables.input);
        const oid = `commit-oid-${apiCalls.commits.length}`;
        return { createCommitOnBranch: { commit: { oid } } };
      },
    }),
  };
});

vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>();
  return {
    ...actual,
    setFailed: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    summary: {
      ...actual.summary,
      addRaw: vi.fn().mockReturnThis(),
      write: vi.fn().mockReturnThis(),
    },
  };
});

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ActionFixture } from './ActionFixture';

describe('rebaser', () => {
  const rebaseTimeout = 30000;
  const runFixture = async (name: string = ''): Promise<ActionFixture> => {
    const fixture = new ActionFixture();
    await fixture.initialize();

    if (name) {
      await fixture.setupRepositoryFromFixture(name);
    }

    clearApiCalls();
    await fixture.run();

    return fixture;
  };

  describe('when global.json has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('global.json');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('global.json')).toMatchSnapshot();
    });
  });

  describe('when Directory.Packages.props has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Directory.Packages.props');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when Directory.Packages.props has conflicts from an MSBuild property', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('MSBuildProperty');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when Dockerfile has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Dockerfile');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Dockerfile')).toMatchSnapshot();
    });
  });

  describe('when package.json has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('package.json');
    }, rebaseTimeout * 2);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('regenerates the lock file', async () => {
      expect(await fixture.diff(3)).toContain('package-lock.json');
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('package.json')).toMatchSnapshot();
    });
  });

  describe('when C# project file has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Project.csproj');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Project/Project.csproj')).toMatchSnapshot();
    });
  });

  describe('when a solution has multiple conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Complex');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('SDK matches the snapshot', async () => {
      expect(await fixture.getFileContent('global.json')).toMatchSnapshot();
    });

    test('packages matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when a the number of lines in the diff is uneven', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Uneven');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('packages matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when a line is added', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('AddedLine');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('packages matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when a line is deleted', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('DeletedLine');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('packages matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when a prerelease has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Prerelease');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('global.json')).toMatchSnapshot();
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Project.csproj')).toMatchSnapshot();
    });
  });

  describe('when branch is up-to-date', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('global.json');
      fixture.reset();

      clearApiCalls();
      await fixture.run();
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('upToDate');
    });

    test('the branch is still rebased from before', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('does not push any commits via the GitHub API', () => {
      expect(apiCalls.updateRef).toHaveLength(0);
      expect(apiCalls.commits).toHaveLength(0);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('global.json')).toMatchSnapshot();
    });
  });

  describe('when the conflicts cannot be resolved', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('Unresolvable');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('conflicts');
    });

    test('aborts the rebase', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply base', 'Initial commit']);
    });

    test('does not push any commits via the GitHub API', () => {
      expect(apiCalls.updateRef).toHaveLength(0);
      expect(apiCalls.commits).toHaveLength(0);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
    });
  });

  describe('when the rebase fails for a reason other than conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture();
      await fixture.initialize();
      await fixture.setupRepositoryFromFixture('global.json');
      process.env.INPUT_BRANCH = 'this-branch-does-not-exist';
      clearApiCalls();
      await fixture.run();
    }, rebaseTimeout * 2);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('error');
    });

    test('reports the underlying error', () => {
      expect(fixture.errors.join('\n')).toContain('error other than file conflicts');
    });

    test('does not push any commits via the GitHub API', () => {
      expect(apiCalls.updateRef).toHaveLength(0);
      expect(apiCalls.commits).toHaveLength(0);
    });
  });

  describe('when pushing the rebased commits via the GitHub API', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await runFixture('global.json');
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('force-updates the head branch to the new base', () => {
      expect(apiCalls.updateRef).toHaveLength(1);
      const [updateRef] = apiCalls.updateRef;
      expect(updateRef.owner).toBe(fixture.owner);
      expect(updateRef.repo).toBe(fixture.repo);
      expect(updateRef.ref).toBe(`heads/${fixture.targetBranch}`);
      expect(updateRef.force).toBe(true);
      expect(updateRef.sha).toMatch(/^[0-9a-f]{40}$/);
    });

    test('creates a single verified commit', () => {
      expect(apiCalls.commits).toHaveLength(1);
    });

    test('commits onto the head branch of the correct repository', () => {
      const [commit] = apiCalls.commits;
      expect(commit.branch.repositoryNameWithOwner).toBe(`${fixture.owner}/${fixture.repo}`);
      expect(commit.branch.branchName).toBe(fixture.targetBranch);
    });

    test('commits on top of the new base', () => {
      expect(apiCalls.commits[0].expectedHeadOid).toBe(apiCalls.updateRef[0].sha);
    });

    test('uses the original commit message', () => {
      expect(apiCalls.commits[0].message.headline).toBe('Apply target');
    });

    test('preserves authorship using a trailer', () => {
      expect(apiCalls.commits[0].message.body).toContain('Co-authored-by: test <test@test.local>');
    });

    test('commits the resolved file content', async () => {
      const addition = apiCalls.commits[0].fileChanges.additions.find((a: { path: string }) => a.path === 'global.json');
      expect(addition).toBeDefined();
      const contents = Buffer.from(addition.contents, 'base64').toString('utf8');
      expect(contents).toBe(await fixture.getFileContent('global.json'));
    });
  });

  describe('when multiple commits are rebased', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture();
      await fixture.initialize();
      await fixture.setupRepository(
        async () => {
          await fixture.writeFile('base.txt', 'base\n');
          await fixture.commit('Apply base');
        },
        async () => {
          await fixture.writeFile('first.txt', 'first\n');
          await fixture.commit('Add first');
          await fixture.writeFile('second.txt', 'second\n');
          await fixture.commit('Add second');
        },
        async () => {
          await fixture.writeFile('base.txt', 'patched\n');
          await fixture.commit('Apply patch');
        }
      );
      clearApiCalls();
      await fixture.run();
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('success');
    });

    test('force-updates the head branch once', () => {
      expect(apiCalls.updateRef).toHaveLength(1);
    });

    test('replays every commit in order', () => {
      expect(apiCalls.commits).toHaveLength(2);
      expect(apiCalls.commits.map((c: { message: { headline: string } }) => c.message.headline)).toEqual(['Add first', 'Add second']);
    });

    test('chains each commit onto the previous one', () => {
      expect(apiCalls.commits[0].expectedHeadOid).toBe(apiCalls.updateRef[0].sha);
      expect(apiCalls.commits[1].expectedHeadOid).toBe('commit-oid-1');
    });

    test('applies the file changes for each commit', () => {
      expect(apiCalls.commits[0].fileChanges.additions.map((a: { path: string }) => a.path)).toEqual(['first.txt']);
      expect(apiCalls.commits[1].fileChanges.additions.map((a: { path: string }) => a.path)).toEqual(['second.txt']);
    });
  });

  describe('when a commit contains a change that cannot be reproduced via the API', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture();
      await fixture.initialize();
      await fixture.setupRepository(
        async () => {
          await fixture.writeFile('base.txt', 'base\n');
          await fixture.commit('Apply base');
        },
        async () => {
          // Add a submodule (gitlink) entry, which cannot be reproduced via the GitHub API.
          const sha = await fixture.gitExec(['rev-parse', 'HEAD']);
          await fixture.gitExec(['update-index', '--add', '--cacheinfo', `160000,${sha},submodule`]);
          await fixture.gitExec(['commit', '-m', 'Add submodule']);
        },
        async () => {
          await fixture.writeFile('base.txt', 'patched\n');
          await fixture.commit('Apply patch');
        }
      );
      clearApiCalls();
      await fixture.run();
    }, rebaseTimeout);

    afterAll(async () => {
      await fixture?.destroy();
    });

    test('outputs the correct result', () => {
      expect(fixture.getOutput('result')).toBe('error');
    });

    test('reports the unsupported change', () => {
      expect(fixture.errors.join('\n')).toContain('submodule');
    });

    test('does not push any commits via the GitHub API', () => {
      expect(apiCalls.updateRef).toHaveLength(0);
      expect(apiCalls.commits).toHaveLength(0);
    });
  });

  describe.skip.each([['', '', '']])(
    'when an existing repository is rebased',
    (repository: string, baseBranch: string, targetBranch: string) => {
      let fixture: ActionFixture;

      beforeAll(async () => {
        fixture = new ActionFixture(baseBranch, targetBranch);
        await fixture.initialize(repository);
        await fixture.run();
      }, rebaseTimeout);

      afterAll(async () => {
        await fixture?.destroy();
      });

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('outputs the correct result', () => {
        expect(fixture.getOutput('result')).toBe('success');
      });
    }
  );
});
