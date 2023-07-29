// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { XMLParser } from 'fast-xml-parser';
import { NuGetVersion } from './NuGetVersion';

function tryParseVersionFromJson(value: string): NuGetVersion | null {
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
          return version;
        }
      }
    }
  } catch (error: any) {
    // Not valid JSON
  }

  return null;
}

function tryParseVersionFromXml(value: string): NuGetVersion | null {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });
    const fragment = parser.parse(value);
    const version = (fragment?.PackageVersion || fragment?.PackageReference)?.['@Version'];
    if (version) {
      return NuGetVersion.tryParse(version);
    }
  } catch (error: any) {
    // Not a valid XML fragment
  }

  return null;
}

export function tryParseVersion(value: string): NuGetVersion | null {
  let version = tryParseVersionFromXml(value);
  if (!version) {
    version = tryParseVersionFromJson(value);
  }

  return version;
}
