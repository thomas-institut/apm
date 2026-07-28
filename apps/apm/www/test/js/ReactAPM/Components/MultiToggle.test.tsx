/**
 * @vitest-environment happy-dom
 */

import {describe, expect, it} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import MultiToggle from '@/ReactAPM/Components/MultiToggle/MultiToggle';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MultiToggle', () => {
  it('renders no UI for empty options without crashing', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<MultiToggle options={[]}/>);
    });

    expect(container.innerHTML).toBe('');
  });
});
