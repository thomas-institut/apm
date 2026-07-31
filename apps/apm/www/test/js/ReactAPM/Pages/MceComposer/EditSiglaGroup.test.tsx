/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import EditSiglaGroup from '@/ReactAPM/Pages/MceComposer/WitnessesPanel/EditSiglaGroup';

vi.mock('react-bootstrap', () => {
  const Modal = ({show, onHide, children}: any) => {
    if (!show) {
      return null;
    }
    return <div className={'modal'}>
      <button type={'button'} className={'modal-close-btn'} onClick={onHide}>Close</button>
      {children}
    </div>;
  };

  Modal.Header = ({children}: any) => <div>{children}</div>;
  Modal.Title = ({children}: any) => <div>{children}</div>;
  Modal.Body = ({children}: any) => <div>{children}</div>;
  Modal.Footer = ({children}: any) => <div>{children}</div>;

  const Button = ({children, ...props}: any) => <button type={'button'} {...props}>{children}</button>;

  const Form: any = ({children}: any) => <div>{children}</div>;
  Form.Group = ({children, ...props}: any) => <div {...props}>{children}</div>;
  Form.Label = ({children}: any) => <label>{children}</label>;
  Form.Control = (props: any) => <input {...props}/>;
  Form.Check = ({label, checked, onChange, className}: any) => <label className={className}>
    <input type={'checkbox'} checked={checked} onChange={onChange}/>
    {label}
  </label>;

  return {
    Modal,
    Button,
    Form
  };
});

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('EditSiglaGroup', () => {
  it('initializes checkboxes based on sigla group witnesses', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <EditSiglaGroup
          sigla={['A', 'B', 'C']}
          siglaGroup={{siglum: 'G1', witnesses: [0, 2]}}
          siglaGroupIndex={0}
          isSiglaGroupValid={() => true}
          onClickConfirm={() => {
          }}
          onClickCancel={() => {
          }}
        />
      );
    });

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[2] as HTMLInputElement).checked).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it('calls validation on changes and enables/disables confirm accordingly', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const isSiglaGroupValid = vi.fn((_index: number, group: {siglum: string, witnesses: number[]}) => {
      if (group.siglum.trim() === '') {
        return 'Empty siglum';
      }
      if (group.witnesses.length < 2) {
        return 'Need two witnesses';
      }
      return true;
    });

    await act(async () => {
      root.render(
        <EditSiglaGroup
          sigla={['A', 'B', 'C']}
          siglaGroup={{siglum: 'G1', witnesses: [0, 1]}}
          siglaGroupIndex={2}
          isSiglaGroupValid={isSiglaGroupValid}
          onClickConfirm={() => {
          }}
          onClickCancel={() => {
          }}
        />
      );
    });

    let confirmButton = container.querySelector('.confirm-btn') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);

    const secondCheckbox = container.querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement;
    await act(async () => {
      secondCheckbox.click();
    });

    confirmButton = container.querySelector('.confirm-btn') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
    expect(isSiglaGroupValid).toHaveBeenCalledWith(2, {siglum: 'G1', witnesses: [0]});

    const thirdCheckbox = container.querySelectorAll('input[type="checkbox"]')[2] as HTMLInputElement;
    await act(async () => {
      thirdCheckbox.click();
    });

    expect(isSiglaGroupValid).toHaveBeenCalledWith(2, {siglum: 'G1', witnesses: [0, 2]});

    confirmButton = container.querySelector('.confirm-btn') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });

  it('calls confirm and cancel callbacks', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const onClickConfirm = vi.fn();
    const onClickCancel = vi.fn();

    await act(async () => {
      root.render(
        <EditSiglaGroup
          sigla={['A', 'B', 'C']}
          siglaGroup={{siglum: 'G1', witnesses: [0, 1]}}
          siglaGroupIndex={3}
          isSiglaGroupValid={() => true}
          onClickConfirm={onClickConfirm}
          onClickCancel={onClickCancel}
        />
      );
    });

    const thirdCheckbox = container.querySelectorAll('input[type="checkbox"]')[2] as HTMLInputElement;
    await act(async () => {
      thirdCheckbox.click();
    });

    const confirmButton = container.querySelector('.confirm-btn') as HTMLButtonElement;
    await act(async () => {
      confirmButton.click();
    });

    expect(onClickConfirm).toHaveBeenCalledWith(3, {siglum: 'G1', witnesses: [0, 1, 2]});

    const cancelButton = container.querySelector('.cancel-btn') as HTMLButtonElement;
    await act(async () => {
      cancelButton.click();
    });
    expect(onClickCancel).toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });
});