/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import AdminPanel from '@/ReactAPM/Pages/MceComposer/AdminPanel/AdminPanel';
import {MceVersionInfo} from '@/Api/DataSchema/ApiMceData';

vi.mock('@/ReactAPM/Components/EntityLink', () => ({
  default: ({id, name}: {id: number, name?: string}) => name
    ? <a data-entity-id={id}>{name}</a>
    : <span data-author-id={id}>Author {id}</span>,
}));

vi.mock('@/pages/common/ApmFormats', () => ({
  ApmFormats: {
    timeString: vi.fn((timeString: string) => `formatted ${timeString}`),
  },
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const versions: MceVersionInfo[] = [
  {
    mceId: 42,
    timeString: '2026-08-05 12:00:00.000000',
    authorId: 1002,
    description: 'Newest version',
  },
  {
    mceId: 42,
    timeString: '2026-08-06 12:00:00.000000',
    authorId: 1001,
    description: 'a'.repeat(151),
  },
];

describe('AdminPanel', () => {
  const cloneEdition = vi.fn<() => Promise<number | string>>();
  const archive = vi.fn<() => Promise<true | string>>();

  interface RenderOptions {
    cloneEdition?: () => Promise<number | string>;
    archive?: () => Promise<true | string>;
    isArchived?: boolean;
    archivingEnabled?: boolean;
  }

  const renderAdminPanel = async (options: RenderOptions = {}) => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AdminPanel mceId={42} version={null} versions={versions}
                              cloneEdition={options.cloneEdition ?? cloneEdition}
                              archive={options.archive ?? archive}
                              isArchived={options.isArchived ?? false}
                              archivingEnabled={options.archivingEnabled ?? true}/>);
    });

    return {container, root};
  };

  it('confirms and displays the cloned edition link while replacing the button with a spinner', async () => {
    let resolveClone: (id: number) => void = () => {};
    const pendingClone = vi.fn(() => new Promise<number>((resolve) => {
      resolveClone = resolve;
    }));
    const {container, root} = await renderAdminPanel({cloneEdition: pendingClone});

    await act(async () => {
      const cloneButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Clone Edition')!;
      cloneButton.click();
    });
    expect(document.body.textContent).toContain('Do you want to clone this edition?');

    await act(async () => {
      document.querySelector<HTMLButtonElement>('.accept-btn')!.click();
    });
    expect(pendingClone).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Cloning edition...');
    expect(container.querySelector('.action-buttons-div .spinner-border')).not.toBeNull();
    expect(container.textContent).not.toContain('Clone Edition');

    await act(async () => {
      resolveClone(123);
    });
    expect(container.textContent).toContain('Edition successfully cloned: 123');
    expect(container.querySelector('a[data-entity-id="123"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it('displays the clone error in red', async () => {
    const error = 'Unable to save clone';
    const cloneEditionProp = vi.fn().mockResolvedValue(error);
    const {container, root} = await renderAdminPanel({cloneEdition: cloneEditionProp});

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[title="Clone Edition"]')!.click();
    });
    await act(async () => {
      document.querySelector<HTMLButtonElement>('.accept-btn')!.click();
    });

    expect(container.querySelector('.clone-info.text-danger')?.textContent).toBe(error);

    await act(async () => {
      root.unmount();
    });
  });

  it('confirms archiving and displays a spinner while the archive request is pending', async () => {
    let resolveArchive: (result: true) => void = () => {};
    const pendingArchive = vi.fn(() => new Promise<true>((resolve) => {
      resolveArchive = resolve;
    }));
    const {container, root} = await renderAdminPanel({archive: pendingArchive});

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[title="Archive Edition"]')!.click();
    });
    expect(document.body.textContent).toContain('Do you want to archive this edition?');

    await act(async () => {
      document.querySelector<HTMLButtonElement>('.accept-btn')!.click();
    });
    expect(pendingArchive).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Archiving edition...');
    expect(container.querySelector('.action-buttons-div .spinner-border')).not.toBeNull();
    expect(container.textContent).not.toContain('Archive Edition');

    await act(async () => {
      resolveArchive(true);
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('disables archiving and explains that the edition is archived', async () => {
    const {container, root} = await renderAdminPanel({isArchived: true});

    const archiveButton = container.querySelector<HTMLButtonElement>('button[title="Archive Edition"]')!;
    expect(archiveButton.disabled).toBe(true);
    expect(container.querySelector('.archive-info')?.textContent).toBe('This edition is archived');

    await act(async () => {
      root.unmount();
    });
  });

  it('disables archiving when there are unsaved changes', async () => {
    const {container, root} = await renderAdminPanel({archivingEnabled: false});

    const archiveButton = container.querySelector<HTMLButtonElement>('button[title="Archive Edition"]')!;
    expect(archiveButton.disabled).toBe(true);
    expect(container.querySelector('.archive-info')?.textContent)
      .toBe('There are unsaved changes, archiving is not possible');

    await act(async () => {
      root.unmount();
    });
  });

  it('displays an archive error in red', async () => {
    const error = 'Unable to archive edition';
    const archiveProp = vi.fn().mockResolvedValue(error);
    const {container, root} = await renderAdminPanel({archive: archiveProp});

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[title="Archive Edition"]')!.click();
    });
    await act(async () => {
      document.querySelector<HTMLButtonElement>('.accept-btn')!.click();
    });

    expect(container.querySelector('.archive-info.text-danger')?.textContent).toBe(error);

    await act(async () => {
      root.unmount();
    });
  });

  it('renders versions newest first with formatted time, author links, and complete descriptions', async () => {
    const {container, root} = await renderAdminPanel();

    const headers = Array.from(container.querySelectorAll('th')).map((header) => header.textContent);
    expect(headers).toEqual(['N', 'Time', 'Author', 'Description']);

    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('1');
    expect(rows[0].textContent).toContain('formatted 2026-08-06 12:00:00.000000');
    expect(rows[0].textContent).toContain('Author 1001');
    expect(rows[1].textContent).toContain('2');
    expect(rows[1].textContent).toContain('formatted 2026-08-05 12:00:00.000000');
    expect(rows[1].textContent).toContain('Author 1002');

    const descriptionCell = rows[0].querySelector('td:nth-child(4)')!;
    expect(descriptionCell.textContent).toBe(`${'a'.repeat(151)}`);
    expect(descriptionCell.querySelector('button')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it('highlights the loaded version and does not link its time', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AdminPanel mceId={42} version={versions[0].timeString} versions={versions}
                              cloneEdition={cloneEdition} archive={archive}
                              isArchived={false} archivingEnabled={true}/>);
    });

    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows[0].classList.contains('loaded-version')).toBe(false);
    expect(rows[1].classList.contains('loaded-version')).toBe(true);

    rows
      .filter((row) => !row.classList.contains('loaded-version'))
      .forEach((row) => {
        expect(row.querySelector('td:nth-child(2) a')).not.toBeNull();
      });
    const loadedVersionTimeCell = rows[1].querySelector('td:nth-child(2)')!;
    expect(loadedVersionTimeCell.textContent).toBe('formatted 2026-08-05 12:00:00.000000');
    expect(loadedVersionTimeCell.querySelector('a')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});