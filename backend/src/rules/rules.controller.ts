import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { RulesDto } from './rules.dto';
import { RulesService } from './rules.service';

@Controller('rules')
export class RulesController {
  constructor(private readonly service: RulesService) {}
  @Get() get(@Req() request: SessionRequest) {
    return this.service.get(request.sessionId);
  }
  @Put() save(@Req() request: SessionRequest, @Body() input: RulesDto) {
    return this.service.save(request.sessionId, input.rules);
  }
}
