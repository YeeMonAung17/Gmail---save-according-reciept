import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get() get() { return { status: this.database.health() ? 'ok' : 'unavailable', storage: 'sqlite', mode: 'simulated banking' }; }
}
