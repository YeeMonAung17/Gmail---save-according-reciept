export function money(pennies: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pennies / 100);
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export const merchantNames = { playstation: 'PlayStation Network', gym: 'Gym membership', adobe: 'Adobe Creative Cloud' };
export const goalNames = { house: 'House deposit', car: 'New car', travel: 'Holiday / travel', custom: 'Your own goal' };
