import { Body, Controller, Post, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { StreaksService } from './streaks.service';

class EmptyDto {}

@Controller()
export class StreaksController {
  constructor(private readonly service: StreaksService) {}
  @Post('days/close') close(
    @Req() request: SessionRequest,
    @Body() _input: EmptyDto,
  ) {
    return this.service.close(request.sessionId);
  }
  @Post('demo/advance-day') advance(
    @Req() request: SessionRequest,
    @Body() _input: EmptyDto,
  ) {
    return this.service.advance(request.sessionId);
  }
}
