﻿// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { XMLParser } from 'fast-xml-parser';
import { NuGetVersion } from './NuGetVersion';

function tryParseVersionFromJson(value: string): Dependency | null {
  if (value.startsWith('<')) {
    return null;
  }

  let jsonString = value.trim();

  if (jsonString.endsWith(',')) {
    jsonString = jsonString.slice(0, -1);
  }

  if (!jsonString.startsWith('{') && !jsonString.endsWith('}')) {
    jsonString = `{${jsonString}}`;
  }

  try {
    const json = JSON.parse(jsonString);
    for (const key in json) {
      let versionString = json[key];
      if (versionString && typeof versionString === 'string') {
        if (versionString.startsWith('^') || versionString.startsWith('~')) {
          versionString = versionString.slice(1);
        }
        const version = NuGetVersion.tryParse(versionString);
        if (version) {
          return {
            name: key,
            version,
          };
        }
      }
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

function tryParseVersionFromXml(value: string): Dependency | null {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });
    const fragment = parser.parse(value);
    const element = fragment?.PackageVersion || fragment?.PackageReference;
    let version = element?.['@Version'];
    let name: string | null = null;
    if (version && element) {
      name = element['@Include'];
    } else if (fragment) {
      const keys = Object.keys(fragment);
      if (keys.length === 1) {
        name = keys[0];
        version = fragment[name];
      }
    }
    if (version) {
      const packageVersion = NuGetVersion.tryParse(version);
      if (packageVersion) {
        return {
          name: name || '',
          version: packageVersion,
        };
      }
    }
  } catch (error) {
    // Not a valid XML fragment
    // eslint-disable-next-line no-console
    console.log(`${error}`);
  }

  return null;
}

export function tryParseVersion(value: string): Dependency | null {
  let version = tryParseVersionFromXml(value);
  if (!version) {
    version = tryParseVersionFromJson(value);
  }

  return version;
}

export type Dependency = {
  name: string;
  version: NuGetVersion;
};
