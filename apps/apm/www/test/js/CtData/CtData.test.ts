import {describe, expect, it} from 'vitest';
import {CtData} from '@/CtData/CtData.js';
import {CtDataInterface} from '@/CtData/CtDataInterface.js';
import {ValidationError} from '@/lib/Error/SystemError.js';

function createCtData(type: CtDataInterface['type'] = 'edition'): CtDataInterface {
  return {
    lang: 'en',
    witnesses: [0, 1, 2].map((index) => ({
      witnessType: 'source',
      ApmWitnessId: `witness-${index}`,
      tokens: []
    })),
    editionWitnessIndex: 2,
    witnessTitles: ['Witness 0', 'Witness 1', 'Witness 2'],
    witnessOrder: [0, 1, 2],
    sigla: ['A', 'B', 'C'],
    siglaGroups: [],
    chunkId: 'chunk-1',
    tableId: 1,
    customApparatuses: [],
    schemaVersion: '1.5',
    type,
    title: 'Original title',
    collationMatrix: [[], [], []],
    groupedColumns: [],
    automaticNormalizationsApplied: [],
    excludeFromAutoCriticalApparatus: [],
    includeInAutoMarginalFoliation: [1],
    archived: false
  };
}

describe('CtData', () => {
  describe('updateSiglum', () => {
    it('trims the new siglum, updates only the selected witness and returns the same CtData', () => {
      const ctData = createCtData();

      const result = CtData.updateSiglum(ctData, 1, '  B2  ');

      expect(result).toBe(ctData);
      expect(ctData.sigla).toEqual(['A', 'B2', 'C']);
    });

    it('rejects an empty or whitespace-only siglum without changing the data', () => {
      for (const newSiglum of ['', '   \t\n']) {
        const ctData = createCtData();

        expect(() => CtData.updateSiglum(ctData, 1, newSiglum))
          .toThrow(new ValidationError('Siglum cannot be empty'));
        expect(ctData.sigla).toEqual(['A', 'B', 'C']);
      }
    });

    it.each([-1, 3])('rejects witness index %i without changing the data', (witnessIndex) => {
      const ctData = createCtData();

      expect(() => CtData.updateSiglum(ctData, witnessIndex, 'New'))
        .toThrow(new ValidationError('Witness index out of range'));
      expect(ctData.sigla).toEqual(['A', 'B', 'C']);
    });
  });

  describe('updateWitnessOrder', () => {
    it('updates witness order and keeps the edition witness first for collation tables', () => {
      const ctData = createCtData('ctable');
      const newWitnessOrder = [2, 0, 1];

      const result = CtData.updateWitnessOrder(ctData, newWitnessOrder);

      expect(result).toBe(ctData);
      expect(ctData.witnessOrder).toBe(newWitnessOrder);
      expect(ctData.editionWitnessIndex).toBe(2);
    });

    it('updates witness order without changing the edition witness index for editions', () => {
      const ctData = createCtData('edition');
      const newWitnessOrder = [1, 2, 0];

      CtData.updateWitnessOrder(ctData, newWitnessOrder);

      expect(ctData.witnessOrder).toBe(newWitnessOrder);
      expect(ctData.editionWitnessIndex).toBe(2);
    });

    it('rejects an order with the wrong length without changing the data', () => {
      const ctData = createCtData('ctable');

      expect(() => CtData.updateWitnessOrder(ctData, [1, 0]))
        .toThrow(new ValidationError('New witness order must have the same length as the number of witnesses'));
      expect(ctData.witnessOrder).toEqual([0, 1, 2]);
      expect(ctData.editionWitnessIndex).toBe(2);
    });

    it.each([
      {order: [-1, 0, 1], description: 'a negative index'},
      {order: [0, 1, 3], description: 'an index equal to the witness count'}
    ])('rejects an order containing $description without changing the data', ({order}) => {
      const ctData = createCtData('ctable');

      expect(() => CtData.updateWitnessOrder(ctData, order))
        .toThrow(new ValidationError('Witness index out of range in new witness order'));
      expect(ctData.witnessOrder).toEqual([0, 1, 2]);
      expect(ctData.editionWitnessIndex).toBe(2);
    });

    it('rejects duplicate witness indices without changing the data', () => {
      const ctData = createCtData('ctable');

      expect(() => CtData.updateWitnessOrder(ctData, [0, 0, 2]))
        .toThrow(new ValidationError('New witness order must not contain duplicate witness indices'));
      expect(ctData.witnessOrder).toEqual([0, 1, 2]);
      expect(ctData.editionWitnessIndex).toBe(2);
    });
  });

  describe('updateIncludeInMarginalFoliationStatus', () => {
    it('includes a witness and preserves the existing included witnesses', () => {
      const ctData = createCtData();

      const result = CtData.updateIncludeInMarginalFoliationStatus(ctData, 2, true);

      expect(result).toBe(ctData);
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1, 2]);
    });

    it('excludes a witness and preserves other included witnesses', () => {
      const ctData = createCtData();
      ctData.includeInAutoMarginalFoliation = [0, 1, 2];

      CtData.updateIncludeInMarginalFoliationStatus(ctData, 1, false);

      expect(ctData.includeInAutoMarginalFoliation).toEqual([0, 2]);
    });

    it('does not change the list when the requested status is already set', () => {
      const ctData = createCtData();
      const existingList = ctData.includeInAutoMarginalFoliation;

      expect(CtData.updateIncludeInMarginalFoliationStatus(ctData, 1, true)).toBe(ctData);
      expect(ctData.includeInAutoMarginalFoliation).toBe(existingList);

      expect(CtData.updateIncludeInMarginalFoliationStatus(ctData, 0, false)).toBe(ctData);
      expect(ctData.includeInAutoMarginalFoliation).toBe(existingList);
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1]);
    });

    it.each([-1, 3])('rejects witness index %i without changing the included witnesses', (witnessIndex) => {
      const ctData = createCtData();

      expect(() => CtData.updateIncludeInMarginalFoliationStatus(ctData, witnessIndex, true))
        .toThrow(new ValidationError('Witness index out of range'));
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1]);
    });
  });

  describe('updateTitle', () => {
    it('updates the title with the supplied value and returns the same CtData', () => {
      const ctData = createCtData();

      const result = CtData.updateTitle(ctData, '  New title  ');

      expect(result).toBe(ctData);
      expect(ctData.title).toBe('  New title  ');
    });

    it('rejects an empty or whitespace-only title without changing the data', () => {
      for (const newTitle of ['', '   \t\n']) {
        const ctData = createCtData();

        expect(() => CtData.updateTitle(ctData, newTitle))
          .toThrow(new ValidationError('Title cannot be empty'));
        expect(ctData.title).toBe('Original title');
      }
    });
  });
});