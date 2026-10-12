export interface CollationTableSearchMatch {
  row: number;
  colFrom: number;
  colTo: number;
}

export function findCollationTableSearchMatches(rows: string[][], query: string): CollationTableSearchMatch[] {
  const words = query.trim().split(/\s+/).filter(word => word !== '');
  if (words.length === 0) {
    return [];
  }

  const matches: CollationTableSearchMatch[] = [];
  rows.forEach((cells, row) => {
    for (let col = 0; col <= cells.length - words.length; col++) {
      if (words.every((word, offset) => cells[col + offset] === word)) {
        matches.push({row, colFrom: col, colTo: col + words.length - 1});
      }
    }
  });
  return matches.sort((a, b) => a.colFrom - b.colFrom || a.row - b.row);
}