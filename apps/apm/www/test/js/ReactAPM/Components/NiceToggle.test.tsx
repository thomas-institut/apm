/**
 * @vitest-environment happy-dom
 */

import {describe, expect, it, vi} from 'vitest';
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import NiceToggle from '@/ReactAPM/Components/NiceToggle';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('NiceToggle', () => {
  it('renders a span with defaults from isOn prop', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<NiceToggle isOn={true}/>);
    });

    const toggle = container.querySelector('span') as HTMLSpanElement;
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toBe('ON');
    expect(toggle.classList.contains('nice-toggle')).toBe(true);
    expect(toggle.classList.contains('on')).toBe(true);
  });

  it('calls onClick with next state without changing itself', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const onClick = vi.fn();

    await act(async () => {
      root.render(<NiceToggle isOn={true} onClick={onClick}/>);
    });

    const toggle = container.querySelector('span') as HTMLSpanElement;

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(onClick).toHaveBeenNthCalledWith(1, false);
    expect(toggle.textContent).toBe('ON');
    expect(toggle.classList.contains('on')).toBe(true);
  });

  it('works as a controlled component when parent updates isOn', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    function Wrapper() {
      const [isOn, setIsOn] = useState(true);
      return <NiceToggle isOn={isOn} onClick={setIsOn}/>;
    }

    await act(async () => {
      root.render(<Wrapper/>);
    });

    const toggle = container.querySelector('span') as HTMLSpanElement;
    expect(toggle.textContent).toBe('ON');

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(toggle.textContent).toBe('OFF');
    expect(toggle.classList.contains('off')).toBe(true);

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(toggle.textContent).toBe('ON');
    expect(toggle.classList.contains('on')).toBe(true);
  });

  it('supports custom on/off content, title, className and style', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const onClick = vi.fn();

    await act(async () => {
      root.render(<NiceToggle
        isOn={false}
        on={<em>Enabled</em>}
        off={<em>Disabled</em>}
        onTitle="state on"
        offTitle="state off"
        className="my-toggle"
        style={{cursor: 'pointer'}}
        onClick={onClick}
      />);
    });

    const toggle = container.querySelector('span') as HTMLSpanElement;
    expect(toggle.classList.contains('my-toggle')).toBe(true);
    expect(toggle.classList.contains('off')).toBe(true);
    expect(toggle.getAttribute('title')).toBe('state off');
    expect(toggle.textContent).toBe('Disabled');
    expect(toggle.style.cursor).toBe('pointer');

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(onClick).toHaveBeenNthCalledWith(1, true);
    expect(toggle.classList.contains('off')).toBe(true);
    expect(toggle.getAttribute('title')).toBe('state off');
    expect(toggle.textContent).toBe('Disabled');
  });
});
