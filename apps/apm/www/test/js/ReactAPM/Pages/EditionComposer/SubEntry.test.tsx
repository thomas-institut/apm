/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it} from 'vitest';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import * as SubEntryType from '@/Edition/SubEntryType';
import SubEntry from '@/ReactAPM/Pages/EditionComposer/SubEntry';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function build(type: string, hands: number[] = [0], keyword = ''): ApparatusSubEntry {
  const s = new ApparatusSubEntry();
  s.type = type;
  s.keyword = keyword;
  s.fmtText = [{type: 'text', text: 'foo'}] as any;
  s.witnessData = hands.map((h, i) => new WitnessDataItem().setWitnessIndex(i).setHand(h));
  return s;
}

async function render(subEntry: ApparatusSubEntry, lang?: string) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(<SubEntry subEntry={subEntry} subEntryIndex={0} sigla={['A', 'B']} lang={lang}/>));
  const html = container.innerHTML;
  const text = container.textContent;
  await act(async () => root.unmount());
  return {text, html};
}

describe('SubEntry', () => {
  it('renders a latin variant with hands', async () => {
    const {text, html} = await render(build(SubEntryType.VARIANT, [0, 1]), 'la');
    expect(text).toBe('foo AB2');
    expect(html).toContain('<sup>2</sup>');
  });

  it('renders latin keywords', async () => {
    expect((await render(build(SubEntryType.OMISSION), 'la')).html).toContain('<i>om.</i>');
    expect((await render(build(SubEntryType.ADDITION), 'la')).text).toBe('add. foo A');
    expect((await render(build(SubEntryType.FULL_CUSTOM, [0], 'omission'), 'la')).text).toBe('om. foo A');
  });

  it('renders arabic with eastern numerals and small keywords', async () => {
    const {html} = await render(build(SubEntryType.OMISSION, [1]), 'ar');
    expect(html).toContain('<small>نقص</small>');
    expect(html).toContain('<sup>٢</sup>');
  });

  it('renders hebrew with bold sigla and forced direction space', async () => {
    const {html} = await render(build(SubEntryType.VARIANT), 'he');
    expect(html).toContain('force-rtl');
    expect(html).toContain('<b>A</b>');
  });
});
