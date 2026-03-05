import { expect, test, describe } from 'bun:test';
import { apply } from '../src/index.ts';

describe('Boundary and Edge Case Tests', () => {
  describe('Security: Prototype Pollution', () => {
    test('Rejects prototype pollution via __proto__', () => {
      const doc = {};
      const patch = [{ op: 'add', path: '/__proto__/isAdmin', value: true }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(false);
      expect(({} as any)['isAdmin']).toBeUndefined();
    });
    test('Rejects prototype pollution via constructor', () => {
      const doc = {};
      const patch = [{ op: 'add', path: '/constructor/prototype/isAdmin', value: true }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(false);
      expect(({} as any)['isAdmin']).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('EC-001: "-" token used with remove', () => {
      const result = apply({ list: [1, 2] }, [{ op: 'remove', path: '/list/-' }]);
      expect(result.ok).toBe(false);
    });

    test('Challenge: remove root document', () => {
      const result = apply({ a: 1 }, [{ op: 'remove', path: '' }]);
      expect(result.ok).toBe(false);
    });

    test('Challenge: copy from nonexistent path', () => {
      const result = apply({ a: 1 }, [{ op: 'copy', from: '/nonexistent', path: '/b' }]);
      expect(result.ok).toBe(false);
    });

    test('Challenge: move from equals path fails if nonexistent', () => {
      const result = apply({ a: 1 }, [{ op: 'move', from: '/b', path: '/b' }]);
      expect(result.ok).toBe(false);
    });

    test('Challenge: copy into own subtree', () => {
      const result = apply({ a: {} }, [{ op: 'copy', from: '/a', path: '/a/b' }]);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: { b: {} } });
    });

    test('Challenge: malformed payload (object instead of array)', () => {
      const result = apply({ a: 1 }, { op: 'add', path: '/b', value: 2 } as any);
      expect(result.ok).toBe(false);
    });

    test('Challenge: invalid array index -0', () => {
      const result = apply({ list: [1, 2, 3] }, [{ op: 'add', path: '/list/-0', value: 4 }]);
      expect(result.ok).toBe(false);
    });

    test('Challenge: NaN is not valid JSON value', () => {
      const result = apply({}, [{ op: 'add', path: '/badNum', value: NaN }]);
      expect(result.ok).toBe(false);
    });

    test('Challenge: malformed JSON Pointer syntax', () => {
      const result = apply({ a: 1 }, [{ op: 'test', path: 'a', value: 1 }]);
      expect(result.ok).toBe(false);
    });
  });
});
