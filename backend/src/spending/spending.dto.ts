import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SpendingDto {
  @IsUUID('4') id!: string;
  @IsString() @MaxLength(20) amount!: string;
  @IsString() @MinLength(1) @MaxLength(80) description!: string;
}
