// Maps the free-text distortion classification saved on each thought record to
// known cognitive-distortion categories, so we can show how often each appears.
// An entry can match more than one category (e.g. "catastrophizing + mind
// reading"), in which case each is counted.

export const DISTORTION_TYPES: { name: string; keywords: string[] }[] = [
  {
    name: 'All-or-nothing thinking',
    keywords: ['all-or-nothing', 'all or nothing', 'black and white', 'black-and-white', 'dichotomous'],
  },
  { name: 'Catastrophizing', keywords: ['catastroph'] },
  { name: 'Overgeneralization', keywords: ['overgeneral', 'generaliz'] },
  { name: 'Mind reading', keywords: ['mind read', 'mind-read'] },
  { name: 'Fortune telling', keywords: ['fortune tell', 'fortune-tell', 'predicting the future'] },
  { name: 'Emotional reasoning', keywords: ['emotional reasoning'] },
  { name: 'Should statements', keywords: ['should statement', 'should', 'ought to', 'must'] },
  { name: 'Labeling', keywords: ['labeling', 'labelling'] },
  { name: 'Personalization', keywords: ['personaliz', 'self-blame', 'my fault'] },
  { name: 'Mental filter', keywords: ['mental filter', 'filtering', 'tunnel vision'] },
  { name: 'Discounting the positive', keywords: ['discount', 'disqualif'] },
  { name: 'Magnification / minimization', keywords: ['magnif', 'minimiz'] },
];

export interface DistortionStat {
  name: string;
  count: number;
}

export function computeDistortionStats(entries: string[]): {
  stats: DistortionStat[];
  total: number;
} {
  const counts: Record<string, number> = {};
  for (const raw of entries) {
    const text = raw.toLowerCase();
    for (const type of DISTORTION_TYPES) {
      if (type.keywords.some((k) => text.includes(k))) {
        counts[type.name] = (counts[type.name] ?? 0) + 1;
      }
    }
  }
  const stats = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return { stats, total: entries.length };
}
