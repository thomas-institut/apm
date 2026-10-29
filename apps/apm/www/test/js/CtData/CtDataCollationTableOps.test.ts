import {describe, expect, it} from 'vitest';
import {fromString, getPlainText} from '@thomas-inst/fmt-text';
import {CtData} from '@/CtData/CtData.js';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface.js';
import {ValidationError} from '@/lib/Error/SystemError.js';
import * as NormalizationSource from '@/constants/NormalizationSource.js';
import * as WitnessTokenType from '@/Witness/WitnessTokenType.js';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister.js';
import {ToLowerCaseNormalizer} from '@/normalizers/TokenNormalizer/ToLowerCaseNormalizer.js';
import {createStandardNormalizerRegister} from '@/normalizers/StandardNormalizers.js';

const token = (text: string, tokenType = WitnessTokenType.WORD): WitnessTokenInterface => ({
  tokenClass: 'edition',
  tokenType,
  text,
  fmtText: fromString(text)
});

function createCtData(type: CtDataInterface['type'] = 'edition'): CtDataInterface {
  return {
    lang: 'en',
    witnesses: [
      {witnessType: 'source', ApmWitnessId: 'source-1', tokens: []},
      {witnessType: 'edition', ApmWitnessId: 'edition-1', tokens: [token('a'), token('b'), token('c')]},
      {witnessType: 'fullTx', ApmWitnessId: 'full-1', tokens: [token('x'), token('y'), token('z')]}
    ],
    editionWitnessIndex: 1,
    witnessTitles: ['Source', 'Edition', 'Full text'],
    witnessOrder: type === 'edition' ? [1, 0, 2] : [0, 2, 1],
    sigla: ['S', 'E', 'F'],
    siglaGroups: [],
    chunkId: 'chunk-1',
    tableId: 1,
    customApparatuses: [],
    schemaVersion: '1.5',
    type,
    title: 'Test table',
    collationMatrix: [
      [-1, -1, -1],
      [0, 1, 2],
      [0, 1, 2]
    ],
    groupedColumns: [],
    automaticNormalizationsApplied: [],
    excludeFromAutoCriticalApparatus: [],
    includeInAutoMarginalFoliation: [],
    archived: false
  };
}

function createApparatusEntry(from: number, to: number) {
  return {
    from,
    to,
    lemma: [],
    postLemma: [],
    preLemma: [],
    separator: [],
    subEntries: [],
    tags: []
  };
}

