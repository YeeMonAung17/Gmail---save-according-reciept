import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { OnboardingDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}
  @Get() get(@Req() request: SessionRequest) { return this.service.get(request.sessionId); }
  @Put() save(@Req() request: SessionRequest, @Body() input: OnboardingDto) { return this.service.save(request.sessionId, input); }
}
