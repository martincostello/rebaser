// Copyright (c) Martin Costello, 2023. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { beforeAll, describe, expect, test } from '@jest/globals';
import { NuGetVersion } from '../src/NuGetVersion';

describe('NuGetVersion', () => {
  describe('parses', () => {
    describe.each([
      ['0', 0, -1, -1, -1, ''],
      ['1', 1, -1, -1, -1, ''],
      ['1.2', 1, 2, -1, -1, ''],
      ['1.2.3', 1, 2, 3, -1, ''],
      ['1.2.3.4', 1, 2, 3, 4, ''],
      ['1.2.3-alpha', 1, 2, 3, -1, 'alpha'],
      ['1.2.3-alpha.1', 1, 2, 3, -1, 'alpha.1'],
      ['1.2.3-alpha.1.2', 1, 2, 3, -1, 'alpha.1.2'],
      ['1.2.3-alpha.1.2.3', 1, 2, 3, -1, 'alpha.1.2.3'],
      ['8.0.0-preview.2.23128.3', 8, 0, 0, -1, 'preview.2.23128.3'],
      ['8.0.100-preview.2', 8, 0, 100, -1, 'preview.2'],
    ])('"%s"', (value: string, major: number, minor: number, patch: number, build: number, prelease: string) => {
      let actual: NuGetVersion | null;
      beforeAll(() => {
        actual = NuGetVersion.tryParse(value);
      });
      test('as valid', () => {
        expect(actual).not.toBeUndefined();
        expect(actual).not.toBeNull();
      });
      test('build is correct', () => {
        expect(actual?.build).toBe(build);
      });
      test('major is correct', () => {
        expect(actual?.major).toBe(major);
      });
      test('minor is correct', () => {
        expect(actual?.minor).toBe(minor);
      });
      test('patch is correct', () => {
        expect(actual?.patch).toBe(patch);
      });
      test('prerelease is correct', () => {
        expect(actual?.prerelease).toBe(prelease);
      });
    });
    test.each([[''], [' '], ['NaN'], ['-1'], ['a'], ['<'], ['a.2.3.4'], ['1.b.3.4'], ['1.2.c.4'], ['1.2.3.d']])(
      '"%s" as invalid',
      (value: string) => {
        const actual = NuGetVersion.tryParse(value);
        expect(actual).toBeNull();
      }
    );
  });
  describe('correctly compares', () => {
    test.each([
      ['1', '1.0', -1],
      ['1.0', '1', 1],
      ['1.0', '1.0.0', -1],
      ['1.0.0', '1.0', 1],
      ['1.0.0', '1.0.0.0', -1],
      ['1.0.0.0', '1.0.0', 1],
      ['1.0.0-preview.1', '1.0.0', -1],
      ['1.0.0', '1.0.0-preview.1', 1],
      ['1', '1', 0],
      ['1.0', '1.0', 0],
      ['1.0.0', '1.0.0', 0],
      ['1.0.0.0', '1.0.0.0', 0],
      ['1-alpha.1', '1-alpha.1', 0],
      ['1.0-alpha.1', '1.0-alpha.1', 0],
      ['1.0.0-alpha.1', '1.0.0-alpha.1', 0],
      ['1.0.0.0-alpha.1', '1.0.0.0-alpha.1', 0],
      ['1.0.0-alpha.1', '1.0.0-alpha.2', -1],
      ['1.0.0-alpha.2', '1.0.0-alpha.1', 1],
      ['1.0.0', '10.0.0', -1],
      ['10.0.0', '1.0.0', 1],
      ['9.0.0', '10.0.0', -1],
      ['10.0.0', '9.0.0', 1],
      ['7.0.4', '8.0.0-preview.2.23128.3', -1],
      ['8.0.0-preview.2.23128.3', '7.0.4', 1],
      ['8.0.0-preview.6.23329.11', '8.0.0-preview.7.23375.9', -1],
      ['8.0.0-preview.7.23375.9', '8.0.0-preview.6.23329.11', 1],
    ])('"%s" and "%s"', (left: string, right: string, expected: number) => {
      const first = NuGetVersion.tryParse(left);
      const second = NuGetVersion.tryParse(right);

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();

      const actual = first!.compareTo(second!) ?? NaN;
      expect(actual).toBe(expected);
    });
  });
  describe('toString', () => {
    test.each([
      ['0'],
      ['1'],
      ['1.2'],
      ['1.2.3'],
      ['1.2.3.4'],
      ['1.2.3-alpha'],
      ['1.2.3-alpha.1'],
      ['1.2.3-alpha.1.2'],
      ['1.2.3-alpha.1.2.3'],
      ['8.0.0-preview.2.23128.3'],
      ['8.0.100-preview.2'],
    ])('"%s"', (value: string) => {
      const actual = NuGetVersion.tryParse(value);
      expect(actual?.toString()).toBe(value);
    });
  });
});
