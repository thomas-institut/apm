/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import TranscriptionEditor from '@/ReactAPM/Components/TranscriptionEditor/TranscriptionEditor';

describe('TranscriptionEditor', () => {
  it('should be defined', () => {
    expect(TranscriptionEditor).toBeDefined();
  });
});
