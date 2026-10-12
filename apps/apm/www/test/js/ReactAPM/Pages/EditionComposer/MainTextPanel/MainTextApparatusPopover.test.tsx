/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {fromString} from '@thomas-inst/fmt-text';
import {describe, expect, it} from 'vitest';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import MainTextApparatusPopover from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextApparatusPopover';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MainTextApparatusPopover', () => {
  it('groups overlapping entries by apparatus and renders lemma and subentry details', async () => {
    const critical = new Apparatus();
    critical.type = 'critical';
    const criticalEntry = new ApparatusEntry();
    criticalEntry.from = 2;
    criticalEntry.to = 3;
    criticalEntry.mainTextWords = ['lorem', 'ipsum'];
    const subEntry = new ApparatusSubEntry();
    subEntry.type = 'omission';
    subEntry.enabled = false;
    subEntry.fmtText = fromString('missing words');
    subEntry.witnessData.push(new WitnessDataItem().setWitnessIndex(0));
    criticalEntry.subEntries.push(subEntry);
    const secondSubEntry = new ApparatusSubEntry();
    secondSubEntry.type = 'addition';
    secondSubEntry.fmtText = fromString('added words');
    criticalEntry.subEntries.push(secondSubEntry);
    critical.entries.push(criticalEntry);

    const marginal = new Apparatus();
    marginal.type = 'marginal';
    const marginalEntry = new ApparatusEntry();
    marginalEntry.from = 3;
    marginalEntry.to = 3;
    marginalEntry.lemmaType = 'custom';
    marginalEntry.customLemmaText = 'custom lemma';
    marginal.entries.push(marginalEntry);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<MainTextApparatusPopover apparatuses={[critical, marginal]}
                                                       entryReferences={[{apparatusIndex: 0, entryIndex: 0},
                                                                         {apparatusIndex: 1, entryIndex: 0}]}
                                                       sigla={['A']} tokenIndex={3} tokenText="ipsum" lineNumber={5}
                                                       style={{position: 'absolute', transform: 'translate(100px, 200px)'}}/>));

    const popover = container.querySelector<HTMLElement>('.main-text-apparatus-popover');
    expect(popover?.style.position).toBe('absolute');
    expect(popover?.style.transform).toBe('translate(100px, 200px)');
    expect(container.querySelectorAll('h4').length).toBe(2);
    expect(container.textContent).toContain('Critical');
    expect(container.textContent).toContain('Marginal');
    expect(container.textContent).toContain('2–3');
    expect(container.textContent).toContain('[lorem ipsum]');
    expect(container.textContent).toContain('[custom lemma]');
    expect(container.textContent).toContain('missing words');
    expect(container.textContent).toContain('added words');
    expect(container.textContent).toContain('om.');
    expect(container.textContent).toContain('A');
    expect(container.querySelectorAll('.main-text-apparatus-entry ul > li').length).toBe(2);
    expect(container.querySelector('.main-text-apparatus-popover .sub-entry.disabled.first')).not.toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });
});