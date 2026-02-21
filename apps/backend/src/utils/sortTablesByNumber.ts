export function sortTablesByNumber<T extends { number: string }>(tables: T[]): T[] {
  return [...tables].sort((a, b) =>
    String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
  );
}
