// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ActionFixture } from './ActionFixture';

describe('rebaser', () => {
  const rebaseTimeout = 15000;
  const runFixture = async (name: string = ''): Promise<ActionFixture> => {
    const fixture = new ActionFixture();
    await fixture.initialize();

    if (name) {
      await fixture.setupRepositoryFromFixture(name);
    }

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

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
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
