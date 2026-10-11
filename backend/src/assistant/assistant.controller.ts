import { Body, Controller, Post, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { AssistantDto } from './assistant.dto';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post() chat(@Req() request: SessionRequest, @Body() input: AssistantDto) {
    return this.service.chat(
      request.sessionId,
      input.messages,
      input.includeBudget,
    );
  }
}
