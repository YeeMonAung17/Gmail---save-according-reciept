import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Merchant } from '../domain/models';

export class RuleDto {
  @IsIn(['playstation', 'gym', 'adobe']) merchant!: Merchant;
  @IsBoolean() enabled!: boolean;
  @IsIn(['round5', 'round10', 'percentage']) strategy!:
    'round5' | 'round10' | 'percentage';
  @IsInt() @Min(0) @Max(100) percentage!: number;
  @IsBoolean() essential!: boolean;
}

export class RulesDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules!: RuleDto[];
}
