import { expect, test, describe } from 'bun:test';
import { apply } from '../src/index.ts';

describe('Contract Tests - Core Operations', () => {
  describe('US-001: Add operation', () => {
    test('Add a new field to a top-level object', () => {
      const doc = { name: 'Alice' };
      const patch = [{ op: 'add', path: '/age', value: 30 }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'Alice', age: 30 });
    });
    test('Add a nested field to an existing parent', () => {
      const doc = { a: { b: 1 } };
      const patch = [{ op: 'add', path: '/a/c', value: 2 }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: { b: 1, c: 2 } });
    });
    test('Add replaces an existing field', () => {
      const doc = { name: 'Alice' };
      const patch = [{ op: 'add', path: '/name', value: 'Bob' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'Bob' });
    });
    test('Add to an array by index', () => {
      const doc = { list: [1, 2, 3] };
      const patch = [{ op: 'add', path: '/list/1', value: 99 }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ list: [1, 99, 2, 3] });
    });
    test('Add to end of array using - token', () => {
      const doc = { list: [1, 2] };
      const patch = [{ op: 'add', path: '/list/-', value: 3 }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ list: [1, 2, 3] });
    });
    test('Add replaces the entire document at root', () => {
      const doc = { old: true };
      const patch = [{ op: 'add', path: '', value: { new: true } }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ new: true });
    });
  });

  describe('US-002: Remove operation', () => {
    test('Remove a field from an object', () => {
      const doc = { a: 1, b: 2 };
      const patch = [{ op: 'remove', path: '/b' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: 1 });
    });
    test('Remove an element from an array', () => {
      const doc = { list: [1, 2, 3] };
      const patch = [{ op: 'remove', path: '/list/1' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ list: [1, 3] });
    });
    test('Remove a deeply nested field', () => {
      const doc = { a: { b: { c: 3 } } };
      const patch = [{ op: 'remove', path: '/a/b/c' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: { b: {} } });
    });
  });

  describe('US-003: Replace operation', () => {
    test('Replace a top-level field', () => {
      const doc = { name: 'Alice' };
      const patch = [{ op: 'replace', path: '/name', value: 'Bob' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ name: 'Bob' });
    });
    test('Replace an array element', () => {
      const doc = { list: [1, 2, 3] };
      const patch = [{ op: 'replace', path: '/list/0', value: 99 }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ list: [99, 2, 3] });
    });
    test('Replace the root document', () => {
      const doc = [1, 2, 3];
      const patch = [{ op: 'replace', path: '', value: { replaced: true } }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ replaced: true });
    });
  });

  describe('US-004: Move operation', () => {
    test('Move a field within an object', () => {
      const doc = { a: 1, b: { c: 2 } };
      const patch = [{ op: 'move', from: '/a', path: '/b/d' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ b: { c: 2, d: 1 } });
    });
    test('Move an array element (index shifting)', () => {
      const doc = { a: [1, 2, 3] };
      const patch = [{ op: 'move', from: '/a/0', path: '/a/1' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: [2, 1, 3] });
    });
    test('Move between unrelated paths', () => {
      const doc = { source: 'value', target: {} };
      const patch = [{ op: 'move', from: '/source', path: '/target/moved' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ target: { moved: 'value' } });
    });
  });

  describe('US-005: Copy operation', () => {
    test('Copy a field', () => {
      const doc = { a: 1 };
      const patch = [{ op: 'copy', from: '/a', path: '/b' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ a: 1, b: 1 });
    });
    test('Copy produces a deep clone', () => {
      const doc = { a: { nested: [1, 2] } };
      const patch = [{ op: 'copy', from: '/a', path: '/b' }, { op: 'add', path: '/b/nested/2', value: 3 }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect((result.value as any).a.nested).toEqual([1, 2]);
        expect((result.value as any).b.nested).toEqual([1, 2, 3]);
      }
    });
  });

  describe('US-006: Test operation', () => {
    test('Test passes, subsequent operations apply', () => {
      const doc = { version: 3, name: 'old' };
      const patch = [
        { op: 'test', path: '/version', value: 3 },
        { op: 'replace', path: '/name', value: 'new' }
      ];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ version: 3, name: 'new' });
    });
    test('Test fails, entire patch rolls back', () => {
      const doc = { version: 3, name: 'old' };
      const patch = [
        { op: 'test', path: '/version', value: 5 },
        { op: 'replace', path: '/name', value: 'new' }
      ];
      const result = apply(doc, patch);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.index).toBe(0);
    });
    test('Test uses deep equality', () => {
      const doc = { data: { b: 2, a: 1 } };
      const patch = [{ op: 'test', path: '/data', value: { a: 1, b: 2 } }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(true);
    });
    test('Test rejects type coercion', () => {
      const doc = { count: 1 };
      const patch = [{ op: 'test', path: '/count', value: '1' }];
      const result = apply(doc, patch);
      expect(result.ok).toBe(false);
    });
  });

  describe('US-007: Atomic rollback on failure', () => {
    test('Rollback after mid-sequence failure', () => {
      const doc = { a: 1, b: 2 };
      const patch = [
        { op: 'replace', path: '/a', value: 99 },
        { op: 'remove', path: '/nonexistent' }
      ];
      const result = apply(doc, patch);
      expect(result.ok).toBe(false);
    });
  });
});
