import 'express';

declare module 'express' {
  interface Request {
    user?: { id: string };
    validated?: Record<string, unknown>;
  }
}
