/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Panel from '@/ReactAPM/Components/PanelUI/Panel';
import Toolbar from '@/ReactAPM/Components/PanelUI/Toolbar';
import PanelContent from '@/ReactAPM/Components/PanelUI/PanelContent';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Panel', () => {
  it('detects Toolbar and PanelContent when passed directly', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(
        <Panel>
          <Toolbar>My Toolbar</Toolbar>
          <PanelContent>My Content</PanelContent>
        </Panel>
      );
    });

    expect(container.querySelector('.panel-with-toolbar')).not.toBeNull();
    expect(container.textContent).toContain('My Toolbar');
    expect(container.textContent).toContain('My Content');
  });

  it('detects Toolbar and PanelContent when wrapped in a Fragment', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(
        <Panel>
          <>
            <Toolbar>My Toolbar</Toolbar>
            <PanelContent>My Content</PanelContent>
          </>
        </Panel>
      );
    });

    // This is expected to FAIL before the fix
    // Because it will fall back to regular PanelContent and the Toolbar will be just a child of it.
    // The .panel-with-toolbar class won't be applied.
    expect(container.querySelector('.panel-with-toolbar')).not.toBeNull();
    expect(container.textContent).toContain('My Toolbar');
    expect(container.textContent).toContain('My Content');
  });

  it('throws error if Fragment contains more than two children when first is Toolbar', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await expect(act(async () => {
      root.render(
        <Panel>
          <>
            <Toolbar>My Toolbar</Toolbar>
            <PanelContent>My Content</PanelContent>
            <div>Third Child</div>
          </>
        </Panel>
      );
    })).rejects.toThrow('Panel can only have two children if the first one is a Toolbar');
  });
});
