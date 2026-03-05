import { expect, test, describe } from 'bun:test';
import * as fc from 'fast-check';
import { apply } from '../src/index.ts';

describe('Property Tests', () => {
  test('Adding and removing the same field is idempotent for objects', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.jsonValue()), fc.string(), fc.jsonValue(), (doc, key, value) => {
        if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return;
        if (key === '__proto__' || key === 'constructor' || key.includes('/') || key.includes('~')) return;
        
        const path = `/${key}`;
        const patchAdd = [{ op: 'add', path, value }];
        const patchRemove = [{ op: 'remove', path }];
        
        const added = apply(doc, patchAdd);
        if (!added.ok) return;
        
        const removed = apply(added.value, patchRemove);
        expect(removed.ok).toBe(true);
      })
    );
  });

  test('Adding an item to an array increases its length by 1', () => {
    fc.assert(
      fc.property(fc.array(fc.jsonValue()), fc.jsonValue(), (arr, value) => {
        const path = '/-';
        const patch = [{ op: 'add', path, value }];
        const result = apply(arr, patch);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect((result.value as any[]).length).toBe(arr.length + 1);
        }
      })
    );
  });

  test('Applying an empty patch returns the document unchanged', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (doc) => {
        const result = apply(doc, []);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual(doc);
        }
      })
    );
  });
});
