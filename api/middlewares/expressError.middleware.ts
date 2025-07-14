import { Request, Response, NextFunction } from "express";
import accessLogStream from "~/libs/logger/stream";
import { getOperationName } from "~/libs/logger/utils";

export const expressErrorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Calculate response time if not available
  const responseTime = Date.now() - (req as any).startTime || 0;

  const statusCode = error.status || error.statusCode || 500;
  const contentLength = 0; // Error responses typically have minimal content

  const errorLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    type: 'express',
    method: req.method,
    url: req.url,
    status: statusCode,
    response_time_ms: responseTime,
    content_length: contentLength,
    operation_name: getOperationName(req.body),
    error: {
      message: error.message || 'Unknown error',
      code: error.code || 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });

  if (accessLogStream) {
    accessLogStream.write(errorLog + '\n');
  } else {
    // console.log(errorLog);
  }

  // Send error response if not already sent
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};