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
      expect(await fixture.getFileContent('global.json')).toMatchInlineSnapshot(`
"{
  "sdk": {
    "version": "8.0.100-preview.6.23330.14"
  }
}
"
`);
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
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchInlineSnapshot(`
"<Project>
  <ItemGroup>
    <PackageVersion Include="System.Text.Json" Version="8.0.0-preview.6.23329.7" />
  </ItemGroup>
</Project>
"
`);
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
      expect(await fixture.getFileContent('package.json')).toMatchInlineSnapshot(`
"{
  "name": "rebaser",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@microsoft/signalr": "^8.0.0-preview.6.23329.11"
  }
}
"
`);
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
      expect(await fixture.getFileContent('Directory.Packages.props')).toMatchInlineSnapshot(`
"<Project>
  <ItemGroup>
    <!-- A comment added in the patch -->
    <PackageVersion Include="Alexa.NET" Version="1.22.0" />
    <PackageVersion Include="Amazon.Lambda.Core" Version="2.1.0" />
    <PackageVersion Include="Amazon.Lambda.Logging.AspNetCore" Version="3.1.0" />
    <PackageVersion Include="Amazon.Lambda.RuntimeSupport" Version="1.8.8" />
    <PackageVersion Include="Amazon.Lambda.Serialization.Json" Version="2.1.1" />
    <PackageVersion Include="Amazon.Lambda.TestUtilities" Version="2.0.0" />
    <PackageVersion Include="AWSSDK.Lambda" Version="3.7.200.1" />
    <PackageVersion Include="coverlet.msbuild" Version="6.0.0" />
    <PackageVersion Include="GitHubActionsTestLogger" Version="2.3.2" />
    <PackageVersion Include="JustEat.HttpClientInterception" Version="4.0.0" />
    <PackageVersion Include="MartinCostello.Logging.XUnit" Version="0.3.0" />
    <PackageVersion Include="MartinCostello.Testing.AwsLambdaTestServer" Version="0.7.1" />
    <PackageVersion Include="Microsoft.ApplicationInsights" Version="2.21.0" />
    <PackageVersion Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0-preview.6.23329.7" />
    <!-- A comment in the middle of the conflict range -->
    <PackageVersion Include="Microsoft.Extensions.Http" Version="8.0.0-preview.6.23329.7" />
    <PackageVersion Include="Microsoft.Extensions.Http.Polly" Version="8.0.0-preview.6.23329.11" />
    <PackageVersion Include="Microsoft.Extensions.Logging" Version="8.0.0-preview.6.23329.7" />
    <PackageVersion Include="Microsoft.ICU.ICU4C.Runtime" Version="72.1.0.1" />
    <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="17.6.3" />
    <PackageVersion Include="Moq" Version="4.18.4" />
    <PackageVersion Include="Polly" Version="7.2.4" />
    <PackageVersion Include="Refit" Version="7.0.0" />
    <PackageVersion Include="ReportGenerator" Version="5.1.23" />
    <PackageVersion Include="Shouldly" Version="4.2.1" />
    <PackageVersion Include="StyleCop.Analyzers" Version="1.2.0-beta.507" />
    <PackageVersion Include="System.Text.Json" Version="8.0.0-preview.6.23329.7" />
    <PackageVersion Include="xunit" Version="2.5.0" />
    <PackageVersion Include="xunit.runner.visualstudio" Version="2.5.0" />
    <PackageVersion Include="Xunit.SkippableFact" Version="1.4.13" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="StyleCop.Analyzers" PrivateAssets="All" />
  </ItemGroup>
  <ItemGroup Condition=" '$(IsTestProject)' == 'true' ">
    <PackageReference Include="coverlet.msbuild" PrivateAssets="All" />
    <PackageReference Include="ReportGenerator" PrivateAssets="All" />
  </ItemGroup>
</Project>
"
`);
    });
  });
});
