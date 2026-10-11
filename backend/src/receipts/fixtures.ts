import { Merchant } from '../domain/models';
import { DomainError, pennies } from '../domain/money';

export const receiptFixtures: Record<
  Merchant,
  { name: string; sender: string; subject: string; body: string }
> = {
  playstation: {
    name: 'PlayStation Network',
    sender: 'receipts@playstation.example',
    subject: 'Your PlayStation purchase',
    body: 'Merchant: PlayStation Network\nCurrency: GBP\nTotal: £49.49\nThank you for your purchase.',
  },
  gym: {
    name: 'Gym membership',
    sender: 'billing@gym.example',
    subject: 'Your monthly membership receipt',
    body: 'Merchant: Gym membership\nCurrency: GBP\nTotal: £32.00\nYour monthly membership.',
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    sender: 'billing@adobe.example',
    subject: 'Your Creative Cloud receipt',
    body: 'Merchant: Adobe Creative Cloud\nCurrency: GBP\nTotal: £19.49\nYour monthly subscription.',
  },
};

export function parseReceipt(body: string): number {
  const lines = body.split('\n');
  const currencies = lines.filter((line) => line.startsWith('Currency:'));
  if (currencies.length !== 1 || currencies[0] !== 'Currency: GBP')
    throw new DomainError('Only supported GBP demo receipts can be processed.');
  const totals = lines.filter((line) => line.startsWith('Total:'));
  const match =
    totals.length === 1
      ? /^Total: £(\d+(?:\.\d{1,2})?)$/.exec(totals[0])
      : null;
  if (!match)
    throw new DomainError('The receipt must contain exactly one valid total.');
  const amount = pennies(match[1]);
  if (amount === 0)
    throw new DomainError('Receipt amounts must be greater than zero.');
  return amount;
}
