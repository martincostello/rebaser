// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { ActionFixture } from './ActionFixture';

describe('rebaser', () => {
  let fixture: ActionFixture;

  beforeAll(async () => {
    const randomString = () => Math.random().toString(36).substring(7);
    const baseBranch = randomString();
    const headBranch = randomString();

    fixture = new ActionFixture(baseBranch);
    await fixture.initialize();

    const globalJson = (version: string) => `{
      "sdk":{
        "version":"${version}"
      }
    }`;

    const globalJsonName = 'global.json';

    await fixture.checkout(baseBranch, true);
    await fixture.writeFile(globalJsonName, globalJson('7.0.100'));
    await fixture.commit('Add global.json');

    await fixture.checkout(headBranch, true);
    await fixture.writeFile(globalJsonName, globalJson('8.0.100'));
    await fixture.commit('Update .NET SDK to 8.0.100');

    await fixture.checkout(baseBranch);
    await fixture.writeFile(globalJsonName, globalJson('7.0.101'));
    await fixture.commit('Update .NET SDK to 7.0.101');

    await fixture.checkout(headBranch);
  });

  afterAll(async () => {
    await fixture.destroy();
  });

  describe('running the action', () => {
    beforeAll(async () => {
      await fixture.run();
    }, 30000);

    test('generates no errors', () => {
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    test('outputs that the branch was rebased', () => {
      expect(fixture.getOutput('rebased')).toBe('true');
    });

    test('rebases the branch', async () => {
      expect(await fixture.commitHistory(3)).toEqual(['Update .NET SDK to 8.0.100', 'Update .NET SDK to 7.0.101', 'Add global.json']);
    });

    test('output logs', async () => {
      expect(fixture.logs).toEqual([]);
    });
  });
});
