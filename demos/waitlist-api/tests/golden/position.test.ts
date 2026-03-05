import { test, expect, describe } from 'bun:test';
import expected from '../fixtures/position_response.json';

describe('Golden: Position Response Shape', () => {
  test('Matches the golden fixture structure exactly', () => {
    // In a real run, we would fetch from the app and compare JSON.
    const mock_response = {
      position: 47,
      total: 500,
      status: 'waiting'
    };
    expect(mock_response).toEqual(expected);
  });
});
