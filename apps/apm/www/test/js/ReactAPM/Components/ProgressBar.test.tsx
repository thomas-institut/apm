/**
 * @vitest-environment happy-dom
 */

import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it} from 'vitest';
import ProgressBar from '@/ReactAPM/Components/ProgressBar/ProgressBar';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ProgressBar', () => {

  it('renders centered label with configured dimensions and colors', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressBar
          currentStep={1}
          numSteps={4}
          width={88}
          height={44}
          textColor={'rgb(20, 30, 40)'}
          barColor={'rgb(1, 2, 3)'}
          getLabel={(currentStep, numSteps) => `${currentStep}/${numSteps}`}
        />,
      );
    });

    const progressBar = container.querySelector('.progress-bar') as HTMLElement;
    const label = container.querySelector('.progress-bar-label');
    const fill = container.querySelector('.progress-bar-fill') as HTMLElement;

    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe('88px');
    expect(progressBar.style.height).toBe('44px');
    expect(progressBar.style.color).toBe('rgb(20, 30, 40)');
    expect(label?.textContent).toBe('1/4');
    expect(fill.style.width).toBe('25%');
    expect(fill.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('clamps completion percentage for edge values', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProgressBar currentStep={8} numSteps={4} getLabel={() => 'done'}/>);
    });

    let fill = container.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');

    await act(async () => {
      root.render(<ProgressBar currentStep={-1} numSteps={4} getLabel={() => 'none'}/>);
    });

    fill = container.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');

    await act(async () => {
      root.render(<ProgressBar currentStep={3} numSteps={0} getLabel={() => 'zero'}/>);
    });

    fill = container.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('uses parent height when no height is specified', async () => {
    document.body.innerHTML = '<div id="root" style="height: 120px;"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressBar
          currentStep={2}
          numSteps={4}
          width={80}
          getLabel={() => 'label'}
        />,
      );
    });

    const progressBar = container.querySelector('.progress-bar') as HTMLElement;
    expect(progressBar.style.height).toBe('100%');
  });

  it('inherits parent text and background colors when colors are not provided', async () => {
    document.body.innerHTML = `
      <style>
        .my-progress {
          color: rgb(11, 22, 33);
          background-color: rgb(44, 55, 66);
        }
      </style>
      <div id="root"></div>
    `;
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressBar
          currentStep={1}
          numSteps={2}
          className={'my-progress'}
          width={100}
          height={20}
          getLabel={() => 'label'}
        />,
      );
    });

    const progressBar = container.querySelector('.progress-bar') as HTMLElement;
    const fill = container.querySelector('.progress-bar-fill') as HTMLElement;

    expect(progressBar.classList.contains('my-progress')).toBe(true);
    expect(progressBar.style.color).toBe('');
    expect(fill.style.backgroundColor).toBe('');
    expect(getComputedStyle(progressBar).color).toBe('rgb(11, 22, 33)');
  });
});