
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const now = new Date();
  
  // Return standard time formats to be compatible with your TimeService
  return response.status(200).json({
    datetime: now.toISOString(),
    unixtime: Math.floor(now.getTime() / 1000),
    milliSeconds: now.getTime()
  });
}
