import { Controller, Delete, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { SessionRequest } from './session.middleware';

@Controller('session')
export class SessionController {
  constructor(private readonly database: DatabaseService) {}

  @Delete()
  reset(
    @Req() request: SessionRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.database.delete(request.sessionId);
    response.clearCookie('recurrsave_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api',
    });
    return { reset: true };
  }
}
