import { Body, Controller, Post, Req } from '@nestjs/common';
import { SessionRequest } from '../sessions/session.middleware';
import { ReceiptDto } from './receipts.dto';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly service: ReceiptsService) {}
  @Post('simulate') simulate(
    @Req() request: SessionRequest,
    @Body() input: ReceiptDto,
  ) {
    return this.service.simulate(request.sessionId, input);
  }
}
