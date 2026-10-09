import {describe, expect, it, vi} from 'vitest';
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
  describe('sigla groups', () => {
    it('adds a valid group using a deep copy and returns the same CtData', () => {
      const ctData = createCtData();
      const group = {siglum: 'Group 1', witnesses: [0, 1]};

      const result = CtData.addSiglaGroup(ctData, group);
      group.witnesses.push(2);

      expect(result).toBe(ctData);
      expect(ctData.siglaGroups).toEqual([{siglum: 'Group 1', witnesses: [0, 1]}]);
    });

    it('rejects an invalid group when adding it without changing the data', () => {
      const ctData = createCtData();
      const group = {siglum: 'Group 1', witnesses: [0]};

      expect(() => CtData.addSiglaGroup(ctData, group)).toThrow(
        new ValidationError('Invalid sigla group {"siglum":"Group 1","witnesses":[0]}: Sigla group must have at least two witnesses')
      );
      expect(ctData.siglaGroups).toEqual([]);
    });

    it('updates an existing group using a deep copy and returns the same CtData', () => {
      const ctData = createCtData();
      ctData.siglaGroups = [{siglum: 'Group 1', witnesses: [0, 1]}];
      const group = {siglum: 'Group 2', witnesses: [1, 2]};

      const result = CtData.updateSiglaGroup(ctData, 0, group);
      group.witnesses.push(0);

      expect(result).toBe(ctData);
      expect(ctData.siglaGroups).toEqual([{siglum: 'Group 2', witnesses: [1, 2]}]);
    });

    it.each([-1, 1])('rejects invalid update index %i without changing the groups', (siglaGroupIndex) => {
      const ctData = createCtData();
      ctData.siglaGroups = [{siglum: 'Group 1', witnesses: [0, 1]}];

      expect(() => CtData.updateSiglaGroup(ctData, siglaGroupIndex, {siglum: 'Group 2', witnesses: [1, 2]}))
        .toThrow(new ValidationError(`Invalid sigla group index ${siglaGroupIndex}`));
      expect(ctData.siglaGroups).toEqual([{siglum: 'Group 1', witnesses: [0, 1]}]);
    });

    it('rejects an invalid replacement group without changing the existing groups', () => {
      const ctData = createCtData();
      ctData.siglaGroups = [{siglum: 'Group 1', witnesses: [0, 1]}];
      const group = {siglum: 'Group 2', witnesses: [0]};

      expect(() => CtData.updateSiglaGroup(ctData, 0, group)).toThrow(
        new ValidationError('Invalid sigla group {"siglum":"Group 2","witnesses":[0]}: Sigla group must have at least two witnesses')
      );
      expect(ctData.siglaGroups).toEqual([{siglum: 'Group 1', witnesses: [0, 1]}]);
    });

    it('deletes an existing group and returns the same CtData', () => {
      const ctData = createCtData();
      ctData.siglaGroups = [
        {siglum: 'Group 1', witnesses: [0, 1]},
        {siglum: 'Group 2', witnesses: [1, 2]}
      ];

      const result = CtData.deleteSiglaGroup(ctData, 0);

      expect(result).toBe(ctData);
      expect(ctData.siglaGroups).toEqual([{siglum: 'Group 2', witnesses: [1, 2]}]);
    });

    it.each([-1, 1])('rejects invalid delete index %i without changing the groups', (siglaGroupIndex) => {
      const ctData = createCtData();
      ctData.siglaGroups = [{siglum: 'Group 1', witnesses: [0, 1]}];

      expect(() => CtData.deleteSiglaGroup(ctData, siglaGroupIndex))
        .toThrow(new ValidationError(`Invalid sigla group index ${siglaGroupIndex}`));
      expect(ctData.siglaGroups).toEqual([{siglum: 'Group 1', witnesses: [0, 1]}]);
    });

    it('validates group sigla, witness membership, and duplicate groups', () => {
      const ctData = createCtData();
      ctData.siglaGroups = [
        {siglum: 'Group 1', witnesses: [0, 1]},
        {siglum: 'Group 2', witnesses: [1, 2]}
      ];

      expect(CtData.isSiglaGroupValid(ctData, -1, {siglum: 'Group 3', witnesses: [0, 2]})).toBe(true);
      expect(CtData.isSiglaGroupValid(ctData, -1, {siglum: '  ', witnesses: [0, 2]}))
        .toBe('Sigla group must have a non-empty siglum');
      expect(CtData.isSiglaGroupValid(ctData, -1, {siglum: 'A', witnesses: [0, 2]}))
        .toBe('Sigla group siglum is a witness siglum');
      expect(CtData.isSiglaGroupValid(ctData, -1, {siglum: 'Group 1', witnesses: [0, 2]}))
        .toBe('Sigla group siglum is duplicated');
      expect(CtData.isSiglaGroupValid(ctData, -1, {siglum: 'Group 3', witnesses: [1, 2]}))
        .toBe('Sigla group is duplicated');
      expect(CtData.isSiglaGroupValid(ctData, -1, {siglum: 'Group 3', witnesses: [0, 3]}))
        .toBe('Sigla group contains invalid witnesses');
    });
  });

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
          .toThrow(new ValidationError('Siglum must have a non-empty value'));
        expect(ctData.sigla).toEqual(['A', 'B', 'C']);
      }
    });

    it.each([-1, 3])('rejects witness index %i without changing the data', (witnessIndex) => {
      const ctData = createCtData();

      expect(() => CtData.updateSiglum(ctData, witnessIndex, 'New'))
        .toThrow(new ValidationError('Witness index out of range'));
      expect(ctData.sigla).toEqual(['A', 'B', 'C']);
    });

    it('rejects a siglum when isSiglumValid returns a validation message', () => {
      const ctData = createCtData();
      const validationMessage = 'Siglum is not allowed';
      const isSiglumValidSpy = vi.spyOn(CtData, 'isSiglumValid').mockReturnValue(validationMessage);

      try {
        expect(() => CtData.updateSiglum(ctData, 1, 'New'))
          .toThrow(new ValidationError(validationMessage));
        expect(ctData.sigla).toEqual(['A', 'B', 'C']);
      } finally {
        isSiglumValidSpy.mockRestore();
      }
    });
  });

  describe('isSiglumValid', () => {
    it.each(['', '   \t\n'])('rejects an empty or whitespace-only siglum', (siglum) => {
      const ctData = createCtData();

      expect(CtData.isSiglumValid(ctData, 1, siglum)).toBe('Siglum must have a non-empty value');
    });

    it('rejects a siglum that duplicates another witness siglum after trimming', () => {
      const ctData = createCtData();
      ctData.sigla[2] = ' A ';

      expect(CtData.isSiglumValid(ctData, 1, ' A ')).toBe('Siglum is duplicated');
    });

    it('rejects a siglum that matches a sigla group siglum after trimming', () => {
      const ctData = createCtData();
      ctData.siglaGroups = [{siglum: ' Group 1 ', witnesses: [0, 1]}];

      expect(CtData.isSiglumValid(ctData, 1, 'Group 1')).toBe('Siglum is a sigla group siglum');
    });

    it('accepts a unique siglum after trimming', () => {
      const ctData = createCtData();

      expect(CtData.isSiglumValid(ctData, 1, '  New  ')).toBe(true);
    });

    it('allows a witness to keep its existing siglum', () => {
      const ctData = createCtData();

      expect(CtData.isSiglumValid(ctData, 1, 'B')).toBe(true);
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

      const result = CtData.updateIncludeInAutoMarginalFoliationStatus(ctData, 2, true);

      expect(result).toBe(ctData);
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1, 2]);
    });

    it('excludes a witness and preserves other included witnesses', () => {
      const ctData = createCtData();
      ctData.includeInAutoMarginalFoliation = [0, 1, 2];

      CtData.updateIncludeInAutoMarginalFoliationStatus(ctData, 1, false);

      expect(ctData.includeInAutoMarginalFoliation).toEqual([0, 2]);
    });

    it('does not change the list when the requested status is already set', () => {
      const ctData = createCtData();
      const existingList = ctData.includeInAutoMarginalFoliation;

      expect(CtData.updateIncludeInAutoMarginalFoliationStatus(ctData, 1, true)).toBe(ctData);
      expect(ctData.includeInAutoMarginalFoliation).toBe(existingList);

      expect(CtData.updateIncludeInAutoMarginalFoliationStatus(ctData, 0, false)).toBe(ctData);
      expect(ctData.includeInAutoMarginalFoliation).toBe(existingList);
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1]);
    });

    it.each([-1, 3])('rejects witness index %i without changing the included witnesses', (witnessIndex) => {
      const ctData = createCtData();

      expect(() => CtData.updateIncludeInAutoMarginalFoliationStatus(ctData, witnessIndex, true))
        .toThrow(new ValidationError('Witness index out of range'));
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1]);
    });
  });

  describe('updateExcludeFromAutoCriticalApparatusStatus', () => {
    it('excludes a witness and preserves the existing excluded witnesses', () => {
      const ctData = createCtData();

      const result = CtData.updateExcludeFromAutoCriticalApparatusStatus(ctData, 2, true);

      expect(result).toBe(ctData);
      expect(ctData.excludeFromAutoCriticalApparatus).toEqual([2]);
    });

    it('includes a witness and preserves the other excluded witnesses', () => {
      const ctData = createCtData();
      ctData.excludeFromAutoCriticalApparatus = [0, 1, 2];

      CtData.updateExcludeFromAutoCriticalApparatusStatus(ctData, 1, false);

      expect(ctData.excludeFromAutoCriticalApparatus).toEqual([0, 2]);
    });

    it('does not change the list when the requested status is already set', () => {
      const ctData = createCtData();
      ctData.excludeFromAutoCriticalApparatus = [1];
      const existingList = ctData.excludeFromAutoCriticalApparatus;

      expect(CtData.updateExcludeFromAutoCriticalApparatusStatus(ctData, 1, true)).toBe(ctData);
      expect(ctData.excludeFromAutoCriticalApparatus).toBe(existingList);

      expect(CtData.updateExcludeFromAutoCriticalApparatusStatus(ctData, 0, false)).toBe(ctData);
      expect(ctData.excludeFromAutoCriticalApparatus).toBe(existingList);
      expect(ctData.excludeFromAutoCriticalApparatus).toEqual([1]);
    });

    it.each([-1, 3])('rejects witness index %i without changing the excluded witnesses', (witnessIndex) => {
      const ctData = createCtData();

      expect(() => CtData.updateExcludeFromAutoCriticalApparatusStatus(ctData, witnessIndex, true))
        .toThrow(new ValidationError('Witness index out of range'));
      expect(ctData.excludeFromAutoCriticalApparatus).toEqual([]);
    });
  });

  describe('updateTitle', () => {
    it('updates the title with the normalized value and returns the same CtData', () => {
      const ctData = createCtData();

      const result = CtData.updateTitle(ctData, '  New title  ');

      expect(result).toBe(ctData);
      expect(ctData.title).toBe('New title');
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