import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { today } from '../domain/dates';

export type SessionRequest = Request & { sessionId: string };

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly database: DatabaseService) {}

  use(request: SessionRequest, response: Response, next: NextFunction): void {
    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('recurrsave_session='));
    let id = cookie?.slice('recurrsave_session='.length);
    if (!id || !/^[a-f0-9-]{36}$/.test(id) || !this.database.exists(id)) {
      id = randomUUID();
      this.database.create(id, {
        draft: null,
        plan: null,
        rules: [],
        entries: [],
        days: [],
        boosts: [],
        demoDate: process.env.DEMO_ENABLED === 'false' ? null : today(),
      });
      response.cookie('recurrsave_session', id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api',
      });
    }
    request.sessionId = id;
    response.setHeader('Cache-Control', 'no-store');
    next();
  }
}
