import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { SessionMiddleware } from './sessions/session.middleware';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { RulesController } from './rules/rules.controller';
import { RulesService } from './rules/rules.service';
import { ReceiptsController } from './receipts/receipts.controller';
import { ReceiptsService } from './receipts/receipts.service';
import { SpendingController } from './spending/spending.controller';
import { SpendingService } from './spending/spending.service';
import { StreaksController } from './streaks/streaks.controller';
import { StreaksService } from './streaks/streaks.service';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [OnboardingController, DashboardController, RulesController, ReceiptsController, SpendingController, StreaksController, HealthController],
  providers: [DatabaseService, OnboardingService, DashboardService, RulesService, ReceiptsService, SpendingService, StreaksService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SessionMiddleware).forRoutes(OnboardingController, DashboardController, RulesController, ReceiptsController, SpendingController, StreaksController);
  }
}
