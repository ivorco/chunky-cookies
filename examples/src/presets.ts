function makeJSON(approxBytes: number): string {
  const items: Array<{ id: number; label: string; active: boolean }> = [];
  while (JSON.stringify({ items }).length < approxBytes) {
    items.push({
      id: items.length,
      label: `item-${items.length}`,
      active: items.length % 2 === 0,
    });
  }
  return JSON.stringify({ generated: true, count: items.length, items }, null, 2);
}

export const PRESETS = {
  tiny: () => makeJSON(200),
  small: () => makeJSON(1200),
  medium: () => makeJSON(4000),
  large: () => makeJSON(10000),
  huge: () => makeJSON(20000),
} as const;

export type PresetName = keyof typeof PRESETS;

export function makeHugeStorePayload(): string {
  const items = Array.from({ length: 150 }, (_, i) => ({
    id: i,
    key: `setting-${i}`,
    value: `This is setting number ${i} with some extra padding content to make the payload larger`,
    enabled: i % 2 === 0,
    meta: { created: "2024-01-01", version: i, tags: [`tag-${i}`, `group-${Math.floor(i / 10)}`] },
  }));
  return JSON.stringify({ huge: true, count: items.length, items });
}
