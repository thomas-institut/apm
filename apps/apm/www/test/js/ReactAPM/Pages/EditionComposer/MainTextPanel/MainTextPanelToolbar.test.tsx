/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {Apparatus} from '@/Edition/Apparatus';
import MainTextPanelToolbar from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanelToolbar';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MainTextPanelToolbar', () => {
  it('exposes the modes, guards editing modes, and controls view toggles independently', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onModeChange = vi.fn();
    const onChangeApparatusHighlightSelection = vi.fn();
    const onChangeApparatusPopovers = vi.fn();
    const apparatuses = [new Apparatus(), new Apparatus()];
    apparatuses[0].type = 'criticus';
    apparatuses[1].type = 'fontium';

    await act(async () => root.render(<MainTextPanelToolbar mode="off" canEdit={false}
                                                            apparatuses={apparatuses}
                                                            apparatusHighlightSelection="active"
                                                            showApparatusPopovers
                                                            onModeChange={onModeChange}
                                                            onChangeApparatusHighlightSelection={onChangeApparatusHighlightSelection}
                                                            onChangeApparatusPopovers={onChangeApparatusPopovers}/>));

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.map(button => button.textContent)).toEqual(['Off', 'Apparatus', 'Text']);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[2].disabled).toBe(true);
    await act(async () => buttons[0].click());
    expect(onModeChange).toHaveBeenCalledWith('off');

    const apparatusSelector = container.querySelector<HTMLSelectElement>('#main-text-apparatus-highlights')!;
    expect(Array.from(apparatusSelector.options).map(option => [option.value, option.textContent])).toEqual([
      ['all', 'All'], ['none', 'None'], ['active', 'Active'], ['0', 'criticus'], ['1', 'fontium']
    ]);
    for (const [value, selection] of [['all', 'all'], ['none', 'none'], ['active', 'active'], ['1', 1]] as const) {
      await act(async () => {
        apparatusSelector.value = value;
        apparatusSelector.dispatchEvent(new Event('change', {bubbles: true}));
      });
      expect(onChangeApparatusHighlightSelection).toHaveBeenLastCalledWith(selection);
    }

    const switches = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    await act(async () => {
      switches[0].click();
    });
    expect(onChangeApparatusPopovers).toHaveBeenCalledWith(false);

    await act(async () => root.unmount());
    container.remove();
  });
});