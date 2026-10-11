import { Controller, Get, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get() get(@Req() request: SessionRequest) {
    return this.service.get(request.sessionId);
  }
}
