import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AssistantMessageDto {
  @IsIn(['user', 'assistant']) role!: 'user' | 'assistant';
  @IsString() @Matches(/\S/) @MaxLength(1000) content!: string;
}

export class AssistantDto {
  @IsBoolean() includeBudget = false;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(11)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages!: AssistantMessageDto[];
}
