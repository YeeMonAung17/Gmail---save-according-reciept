const paths = {
  leaf: 'M20 4C10 2 3 7 4 14c.6 5 7 7 11 3 3-3 5-8 5-13ZM5 19 15 9',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
  wallet: 'M4 5h14v4M3 9h18v11H3V5h14m0 10h4',
  mail: 'M3 5h18v14H3V5Zm0 0 9 7 9-7',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  check: 'm5 12 4 4L19 6',
  house: 'm3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
  car: 'M4 11 6 5h12l2 6M3 11h18v8H3v-8Zm3 4h1m10 0h1M6 19v2m12-2v2',
  travel: 'm3 10 8 2 7 7 2-2-5-7 5-7-2-1-7 7-7-1-1 2Z',
  custom: 'm5 16 11-11 3 3L8 19H5v-3Zm9-9 3 3',
  access: 'M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 8h16M12 8v6m0 0-5 8m5-8 5 8',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
} as const;

export function Icon({ name, size = 22 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
