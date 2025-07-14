import morgan from 'morgan';
import { Request, Response } from 'express';
import accessLogStream from './stream';
import { getOperationName } from '~/libs/logger/utils';

morgan.token('operation_name', (req) => getOperationName((req as Request).body));

const gdprSafeJsonFormat = (tokens: any, req: Request, res: Response) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    type: 'access',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    content_length: Number(tokens.res(req, res, 'content-length')) || 0,
    response_time_ms: Number(tokens['response-time'](req, res)),
    operation_name: tokens.operation_name(req, res),
  });
};

export const configureMorgan = () => {
  if (accessLogStream) {
    return morgan(gdprSafeJsonFormat, { stream: accessLogStream });
  } else {
    return morgan('combined'); // Will use console
  }
};