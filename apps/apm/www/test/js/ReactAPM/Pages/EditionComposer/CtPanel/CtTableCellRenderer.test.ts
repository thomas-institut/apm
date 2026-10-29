/**
 * @vitest-environment happy-dom
 */
import {describe, expect, it} from 'vitest';
import {fromString} from '@thomas-inst/fmt-text';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface.js';
import * as WitnessTokenClass from '@/Witness/WitnessTokenClass.js';
import * as WitnessTokenType from '@/Witness/WitnessTokenType.js';
import {CtTableCellRenderer} from '@/ReactAPM/Pages/EditionComposer/CtPanel/CtTableCellRenderer.js';

function createToken(text: string, tokenClass: string): WitnessTokenInterface {
  return {
    tokenClass,
    tokenType: WitnessTokenType.WORD,
    text,
    fmtText: fromString(text)
  };
}

function createCtData(): CtDataInterface {
  return {
    lang: 'en',
    witnesses: [
      {witnessType: 'fullTx', ApmWitnessId: 'full-1', tokens: [createToken('full', WitnessTokenClass.FULL_TX)]},
      {witnessType: 'edition', ApmWitnessId: 'edition-1', tokens: [createToken('edition', WitnessTokenClass.EDITION)]},
      {witnessType: 'source', ApmWitnessId: 'source-1', tokens: []}
    ],
    editionWitnessIndex: 1,
    witnessTitles: ['Full text', 'Edition', 'Source'],
    witnessOrder: [0, 2, 1],
    sigla: ['F', 'E', 'S'],
    siglaGroups: [],
    chunkId: 'chunk-1',
    tableId: 1,
    customApparatuses: [],
    schemaVersion: '1.5',
    type: 'edition',
    title: 'Test table',
    collationMatrix: [[0, -1], [0, -1], [-1, -1]],
    groupedColumns: [],
    automaticNormalizationsApplied: [],
    excludeFromAutoCriticalApparatus: [],
    includeInAutoMarginalFoliation: [],
    archived: false
  };
}

describe('CtTableCellRenderer', () => {
  it('builds table rows in witness order while excluding source witnesses', () => {
    const renderer = new CtTableCellRenderer(createCtData());

    expect(renderer.getRowDefinition()).toEqual([
      {title: 'F', values: [0, -1], isEditable: false},
      {title: 'E', values: [0, -1], isEditable: true}
    ]);
    expect(renderer.getWitnessIndexForRow(0)).toBe(0);
    expect(renderer.getWitnessIndexForRow(1)).toBe(1);
  });

  it('renders token content, classes, and editability from the current CtData', () => {
    const renderer = new CtTableCellRenderer(createCtData());

    expect(renderer.generateCellContent(1, 0, 0)).toContain('edition');
    expect(renderer.generateCellContent(1, 1, -1)).toBe('&mdash;');
    expect(renderer.generateCellClasses(1, 0, 0)).toContain('withpopover');
    expect(renderer.generateCellClasses(1, 1, -1)).toEqual(['token-type-empty']);
    expect(renderer.isCellEditable(1, 0, 0)).toBe(true);
    expect(renderer.isCellEditable(0, 0, 0)).toBe(false);
    expect(renderer.isEmpty(1, 1, -1)).toBe(true);
    expect(renderer.validateCell(1, 0, 'single')).toMatchObject({isValid: true});
  });

  it('validates punctuation only when other visible witness cells are empty', () => {
    const ctData = createCtData();
    const renderer = new CtTableCellRenderer(ctData);

    expect(renderer.validateCell(1, 0, '!').isValid).toBe(false);
    ctData.collationMatrix[0][0] = -1;
    renderer.setCtData(ctData);
    expect(renderer.validateCell(1, 0, '!').isValid).toBe(true);
  });

  it('resets rendered content and popover caches when CtData changes', () => {
    const firstCtData = createCtData();
    const renderer = new CtTableCellRenderer(firstCtData);
    const element = document.createElement('td');

    expect(renderer.generateCellContent(1, 0, 0)).toContain('edition');
    expect(renderer.getCellHoverInfo(1, 0, element)?.html).toContain('edition');

    const secondCtData = structuredClone(firstCtData);
    secondCtData.witnesses[1].tokens[0].text = 'revised';
    secondCtData.witnesses[1].tokens[0].fmtText = fromString('revised');
    renderer.setCtData(secondCtData);

    expect(renderer.generateCellContent(1, 0, 0)).toContain('revised');
    expect(renderer.getCellHoverInfo(1, 0, element)?.html).toContain('revised');
  });
});