import { runDue } from '../lib/reminders.mjs';

// Runs every 5 minutes on Netlify, whether or not the app is open.
export const config = { schedule: '*/5 * * * *' };

export default async () => {
  const result = await runDue();
  console.log('reminders', JSON.stringify(result));
  return new Response('ok');
};
