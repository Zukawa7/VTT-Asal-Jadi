import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, next): void => {
  void next;
  logger.error('Unhandled request error', { error: error instanceof Error ? error.message : String(error) });
  res.status(500).json({ error: 'Internal Server Error' });
};
