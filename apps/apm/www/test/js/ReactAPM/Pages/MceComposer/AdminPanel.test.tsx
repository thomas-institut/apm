/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import AdminPanel from '@/ReactAPM/Pages/MceComposer/AdminPanel/AdminPanel';
import {MceVersionInfo} from '@/Api/DataSchema/ApiMceData';

vi.mock('@/ReactAPM/Components/EntityLink', () => ({
  default: ({id}: {id: number}) => <span data-author-id={id}>Author {id}</span>,
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
  it('renders versions newest first with formatted time, author links, and expandable descriptions', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AdminPanel versions={versions}/>);
    });

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
    expect(descriptionCell.textContent).toBe(`${'a'.repeat(150)}Show more`);
    const showMoreButton = descriptionCell.querySelector('button')!;

    await act(async () => {
      showMoreButton.click();
    });

    expect(descriptionCell.textContent).toBe('a'.repeat(151));
    expect(descriptionCell.querySelector('button')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});