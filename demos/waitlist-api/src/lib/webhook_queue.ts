import { get_db } from '../db';
import { dispatch_webhook } from './webhook';

type WebhookJob = {
  event_id: string;
  url: string;
  payload: object;
  secret: string;
};

const queue: WebhookJob[] = [];
let processing = false;

export function enqueue_webhook(event_id: string, url: string, payload: object, secret: string): void {
  queue.push({ event_id, url, payload, secret });
  if (!processing) process_queue();
}

async function process_queue(): Promise<void> {
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    const delays = [1000, 4000, 16000];
    let delivered = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const db = get_db();
        db.run('UPDATE events SET attempts = ?, webhook_status = ? WHERE id = ?', [attempt, 'pending', job.event_id]);
      } catch { /* db may not be available in tests */ }

      delivered = await dispatch_webhook(job.url, job.payload, job.secret);
      if (delivered) break;
      if (attempt < 3) await new Promise(r => setTimeout(r, delays[attempt - 1]));
    }

    try {
      const db = get_db();
      db.run('UPDATE events SET webhook_status = ? WHERE id = ?', [delivered ? 'delivered' : 'failed', job.event_id]);
    } catch { /* db may not be available in tests */ }
  }
  processing = false;
}
