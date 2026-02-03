import type { Handler, HandlerContext, HandlerEvent } from '@netlify/functions';

/**
 * Netlify Function: /api/time
 * Returns the current server time in a consistent format.
 * Used for time verification to prevent date tampering.
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const now = new Date();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      datetime: now.toISOString(),
      unixtime: Math.floor(now.getTime() / 1000),
      milliSeconds: now.getTime(),
      timezone: 'UTC',
    }),
  };
};

export { handler };
