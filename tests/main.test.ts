// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
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

    test('outputs that the branch was rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('true');
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

    test('outputs that the branch was rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('true');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
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

    test('outputs that the branch was rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('true');
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

    test('outputs that the branch was rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('true');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('Project/Project.csproj')).toMatchInlineSnapshot(`
"<Project>
  <ItemGroup>
    <PackageVersion Include="System.Text.Json" Version="8.0.0-preview.6.23329.7" />
  </ItemGroup>
</Project>
"
`);
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

    test('outputs that the branch was rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('true');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Apply target', 'Apply patch', 'Apply base']);
    });

    test('SDK matches the snapshot', async () => {
      expect(await fixture.getFileContent('global.json')).toMatchInlineSnapshot(`
"{
  "sdk": {
    "version": "8.0.100-preview.6.23330.14"
  }
}
"
`);
    });

    test('packages matches the snapshot', async () => {
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchSnapshot();
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

    test('outputs that the branch was not rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('false');
    });

    test('matches the snapshot', async () => {
      expect(await fixture.getFileContent('global.json')).toMatchSnapshot();
    });
  });
});
