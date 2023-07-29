// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import { basename, dirname } from 'path';

import { tryParseVersion } from './VersionParser';
import { exec } from '@actions/exec';

async function tryResolveNpmLockFileConflicts(path: string): Promise<boolean> {
  const cwd = dirname(path);

  core.debug(`Deleting existing lock file from '${cwd}'`);
  await fs.promises.rm(path);

  core.debug(`Regenerating lock file in '${cwd}'`);
  const exitCode = await exec('npm', ['install'], { cwd });

  if (exitCode !== 0) {
    core.debug(`npm install failed with error ${exitCode}`);
    return false;
  }

  return true;
}

const encoding = 'utf8';
const markers = {
  theirs: '<<<<<<<',
  midpoint: '=======',
  ours: '>>>>>>>',
};

async function tryResolvePackageConflicts(path: string): Promise<boolean> {
  const contents = await fs.promises.readFile(path, { encoding });

  const crlf = contents.includes('\r\n');
  const newLine = crlf ? '\r\n' : '\n';
  core.debug(`New line format is ${crlf ? 'Windows' : 'Unix'}`);

  const lines = contents.split(newLine);

  const conflicts = lines.filter((p) => p.startsWith(markers.theirs)).length;
  const merged: string[] = [];
  let line = 0;

  for (let i = 0; i < conflicts; i++) {
    const theirIndex = lines.findIndex((p, index) => index > line && p.startsWith(markers.theirs));
    const midpoint = lines.findIndex((p, index) => index > line && p.startsWith(markers.midpoint));
    const ourIndex = lines.findIndex((p, index) => index > line && p.startsWith(markers.ours));

    merged.push(...lines.slice(line, theirIndex));

    const theirs = lines.slice(theirIndex + 1, midpoint);
    const ours = lines.slice(midpoint + 1, ourIndex);

    let resolvedConflict = false;

    if (theirs.length === ours.length) {
      for (let j = 0; j < theirs.length; j++) {
        const theirLine = theirs[j];
        const ourLine = ours[j];

        if (ourLine === theirLine) {
          merged.push(ourLine);
          resolvedConflict = true;
          continue;
        }

        const theirVersion = tryParseVersion(theirLine);
        const ourVersion = tryParseVersion(ourLine);

        if (theirVersion && ourVersion) {
          if (theirVersion.compareTo(ourVersion) > 0) {
            merged.push(theirLine);
            core.debug(`Resolved conflict with their version '${theirVersion.toString()}'`);
          } else {
            merged.push(ourLine);
            core.debug(`Resolved conflict with our version '${ourVersion.toString()}'`);
          }
          resolvedConflict = true;
        }
      }
    }

    if (!resolvedConflict) {
      return false;
    }

    line = ourIndex + 1;
  }

  merged.push(...lines.slice(line));

  const mergedContents = merged.join(newLine);

  await fs.promises.writeFile(path, mergedContents, { encoding });

  return true;
}

export async function tryResolveConflicts(path: string): Promise<boolean> {
  core.debug(`Attempting to resolve conflicts in '${path}'`);
  if (basename(path).endsWith('package-lock.json')) {
    return await tryResolveNpmLockFileConflicts(path);
  } else {
    return await tryResolvePackageConflicts(path);
  }
}
