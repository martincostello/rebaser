// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { ActionFixture } from './ActionFixture';

describe('rebaser', () => {
  const rebaseTimeout = 15000;
  const createFixture = async (): Promise<ActionFixture> => {
    const fixture = new ActionFixture();
    await fixture.initialize();
    return fixture;
  };

  describe('when global.json has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await createFixture();
      await fixture.setupRepositoryFromFixture('global.json');
    });

    afterAll(async () => {
      await fixture.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, rebaseTimeout);

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

      test('has the correct SDK version', async () => {
        expect(await fixture.getFileContent('global.json')).toMatchInlineSnapshot(`
"{
  "sdk": {
    "version": "8.0.100"
  }
}
"
`);
      });
    });
  });

  describe('when Directory.Packages.props has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await createFixture();
      await fixture.setupRepositoryFromFixture('Directory.Packages.props');
    });

    afterAll(async () => {
      await fixture.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, rebaseTimeout);

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

      test('has the correct dependencies', async () => {
        expect(await fixture.getFileContent('Directory.Packages.props')).toMatchInlineSnapshot(`
"<Project>
  <ItemGroup>
    <PackageVersion Include="System.Text.Json" Version="8.0.0" />
  </ItemGroup>
</Project>
"
`);
      });
    });
  });
});
