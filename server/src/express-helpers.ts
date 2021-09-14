import type { NextFunction, RequestHandler, Response } from 'express';

export function asyncHandler<Body = Record<string, unknown>>(
  handler: (request: Req<Body>, response: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler(request as any, response, next).catch(next);
  };
}
