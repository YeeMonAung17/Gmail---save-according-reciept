import { IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { GoalKind } from '../domain/models';

export class OnboardingDto {
  @IsString() @MaxLength(20) income!: string;
  @IsString() @MaxLength(20) rent!: string;
  @IsString() @MaxLength(20) utilities!: string;
  @IsString() @MaxLength(20) groceries!: string;
  @IsString() @MaxLength(20) bills!: string;
  @IsIn(['amount', 'percentage']) emergencyMode!: 'amount' | 'percentage';
  @IsString() @MaxLength(20) emergency!: string;
  @IsIn(['house', 'car', 'travel', 'custom']) goalKind!: GoalKind;
  @IsString() @MaxLength(60) goalName!: string;
  @IsString() @MaxLength(20) target!: string;
  @IsString() @MaxLength(10) targetDate!: string;
  @IsIn(['round5', 'round10', 'percentage']) initialRule!: 'round5' | 'round10' | 'percentage';
  @IsInt() @Min(1) @Max(5) step!: number;
  @IsBoolean() complete!: boolean;
}