describe('CtData collation table operations', () => {
  it('returns displayed witness indexes in table-row order, excluding sources', () => {
    const ctData = createCtData('edition');

    expect(CtData.getCtRowWitnessIndexes(ctData)).toEqual([1, 2]);
  });

  it('shifts non-edition witness cells right and left in both CtData types', () => {
    for (const type of ['edition', 'ctable'] as const) {
      const ctData = createCtData(type);
      ctData.collationMatrix[2] = [0, -1, 1];

      CtData.shiftCells(ctData, {witnessIndex: 2, firstCol: 0, lastCol: 0, direction: 'right'});
      expect(ctData.collationMatrix[2]).toEqual([-1, 0, 1]);
      CtData.shiftCells(ctData, {witnessIndex: 2, firstCol: 1, lastCol: 1, direction: 'left'});
      expect(ctData.collationMatrix[2]).toEqual([0, -1, 1]);
    }
  });

  it('pushes multiple cells into an empty target range', () => {
    const ctData = createCtData('ctable');
    ctData.collationMatrix[0] = [-1, -1, -1, -1, -1];
    ctData.collationMatrix[1] = [-1, -1, -1, -1, -1];
    ctData.collationMatrix[2] = [-1, 0, 1, 2, -1];

    CtData.shiftCells(ctData, {witnessIndex: 2, firstCol: 1, lastCol: 3, direction: 'right'});

    expect(ctData.collationMatrix[2]).toEqual([-1, -1, 0, 1, 2]);
  });

  it('rejects invalid shifts without mutating the matrix', () => {
    const ctData = createCtData('ctable');
    const before = structuredClone(ctData.collationMatrix);
    const shift = {witnessIndex: 2, firstCol: 1, lastCol: 1, direction: 'right' as const};

    expect(CtData.canShiftCells(ctData, shift)).toBe(false);
    expect(() => CtData.shiftCells(ctData, shift)).toThrow(ValidationError);
    expect(() => CtData.shiftCells(ctData, {
      witnessIndex: 2, firstCol: 1, lastCol: 2, direction: 'left'
    })).toThrow(ValidationError);
    expect(() => CtData.shiftCells(ctData, {
      witnessIndex: 2, firstCol: 0, lastCol: 0, direction: 'left'
    })).toThrow(ValidationError);
    expect(ctData.collationMatrix).toEqual(before);
  });

  it('rebuilds edition witness tokens and fixes custom apparatus references after a shift', () => {
    const ctData = createCtData();
    ctData.collationMatrix[1] = [0, -1, 1];
    ctData.customApparatuses = [{
      type: 'criticus',
      entries: [createApparatusEntry(0, 0), createApparatusEntry(1, 2)]
    }];

    CtData.shiftCells(ctData, {witnessIndex: 1, firstCol: 0, lastCol: 0, direction: 'right'});

    expect(ctData.collationMatrix[1]).toEqual([0, 1, 2]);
    expect(ctData.witnesses[1].tokens.map(({text}) => text)).toEqual(['', 'a', 'b']);
    expect(ctData.witnesses[1].tokens.map(({tokenType}) => tokenType)).toEqual([
      WitnessTokenType.EMPTY, WitnessTokenType.WORD, WitnessTokenType.WORD
    ]);
    expect(ctData.customApparatuses[0].entries.map(({from, to}) => [from, to])).toEqual([[1, 1], [1, 2]]);
  });

  it('inserts columns at the beginning, middle, and end, adjusting edition references', () => {
    const ctData = createCtData();
    ctData.groupedColumns = [0];
    ctData.customApparatuses = [{type: 'criticus', entries: [createApparatusEntry(1, 2)]}];

    CtData.insertColumnsAfter(ctData, -1, 1);
    expect(ctData.collationMatrix[1]).toEqual([0, 1, 2, 3]);
    expect(ctData.witnesses[1].tokens.map(({text}) => text)).toEqual(['', 'a', 'b', 'c']);
    expect(ctData.groupedColumns).toEqual([1]);
    expect(ctData.customApparatuses[0].entries.map(({from, to}) => [from, to])).toEqual([[2, 3]]);

    CtData.insertColumnsAfter(ctData, 1, 1);
    CtData.insertColumnsAfter(ctData, 4, 1);
    expect(ctData.collationMatrix[1]).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ctData.witnesses[1].tokens).toHaveLength(6);
    expect(() => CtData.insertColumnsAfter(ctData, 6, 1)).toThrow(ValidationError);
    expect(() => CtData.insertColumnsAfter(ctData, 0, 0)).toThrow(ValidationError);
  });

  it('groups and ungroups valid adjacent columns', () => {
    const ctData = createCtData('ctable');

    CtData.setColumnGroupedWithNext(ctData, 0, true);
    CtData.setColumnGroupedWithNext(ctData, 1, true);
    CtData.setColumnGroupedWithNext(ctData, 0, false);

    expect(ctData.groupedColumns).toEqual([1]);
    expect(() => CtData.setColumnGroupedWithNext(ctData, 2, true)).toThrow(ValidationError);
  });

  it('only deletes empty columns and adjusts group and apparatus references', () => {
    const ctData = createCtData();
    ctData.collationMatrix[0] = [-1, -1, -1, -1];
    ctData.collationMatrix[1] = [0, 1, 2, 3];
    ctData.collationMatrix[2] = [-1, -1, -1, -1];
    ctData.witnesses[1].tokens.push(token('d'));
    ctData.groupedColumns = [1, 2];
    ctData.customApparatuses = [{type: 'criticus', entries: [createApparatusEntry(2, 3)]}];

    expect(CtData.canDeleteColumn(ctData, 0)).toBe(false);
    expect(CtData.canDeleteColumn(ctData, 3)).toBe(false);
    expect(CtData.getDeletableColumns(ctData)).toEqual([]);

    ctData.collationMatrix[1][3] = -1;
    ctData.witnesses[1].tokens[3] = token('', WitnessTokenType.EMPTY);
    expect(CtData.getDeletableColumns(ctData)).toEqual([3]);
    CtData.deleteColumn(ctData, 3);

    expect(ctData.collationMatrix[1]).toEqual([0, 1, 2]);
    expect(ctData.groupedColumns).toEqual([1]);
    expect(ctData.customApparatuses[0].entries.map(({from, to}) => [from, to])).toEqual([[2, 2]]);
    expect(() => CtData.deleteColumn(ctData, 0)).toThrow(ValidationError);
  });

  it('deletes empty columns in a plain collation table', () => {
    const ctData = createCtData('ctable');
    ctData.collationMatrix[1][1] = -1;
    ctData.collationMatrix[2][1] = -1;
    ctData.groupedColumns = [0];

    expect(CtData.canDeleteColumn(ctData, -1)).toBe(false);
    CtData.deleteColumn(ctData, 1);

    expect(ctData.collationMatrix.map((row) => row.length)).toEqual([2, 2, 2]);
    expect(ctData.groupedColumns).toEqual([]);
  });

  it('compacts all deletable columns without changing a table that has none', () => {
    const ctData = createCtData('ctable');
    ctData.collationMatrix[1] = [-1, 0, -1];
    ctData.collationMatrix[2] = [-1, 1, -1];

    CtData.compactTable(ctData);
    expect(ctData.collationMatrix).toEqual([[-1], [0], [1]]);

    const edition = createCtData();
    const before = structuredClone(edition.collationMatrix);
    CtData.compactTable(edition);
    expect(edition.collationMatrix).toEqual(before);
  });

  it('edits token text, formatting, punctuation, and empty references', () => {
    const ctData = createCtData();
    const normalizerRegister = new NormalizerRegister();
    normalizerRegister.registerNormalizer('lower', new ToLowerCaseNormalizer());
    ctData.automaticNormalizationsApplied = ['lower'];

    CtData.editWitnessTokenText(ctData, {witnessIndex: 1, tokenIndex: 0, newText: '  NEW  ', normalizerRegister});
    expect(ctData.witnesses[1].tokens[0].text).toBe('NEW');
    expect(ctData.witnesses[1].tokens[0].normalizedText).toBe('new');
    expect(ctData.witnesses[1].tokens[0].normalizationSource).toBe(NormalizationSource.COLLATION_EDITOR_AUTOMATIC);

    const formattedToken = ctData.witnesses[1].tokens[1];
    formattedToken.fmtText = fromString('old').map((fmtTextToken) => ({...fmtTextToken, style: 'italic'}));
    CtData.editWitnessTokenText(ctData, {witnessIndex: 1, tokenIndex: 1, newText: 'changed', normalizerRegister});
    expect(getPlainText(ctData.witnesses[1].tokens[1].fmtText ?? [])).toBe('changed');
    expect(ctData.witnesses[1].tokens[1].fmtText?.[0]).toMatchObject({style: 'italic'});

    CtData.editWitnessTokenText(ctData, {witnessIndex: 1, tokenIndex: 2, newText: '!', normalizerRegister});
    expect(ctData.witnesses[1].tokens[2].tokenType).toBe(WitnessTokenType.PUNCTUATION);

    ctData.customApparatuses = [{type: 'criticus', entries: [createApparatusEntry(0, 0)]}];
    CtData.editWitnessTokenText(ctData, {witnessIndex: 1, tokenIndex: 0, newText: ' ', normalizerRegister});
    expect(ctData.witnesses[1].tokens[0].tokenType).toBe(WitnessTokenType.EMPTY);
    expect(ctData.customApparatuses[0].entries).toEqual([]);
  });

  it('uses parser normalization when editing Hebrew intra-word quotation marks', () => {
    const ctData = createCtData();
    ctData.lang = 'he';

    CtData.editWitnessTokenText(ctData, {
      witnessIndex: 1,
      tokenIndex: 0,
      newText: 'א’ב',
      normalizerRegister: new NormalizerRegister()
    });

    expect(ctData.witnesses[1].tokens[0].normalizedText).toBe('אב');
    expect(ctData.witnesses[1].tokens[0].normalizationSource).toBe(NormalizationSource.PARSER_NORMALIZER);
  });

  it('does not change a token when the new text is identical and rejects invalid token edits', () => {
    const ctData = createCtData();
    const normalizerRegister = new NormalizerRegister();
    const before = structuredClone(ctData.witnesses[1].tokens[0]);

    CtData.editWitnessTokenText(ctData, {witnessIndex: 1, tokenIndex: 0, newText: 'a', normalizerRegister});
    expect(ctData.witnesses[1].tokens[0]).toEqual(before);
    expect(() => CtData.editWitnessTokenText(ctData, {
      witnessIndex: 2, tokenIndex: 0, newText: 'x', normalizerRegister
    })).toThrow(ValidationError);
  });

  it('applies, changes, and removes automatic normalizations', () => {
    const ctData = createCtData();
    ctData.witnesses[2].tokens[0].text = 'ABC';
    const normalizerRegister = new NormalizerRegister();
    normalizerRegister.registerNormalizer('lower', new ToLowerCaseNormalizer());

    CtData.applyAutomaticNormalizations(ctData, normalizerRegister, ['lower']);
    expect(ctData.automaticNormalizationsApplied).toEqual(['lower']);
    expect(ctData.witnesses[2].tokens[0].normalizedText).toBe('abc');

    normalizerRegister.registerNormalizer('removeFirstLetter', {
      normalizeString: (text: string) => text.slice(1)
    });
    CtData.applyAutomaticNormalizations(ctData, normalizerRegister, ['removeFirstLetter']);
    expect(ctData.automaticNormalizationsApplied).toEqual(['removeFirstLetter']);
    expect(ctData.witnesses[2].tokens[0].normalizedText).toBe('BC');

    CtData.applyAutomaticNormalizations(ctData, normalizerRegister, []);
    expect(ctData.automaticNormalizationsApplied).toEqual([]);
    expect(ctData.witnesses[2].tokens[0].normalizedText).toBeUndefined();

    CtData.applyAutomaticNormalizations(createCtData(), new NormalizerRegister(), []);
  });

  it('creates standard normalizer registers by language', () => {
    expect(createStandardNormalizerRegister('la').getRegisteredNormalizers()).toEqual(['toLowerCase']);
    expect(createStandardNormalizerRegister('ar').getRegisteredNormalizers()).toHaveLength(5);
    expect(createStandardNormalizerRegister('he').getRegisteredNormalizers()).toEqual([]);
  });
});