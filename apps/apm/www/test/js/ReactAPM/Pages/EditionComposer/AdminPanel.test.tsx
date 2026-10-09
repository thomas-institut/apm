/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import AdminPanel from '@/ReactAPM/Pages/EditionComposer/AdminPanel/AdminPanel';
import {CtVersionInfo} from '@/Api/DataSchema/ApiCollationTable';

vi.mock('@/ReactAPM/Components/EntityLink', () => ({
  default: ({id, type, version, name, active = true}: {id: number, type?: string, version?: string, name?: string, active?: boolean}) =>
    active ? <a data-entity-id={id} data-entity-type={type} data-version={version}>{name ?? `Author ${id}`}</a> : <span>{name ?? `Author ${id}`}</span>,
}));

vi.mock('@/pages/common/ApmFormats', () => ({
  ApmFormats: {
    timeString: vi.fn((timeString: string) => `formatted ${timeString}`),
  },
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const versions: CtVersionInfo[] = [
  {
    id: 42,
    collationTableId: 7,
    authorTid: 1002,
    description: 'Older version',
    isMinor: false,
    isReview: false,
    timeFrom: '2026-08-05 12:00:00.000000',
    timeUntil: '2026-08-06 12:00:00.000000',
  },
  {
    id: 42,
    collationTableId: 7,
    authorTid: 1001,
    description: 'Latest version',
    isMinor: false,
    isReview: false,
    timeFrom: '2026-08-06 12:00:00.000000',
    timeUntil: '9999-12-31 23:59:59.999999',
  },
];

describe('EditionComposer AdminPanel', () => {
  const archive = vi.fn<() => Promise<true | string>>();

  const renderAdminPanel = async (isLatestVersion = true) => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AdminPanel tableId={7} versionTimeStamp={versions[0].timeFrom} versions={versions}
                              isLatestVersion={isLatestVersion} archive={archive} isArchived={false}
                              archivingEnabled={isLatestVersion} loadingNewVersion={false}/>);
    });

    return {container, root};
  };

  it('renders sorted version details and links previous versions using their timeFrom', async () => {
    const {container, root} = await renderAdminPanel();

    const headers = Array.from(container.querySelectorAll('th')).map(header => header.textContent);
    expect(headers).toEqual(['N', 'Time', 'Author', 'Description']);

    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Latest version');
    expect(rows[1].textContent).toContain('Older version');

    expect(rows[0].querySelector('strong')?.textContent).toContain('formatted');

    const olderTimeLink = rows[1].querySelector<HTMLAnchorElement>('a[data-entity-type="singleChunkEditionBeta"]')!;
    expect(olderTimeLink.dataset.entityId).toBe('7');
    expect(olderTimeLink.dataset.version).toBe(versions[0].timeFrom);
    expect(container.textContent).not.toContain('Clone');

    await act(async () => {
      root.unmount();
    });
  });

  it('confirms an archive request and delegates it to EditionComposer', async () => {
    const {container, root} = await renderAdminPanel();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[title="Archive Edition"]')!.click();
    });
    expect(document.body.textContent).toContain('Do you want to archive this edition?');

    await act(async () => {
      document.querySelector<HTMLButtonElement>('.accept-btn')!.click();
    });
    expect(archive).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it('disables archiving for an older loaded version', async () => {
    const {container, root} = await renderAdminPanel(false);

    expect(container.querySelector<HTMLButtonElement>('button[title="Archive Edition"]')!.disabled).toBe(true);
    expect(container.querySelector('.archive-info')?.textContent).toBe('Only the latest version can be archived');

    await act(async () => {
      root.unmount();
    });
  });

  it('disables version and author links while loading a new version', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AdminPanel tableId={7} versionTimeStamp={versions[0].timeFrom} versions={versions}
                              isLatestVersion={true} archive={archive} isArchived={false}
                              archivingEnabled={true} loadingNewVersion={true}/>);
    });

    expect(container.querySelectorAll('.versions-table a')).toHaveLength(0);

    await act(async () => {
      root.unmount();
    });
  });
});