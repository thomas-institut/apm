/**
 * @vitest-environment happy-dom
 */

import React, {cloneElement, useState} from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';
import MceComposerSaveButton from '@/ReactAPM/Pages/MceComposer/MceComposerSaveButton';

vi.mock('react-bootstrap', () => {
  const Button = ({children, ...props}: any) => <button {...props}>{children}</button>;
  const FormControl = ({as, ...props}: any) => as === 'textarea' ? <textarea {...props}/> : <input {...props}/>;
  const OverlayTrigger = ({children, overlay, show, onToggle, trigger, rootClose, ...inheritedChildProps}: any) => {
    const [uncontrolledShow, setUncontrolledShow] = useState(false);
    const visible = show ?? uncontrolledShow;
    const triggers = Array.isArray(trigger) ? trigger : [trigger];
    const toggle = (nextShow: boolean) => {
      if (show === undefined) {
        setUncontrolledShow(nextShow);
      }
      onToggle?.(nextShow);
    };
    const childProps: Record<string, any> = {...inheritedChildProps};

    if (triggers.includes('hover')) {
      childProps.onMouseEnter = () => {
        inheritedChildProps.onMouseEnter?.();
        toggle(true);
      };
      childProps.onMouseLeave = () => {
        inheritedChildProps.onMouseLeave?.();
        toggle(false);
      };
    }
    if (triggers.includes('click')) {
      childProps.onClick = () => {
        inheritedChildProps.onClick?.();
        toggle(!visible);
      };
    }

    return <>{cloneElement(children, childProps)}{visible && overlay}</>;
  };

  return {
    Button,
    Form: {Control: FormControl},
    OverlayTrigger,
  };
});

vi.mock('react-bootstrap/Popover', () => {
  const Popover = ({children}: {children: React.ReactNode}) => <div>{children}</div>;
  const Header = ({children}: {children: React.ReactNode}) => <div>{children}</div>;
  const Body = ({children}: {children: React.ReactNode}) => <div>{children}</div>;

  return {default: Object.assign(Popover, {Header, Body})};
});

vi.mock('react-bootstrap/Overlay', () => ({
  default: ({children, show}: {children: React.ReactNode, show: boolean}) => show && children,
}));

vi.mock('react-bootstrap-icons', () => ({
  CloudArrowUp: (props: any) => <button {...props}>save icon</button>,
}));

vi.mock('@/ReactAPM/ToolBox/NextTick', () => ({
  nextTick: vi.fn().mockResolvedValue(undefined),
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const setInputValue = (input: HTMLTextAreaElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
};

const getButtonByText = (container: HTMLElement, text: string): HTMLButtonElement => {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text) as HTMLButtonElement;
};

describe('MceComposerSaveButton', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows changes on hover and requires a valid editable description before saving', async () => {
    const executeSave = vi.fn().mockResolvedValue(undefined);
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<MceComposerSaveButton changes={['Changed title', 'Changed paragraph']}
                                      executeSave={executeSave}
                                      saveError={null}/>);
    });

    const saveIcon = container.querySelector('.icon-btn') as HTMLElement;
    await act(async () => {
      saveIcon.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    });
    expect(container.textContent).toContain('There are unsaved changes:');
    expect(container.textContent).toContain('Changed title');

    await act(async () => {
      saveIcon.click();
    });
    expect(executeSave).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Do you want to save?');
    expect(container.textContent).not.toContain('There are unsaved changes:');

    const description = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(description.value).toBe('Changed title. Changed paragraph');
    expect(Number(description.rows)).toBe(3);

    await act(async () => {
      getButtonByText(container, 'Cancel').click();
    });
    expect(executeSave).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Do you want to save?');

    await act(async () => {
      saveIcon.click();
    });
    await act(async () => {
      setInputValue(container.querySelector('textarea') as HTMLTextAreaElement, ' 123456789 ');
    });
    expect(getButtonByText(container, 'Save').disabled).toBe(true);

    await act(async () => {
      setInputValue(container.querySelector('textarea') as HTMLTextAreaElement, ' Edited description ');
    });
    expect(getButtonByText(container, 'Save').disabled).toBe(false);

    await act(async () => {
      getButtonByText(container, 'Save').click();
    });
    expect(executeSave).toHaveBeenCalledWith(' Edited description ');

    await act(async () => {
      root.unmount();
    });
  });
});