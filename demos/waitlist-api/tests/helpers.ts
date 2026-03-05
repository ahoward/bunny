import { app } from '../src/app';
import { open_db } from '../src/db';

export function create_test_app() {
  const db = open_db(':memory:');
  // Need to run schema on the in-memory db here in a real implementation
  return { app, db, api_key: 'test_key' };
}
