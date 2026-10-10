import { Body, Controller, Post, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { SpendingDto } from './spending.dto';
import { SpendingService } from './spending.service';

@Controller('spending')
export class SpendingController {
  constructor(private readonly service: SpendingService) {}
  @Post() add(@Req() request: SessionRequest, @Body() input: SpendingDto) { return this.service.add(request.sessionId, input); }
}
