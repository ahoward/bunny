import { describe, it, expect } from 'bun:test';
import { parse } from '../../src/parse';
import { format } from '../../src/format';

describe('Property: Round Trip', () => {
  it('parse(format(parse(s))) === parse(s)', () => {
    const versions = [
      '1.2.3',
      '0.0.0',
      '999.999.999',
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-0.3.7',
      '1.0.0-x.7.z.92',
      '1.0.0-alpha+001',
      '1.0.0+20130313144700',
      '1.0.0-beta+exp.sha.5114f85',
    ];
    
    for (const v of versions) {
      const parsed1 = parse(v);
      expect(parsed1.ok).toBe(true);
      if (parsed1.ok) {
        const formatted = format(parsed1.value);
        const parsed2 = parse(formatted);
        expect(parsed2).toEqual(parsed1);
      }
    }
  });
});
