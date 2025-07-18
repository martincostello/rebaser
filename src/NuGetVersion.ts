// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

const prereleaseMarker = '-';
const versionMarker = '.';

export class NuGetVersion {
  constructor(
    public major = -1,
    public minor = -1,
    public patch = -1,
    public build = -1,
    public prerelease = ''
  ) {}

  public static tryParse(value: string): NuGetVersion | null {
    if (!value) {
      return null;
    }

    let prerelease = '';

    let chunks = value.split(prereleaseMarker);
    if (chunks.length > 1) {
      prerelease = chunks.slice(1).join(prereleaseMarker);
    }

    const isValid = (s: string): number => {
      const part = parseInt(s, 10);
      return isNaN(part) || part < 0 ? -1 : part;
    };

    chunks = chunks[0].split(versionMarker);

    if (chunks.length < 1) {
      return null;
    }

    const major = isValid(chunks[0]);
    if (major < 0) {
      return null;
    }

    let minor = -1;
    let patch = -1;
    let build = -1;

    if (chunks.length > 1) {
      minor = isValid(chunks[1]);
      if (minor < 0) {
        return null;
      }
    }

    if (chunks.length > 2) {
      patch = isValid(chunks[2]);
      if (patch < 0) {
        return null;
      }
    }

    if (chunks.length > 3) {
      build = isValid(chunks[3]);
      if (build < 0) {
        return null;
      }
    }

    return new NuGetVersion(major, minor, patch, build, prerelease);
  }

  public compareTo(other: NuGetVersion): number {
    if (this.major !== other.major) {
      return this.major > other.major ? 1 : -1;
    } else if (this.minor !== other.minor) {
      return this.minor > other.minor ? 1 : -1;
    } else if (this.patch !== other.patch) {
      return this.patch > other.patch ? 1 : -1;
    } else if (this.build !== other.build) {
      return this.build > other.build ? 1 : -1;
    } else if (this.prerelease && other.prerelease) {
      // Break the components down into parts and compare
      // numerically so that 1000 is greater than 999 etc.
      const thisParts = this.prerelease.split('.');
      const otherParts = other.prerelease.split('.');

      if (thisParts.length === otherParts.length) {
        for (let i = 0; i < thisParts.length; i++) {
          const thisPart = thisParts[i];
          const otherPart = otherParts[i];

          const radix = 10;
          const thisPartNumber = parseInt(thisPart, radix);
          const otherPartNumber = parseInt(otherPart, radix);

          if (isNaN(thisPartNumber) || isNaN(otherPartNumber)) {
            // If the parts are not numbers, compare them as strings;
            // if they are equal, continue processing otherwise stop.
            const comparison = thisPart.localeCompare(otherPart);
            if (comparison !== 0) {
              return comparison;
            }
          } else {
            if (thisPartNumber !== otherPartNumber) {
              return thisPartNumber > otherPartNumber ? 1 : -1;
            }
          }
        }
      }

      return this.prerelease.localeCompare(other.prerelease);
    }
    return this.prerelease ? -1 : other.prerelease ? 1 : 0;
  }

  public toString(): string {
    const parts = [this.major, this.minor, this.patch, this.build];
    const version = parts.filter((p) => p > -1).join(versionMarker);
    return this.prerelease ? `${version}-${this.prerelease}` : version;
  }
}
