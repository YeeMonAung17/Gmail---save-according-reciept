import { IsIn, IsUUID } from 'class-validator';
import { Merchant } from '../domain/models';

export class ReceiptDto {
  @IsIn(['playstation', 'gym', 'adobe']) merchant!: Merchant;
  @IsUUID('4') messageId!: string;
}
