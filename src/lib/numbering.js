// Product numbers as shown on the room image: detected items first (hotspot order), then the rest.
export function numberKit(kit, latest) {
  const spots = latest?.hotspots || [];
  const found = new Set(spots.map((s) => s.line_id));
  return [
    ...spots.map((s, i) => ({ n: i + 1, line: kit.find((l) => l.line_id === s.line_id), spot: s, visible: true })),
    ...kit.filter((l) => !found.has(l.line_id)).map((l, i) => ({ n: spots.length + i + 1, line: l, spot: null, visible: false })),
  ].filter((x) => x.line);
}