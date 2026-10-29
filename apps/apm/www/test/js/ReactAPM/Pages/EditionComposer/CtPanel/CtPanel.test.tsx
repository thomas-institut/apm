/**
 * @vitest-environment happy-dom
 */
import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fromString} from '@thomas-inst/fmt-text';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface.js';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer.js';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory.js';
import {ColumnSelectEvent} from '@/pages/common/TableEditor/TableEditor.js';
import * as WitnessTokenClass from '@/Witness/WitnessTokenClass.js';
import * as WitnessTokenType from '@/Witness/WitnessTokenType.js';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister.js';
import {ToLowerCaseNormalizer} from '@/normalizers/TokenNormalizer/ToLowerCaseNormalizer.js';
import CtPanel from '@/ReactAPM/Pages/EditionComposer/CtPanel/CtPanel.js';
import {ShiftCtCellsAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ShiftCtCellsAction.js';
import {ApplyAutomaticNormalizationsAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ApplyAutomaticNormalizationsAction.js';

function createToken(text: string, tokenClass: string): WitnessTokenInterface {
  return {tokenClass, tokenType: WitnessTokenType.WORD, text, fmtText: fromString(text)};
}

function createCtData(): CtDataInterface {
  return {
    lang: 'en',
    witnesses: [
      {witnessType: 'edition', ApmWitnessId: 'edition-1', tokens: [createToken('foo', WitnessTokenClass.EDITION), createToken('bar', WitnessTokenClass.EDITION)]},
      {witnessType: 'source', ApmWitnessId: 'source-1', tokens: []},
      {witnessType: 'fullTx', ApmWitnessId: 'full-1', tokens: [createToken('foo', WitnessTokenClass.FULL_TX), createToken('bar', WitnessTokenClass.FULL_TX)]}
    ],
    editionWitnessIndex: 0,
    witnessTitles: ['Edition', 'Source', 'Full text'],
    witnessOrder: [0, 1, 2],
    sigla: ['E', 'S', 'F'],
    siglaGroups: [],
    chunkId: 'chunk-1',
    tableId: 1,
    customApparatuses: [{type: 'criticus', entries: []}],
    schemaVersion: '1.5',
    type: 'edition',
    title: 'Test table',
    collationMatrix: [[0, 1], [-1, -1], [0, -1]],
    groupedColumns: [],
    automaticNormalizationsApplied: [],
    excludeFromAutoCriticalApparatus: [],
    includeInAutoMarginalFoliation: [],
    archived: false
  };
}

describe('CtPanel', () => {
  let container: HTMLElement;
  let root: Root;
  let onAction: ReturnType<typeof vi.fn<(action: StateTransformAction<EditionComposerHistoryState>, name: string) => Promise<boolean>>>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onAction = vi.fn<(action: StateTransformAction<EditionComposerHistoryState>, name: string) => Promise<boolean>>()
      .mockResolvedValue(true);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  const renderPanel = (ctData: CtDataInterface, canEdit = true, normalizerRegister = new NormalizerRegister()) => {
    act(() => root.render(<CtPanel ctData={ctData} mainText={[]} canEdit={canEdit}
                                  normalizerRegister={normalizerRegister} onAction={onAction}
                                  onEditApparatusEntry={() => {}}/>));
  };

  it('dispatches a shift as one history action', () => {
    renderPanel(createCtData());
    const moveButton = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === 'Move');
    act(() => moveButton?.click());
    act(() => container.querySelector<HTMLElement>('.move-cell-right-button')?.click());

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0][0]).toBeInstanceOf(ShiftCtCellsAction);
    expect(onAction.mock.calls[0][1]).toBe('Shift cell right');
  });

  it('disables edit modes and does not dispatch edits when editing is unavailable', () => {
    renderPanel(createCtData(), false);
    const moveButton = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === 'Move');
    const groupButton = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === 'Group');

    expect(moveButton?.disabled).toBe(true);
    expect(groupButton?.disabled).toBe(true);
    expect(container.querySelector('.move-cell-right-button')).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('highlights search matches and generates a CSV download link', () => {
    renderPanel(createCtData());
    const searchInput = container.querySelector<HTMLInputElement>('input[type="search"]');
    expect(searchInput).not.toBeNull();
    if (searchInput === null) {
      return;
    }
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(searchInput, 'foo');
      searchInput.dispatchEvent(new Event('input', {bubbles: true}));
      searchInput.dispatchEvent(new Event('change', {bubbles: true}));
    });

    expect(container.querySelectorAll('td.search-match').length).toBeGreaterThan(0);
    const csvLink = container.querySelector<HTMLAnchorElement>('.ct-export-csv');
    expect(csvLink?.href).toContain('data:text/csv');
    expect(csvLink?.download).toBe('ApmCollationTable.csv');
  });

  it('redraws the existing editor when the ctData prop changes', () => {
    const firstCtData = createCtData();
    renderPanel(firstCtData);
    const editor = container.querySelector('.ct-table-editor');
    expect(editor?.textContent).toContain('foo');

    const changedCtData = structuredClone(firstCtData);
    changedCtData.witnesses[0].tokens[0].text = 'changed';
    changedCtData.witnesses[0].tokens[0].fmtText = fromString('changed');
    renderPanel(changedCtData);

    expect(container.querySelector('.ct-table-editor')).toBe(editor);
    expect(editor?.textContent).toContain('changed');
  });

  it('opens the apparatus editor for the main-text range of selected columns', () => {
    const onEditApparatusEntry = vi.fn();
    const mainText = [
      {editionWitnessTokenIndex: 0},
      {editionWitnessTokenIndex: 1}
    ];
    act(() => root.render(<CtPanel ctData={createCtData()} mainText={mainText as never}
                                  canEdit normalizerRegister={new NormalizerRegister()} onAction={onAction}
                                  onEditApparatusEntry={onEditApparatusEntry}/>));
    const table = container.querySelector('.ct-table-editor');
    act(() => table?.dispatchEvent(new CustomEvent(ColumnSelectEvent, {detail: {from: 0, to: 1}, bubbles: true})));
    const dropdownToggle = container.querySelector<HTMLButtonElement>('[aria-label="Add apparatus entry"]');
    expect(dropdownToggle?.disabled).toBe(false);
    act(() => dropdownToggle?.click());
    const apparatusItem = [...container.querySelectorAll<HTMLButtonElement>('.dropdown-item')]
      .find((button) => button.textContent?.trim() === 'criticus');
    act(() => apparatusItem?.click());

    expect(onEditApparatusEntry).toHaveBeenCalledWith(0, {from: 0, to: 1});
  });

  it('shows token popovers while enabled and closes them when toggled off', () => {
    renderPanel(createCtData());
    const editionCell = container.querySelector<HTMLElement>('td.te-cell');
    expect(editionCell).not.toBeNull();
    act(() => editionCell?.dispatchEvent(new MouseEvent('mouseover', {bubbles: true})));

    expect(document.body.querySelector('.ct-token-popover')?.textContent).toContain('foo');
    const popoversToggle = container.querySelector<HTMLInputElement>('.ct-toolbar-toggle input');
    act(() => popoversToggle?.click());
    expect(document.body.querySelector('.ct-token-popover')).toBeNull();
  });

  it('applies and changes normalization settings, with an empty selection turning them off', () => {
    const normalizerRegister = new NormalizerRegister();
    normalizerRegister.registerNormalizer('lower', new ToLowerCaseNormalizer(), {
      label: 'Ignore letter case',
      help: 'Match uppercase and lowercase forms'
    });
    const ctData = createCtData();
    renderPanel(ctData, true, normalizerRegister);

    const normalizationsToggle = container.querySelector<HTMLInputElement>('.ct-normalization-controls input');
    act(() => normalizationsToggle?.click());
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0][0]).toBeInstanceOf(ApplyAutomaticNormalizationsAction);
    expect(onAction.mock.calls[0][1]).toBe('Apply automatic normalizations');

    const activeCtData = structuredClone(ctData);
    activeCtData.automaticNormalizationsApplied = ['lower'];
    renderPanel(activeCtData, true, normalizerRegister);
    const settingsButton = container.querySelector<HTMLButtonElement>('[aria-label="Normalization settings"]');
    act(() => settingsButton?.click());
    const normalizerCheckbox = document.body.querySelector<HTMLInputElement>('#ct-normalizer-lower');
    expect(normalizerCheckbox?.checked).toBe(true);
    act(() => normalizerCheckbox?.click());
    const applyButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Apply');
    act(() => applyButton?.click());

    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction.mock.calls[1][0]).toBeInstanceOf(ApplyAutomaticNormalizationsAction);
    expect(onAction.mock.calls[1][1]).toBe('Turn off automatic normalizations');
  });
});