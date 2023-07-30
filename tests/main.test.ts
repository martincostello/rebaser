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

  const directoryPackagesPropsName = 'Directory.Packages.props';
  const directoryPackagesProps = (nugetPackages: { name: string; version: string }[]) => {
    return `
<Project>
<ItemGroup>
${nugetPackages.map((nuget) => `    <PackageVersion Include="${nuget.name}" Version="${nuget.version}" />`).join('\n')}
</ItemGroup>
</Project>
    `;
  };

  const globalJsonName = 'global.json';
  const globalJson = (version: string) => `{
    "sdk":{
      "version":"${version}"
    }
  }`;

  describe('when global.json has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = await createFixture();
      await fixture.setupRepository(
        async () => {
          await fixture.writeFile(globalJsonName, globalJson('7.0.100'));
          await fixture.commit('Add global.json');
        },
        async () => {
          await fixture.writeFile(globalJsonName, globalJson('8.0.100'));
          await fixture.commit('Update .NET SDK to 8.0.100');
        },
        async () => {
          await fixture.writeFile(globalJsonName, globalJson('7.0.101'));
          await fixture.commit('Update .NET SDK to 7.0.101');
        }
      );
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
        expect(await fixture.commitHistory(3)).toEqual(['Update .NET SDK to 8.0.100', 'Update .NET SDK to 7.0.101', 'Add global.json']);
      });

      test('has the correct SDK version', async () => {
        const content = await fixture.getFileContent(globalJsonName);
        const globalJson = JSON.parse(content);
        expect(globalJson?.sdk?.version).toEqual('8.0.100');
      });
    });
  });

  describe('when Directory.Packages.props has conflicts', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      const systemTextJson = 'System.Text.Json';
      fixture = await createFixture();
      await fixture.setupRepository(
        async () => {
          await fixture.writeFile(directoryPackagesPropsName, directoryPackagesProps([{ name: systemTextJson, version: '7.0.0' }]));
          await fixture.commit('Add System.Text.Json');
        },
        async () => {
          await fixture.writeFile(directoryPackagesPropsName, directoryPackagesProps([{ name: systemTextJson, version: '8.0.0' }]));
          await fixture.commit('Bump System.Text.Json to 8.0.0');
        },
        async () => {
          await fixture.writeFile(directoryPackagesPropsName, directoryPackagesProps([{ name: systemTextJson, version: '7.0.1' }]));
          await fixture.commit('Bump System.Text.Json to 7.0.1');
        }
      );
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
        expect(await fixture.commitHistory(3)).toEqual([
          'Bump System.Text.Json to 8.0.0',
          'Bump System.Text.Json to 7.0.1',
          'Add System.Text.Json',
        ]);
      });

      test('has the correct dependencies', async () => {
        expect(await fixture.getFileContent(directoryPackagesPropsName)).toMatchInlineSnapshot(`
"
<Project>
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
