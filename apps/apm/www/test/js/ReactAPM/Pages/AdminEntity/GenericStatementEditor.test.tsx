/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import GenericStatementEditor from '@/ReactAPM/Pages/AdminEntity/GenericStatementEditor';

describe('GenericStatementEditor', () => {
  it('should be defined', () => {
    expect(GenericStatementEditor).toBeDefined();
  });
});
