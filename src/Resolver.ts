// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import { basename, dirname } from 'path';

import { Dependency, tryParseVersion } from './VersionParser';
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

function tryResolvePackageByLine(theirLine: string, ourLine: string): string | null {
  const theirs = tryParseVersion(theirLine);
  const ours = tryParseVersion(ourLine);

  if (theirs && ours && theirs.name === ours.name) {
    if (theirs.version.compareTo(ours.version) > 0) {
      core.debug(`Resolved conflict for ${theirs.name} with their version: ${theirs.version.toString()}`);
      return theirLine;
    } else {
      core.debug(`Resolved conflict for ${ours.name} with our version: ${ours.version.toString()}`);
      return ourLine;
    }
  }

  return null;
}

type Line = {
  dependency: Dependency | null;
  index: number;
  value: string;
};

type Chunk = {
  lines: Line[];
  dependencies: Record<string, Dependency>;
};

function parseChunk(chunk: string[]): Chunk {
  const result: Chunk = {
    lines: [],
    dependencies: {},
  };

  for (let i = 0; i < chunk.length; i++) {
    const value = chunk[i];
    const line = {
      dependency: tryParseVersion(value),
      index: i,
      value,
    };
    if (line.dependency) {
      result.dependencies[line.dependency.name] = line.dependency;
    }
    result.lines.push(line);
  }

  return result;
}

function tryResolvePackageByChunk(theirs: string[], ours: string[]): string[] | null {
  const theirChunk = parseChunk(theirs);
  const ourChunk = parseChunk(ours);

  const result: string[] = [];

  for (const line of ourChunk.lines) {
    const ourDependency = line.dependency;
    let resolved = false;
    if (ourDependency) {
      const theirDependency = theirChunk.dependencies[ourDependency.name];
      if (theirDependency) {
        if (ourDependency.name === theirDependency.name) {
          if (theirDependency.version.compareTo(ourDependency.version) > 0) {
            core.debug(`Resolved conflict for ${theirDependency.name} with their version: ${theirDependency.version.toString()}`);
            const theirLine = theirChunk.lines.find((p) => p.dependency?.name === theirDependency.name)?.value;
            if (theirLine) {
              result.push(theirLine);
              resolved = true;
            }
          } else {
            core.debug(`Resolved conflict for ${ourDependency.name} with our version: ${ourDependency.version.toString()}`);
            result.push(line.value);
            resolved = true;
          }
        }
      } else {
        result.push(line.value);
        resolved = true;
      }
    } else if (line.value === theirChunk.lines[line.index]?.value) {
      result.push(line.value);
      resolved = true;
    }

    if (!resolved) {
      return null;
    }
  }

  return result;
}

async function tryResolveNuGetPackageConflicts(path: string): Promise<boolean> {
  return await tryResolveFileConflicts(path, tryResolvePackageByLine, tryResolvePackageByChunk);
}

async function tryResolveDockerfileConflicts(path: string): Promise<boolean> {
  const lineResolver: LineResolver = (theirLine, ourLine) => {
    const theirs = tryParseVersion(theirLine);
    const ours = tryParseVersion(ourLine);

    if (theirs && ours && theirs.name === ours.name) {
      if (theirs.version.compareTo(ours.version) > 0) {
        core.debug(`Resolved conflict for ${theirs.name} with their version: ${theirs.version.toString()}`);
        return theirLine;
      } else {
        core.debug(`Resolved conflict for ${ours.name} with our version: ${ours.version.toString()}`);
        return ourLine;
      }
    }

    return null;
  };

  return await tryResolveFileConflicts(path, lineResolver, () => null);
}

type ChunkResolver = (theirChunk: string[], ourChunk: string[]) => string[] | null;
type LineResolver = (theirLine: string, ourLine: string) => string | null;

async function tryResolveFileConflicts(path: string, lineResolver: LineResolver, chunkResolver: ChunkResolver): Promise<boolean> {
  const contents = await fs.promises.readFile(path, { encoding });

  const crlf = contents.includes('\r\n');
  const newLine = crlf ? '\r\n' : '\n';
  core.debug(`New line format is ${crlf ? 'Windows' : 'Unix'}`);

  const lines = contents.split(newLine);

  const conflicts = lines.filter((p) => p.startsWith(markers.theirs)).length;
  const merged: string[] = [];
  let line = 0;

  for (let i = 0; i < conflicts; i++) {
    const theirIndex = lines.findIndex((p, index) => index >= line && p.startsWith(markers.theirs));
    const midpoint = lines.findIndex((p, index) => index >= line && p.startsWith(markers.midpoint));
    const ourIndex = lines.findIndex((p, index) => index >= line && p.startsWith(markers.ours));

    merged.push(...lines.slice(line, theirIndex));

    const theirs = lines.slice(theirIndex + 1, midpoint);
    const ours = lines.slice(midpoint + 1, ourIndex);

    let resolvedConflict = false;

    if (theirs.length === ours.length) {
      for (let j = 0; j < theirs.length; j++) {
        const theirLine = theirs[j];
        const ourLine = ours[j];
        const resolution = lineResolver(theirLine, ourLine);
        if (resolution) {
          merged.push(resolution);
          resolvedConflict = true;
        } else if (theirLine !== ourLine) {
          return false;
        }
      }
    } else {
      const resolution = chunkResolver(theirs, ours);
      if (resolution) {
        merged.push(...resolution);
        resolvedConflict = true;
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
  const fileName = basename(path);
  if (fileName === 'package-lock.json') {
    return await tryResolveNpmLockFileConflicts(path);
  } else if (fileName === 'Dockerfile') {
    return await tryResolveDockerfileConflicts(path);
  } else {
    return await tryResolveNuGetPackageConflicts(path);
  }
}
