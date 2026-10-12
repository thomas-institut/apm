import {describe, expect, it} from 'vitest';
import {findCollationTableSearchMatches} from '@/EditionComposer/CollationTableSearch';

describe('collation table search', () => {
  it('matches consecutive full cells in all rows, in order', () => {
    expect(findCollationTableSearchMatches([
      ['in', 'principio', 'in', 'principio'],
      ['principio', 'in', 'principium'],
      ['in', '', 'principio'],
      ['in', 'principio']
    ], '  in\tprincipio\n')).toEqual([
      {row: 0, colFrom: 0, colTo: 1},
      {row: 3, colFrom: 0, colTo: 1},
      {row: 0, colFrom: 2, colTo: 3}
    ]);
  });

  it('orders matches by starting column first and then by row', () => {
    expect(findCollationTableSearchMatches([
      ['other', 'word', 'word'],
      ['word', 'other', 'word'],
      ['word', 'word', 'word']
    ], 'word')).toEqual([
      {row: 1, colFrom: 0, colTo: 0},
      {row: 2, colFrom: 0, colTo: 0},
      {row: 0, colFrom: 1, colTo: 1},
      {row: 2, colFrom: 1, colTo: 1},
      {row: 0, colFrom: 2, colTo: 2},
      {row: 1, colFrom: 2, colTo: 2},
      {row: 2, colFrom: 2, colTo: 2}
    ]);
  });

  it('does not match substrings, different case, or cross row boundaries', () => {
    expect(findCollationTableSearchMatches([['wording', 'Word', 'word word']], 'word')).toEqual([]);
    expect(findCollationTableSearchMatches([['in'], ['principio']], 'in principio')).toEqual([]);
  });

  it('includes overlapping sequences', () => {
    expect(findCollationTableSearchMatches([['a', 'a', 'a']], 'a a')).toEqual([
      {row: 0, colFrom: 0, colTo: 1},
      {row: 0, colFrom: 1, colTo: 2}
    ]);
  });

  it('handles empty queries, empty tables and absent matches', () => {
    expect(findCollationTableSearchMatches([['a']], ' \n\t')).toEqual([]);
    expect(findCollationTableSearchMatches([], 'a')).toEqual([]);
    expect(findCollationTableSearchMatches([['a']], 'a b')).toEqual([]);
  });

  it('matches Hebrew and Arabic text exactly', () => {
    expect(findCollationTableSearchMatches([['שלום', 'עולם'], ['مرحبا', 'بالعالم']], 'שלום עולם'))
      .toEqual([{row: 0, colFrom: 0, colTo: 1}]);
    expect(findCollationTableSearchMatches([['مرحبا', 'بالعالم']], 'مرحبا بالعالم'))
      .toEqual([{row: 0, colFrom: 0, colTo: 1}]);
  });
});