import { open_db } from './db';
import { app } from './app';

const port = parseInt(process.env.PORT ?? '3000', 10);

open_db(process.env.DB_PATH ?? 'waitlist.db');

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`Waitlist API listening on port ${port}`);
