import { describe, expect, it, vi } from 'vitest';
import { MceData } from '@/MceData/MceData.js';
import {MceDataInterface_v1, MceDataInterface_v2} from '@/MceData/MceDataInterface.js';
import { CtDataInterface } from '@/CtData/CtDataInterface.js';
import { ValidationError } from '@/lib/Error/SystemError.js';

describe('MceData', () => {

  describe('createEmpty', () => {
    it('returns a correctly initialized empty MceDataInterface object', () => {
      const empty = MceData.createEmpty();
      expect(empty.chunks).toEqual([]);
      expect(empty.chunkOrder).toEqual([]);
      expect(empty.title).toBe('New Edition');
      expect(empty.initialSpace).toBe('');
      expect(empty.preamble).toEqual([]);
      expect(empty.witnesses).toEqual([]);
      expect(empty.sigla).toEqual([]);
      expect(empty.siglaGroups).toEqual([]);
      expect(empty.lang).toBe('');
      expect(empty.stylesheetId).toBe('');
      expect(empty.archived).toBe(false);
      expect(empty.schemaVersion).toBe('3');
      expect(empty.standardizedStrings).toEqual([]);
      expect(empty.includeInAutoMarginalFoliation).toEqual([]);
    });
  });

  describe('isEmpty', () => {
    it('returns true for a newly created empty MceData', () => {
      const empty = MceData.createEmpty();
      expect(MceData.isEmpty(empty)).toBe(true);
    });

    it('returns false when chunks are present', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks.push({
        chunkId: 'c1',
        break: '',
        chunkEditionTableId: 1,
        lineNumbersRestart: false,
        title: 'Chunk 1',
        version: '1.0',
        witnessIndices: []
      });
      expect(MceData.isEmpty(mceData)).toBe(false);
    });
  });

  describe('update', () => {
    it('updates v1 to v3 and initializes missing chunkOrder to default sequence', () => {
      const mceDataV1: MceDataInterface_v1 = {
        schemaVersion: '1.0',
        title: 'Test Edition',
        lang: 'la',
        archived: false,
        siglaGroups: [],
        stylesheetId: '',
        chunks: [
          {
            chunkId: 'W1-1',
            break: '',
            chunkEditionTableId: 10,
            lineNumbersRestart: false,
            title: 'Chunk 1',
            version: '1.0',
            witnessIndices: []
          }
        ],
        initialSpace: '',
        preamble: [],
        witnesses: [],
        sigla: []
      };

      const updated = MceData.update(mceDataV1);

      expect(updated.schemaVersion).toBe('3');
      expect(updated.chunkOrder).toEqual([0]);
      expect(updated.includeInAutoMarginalFoliation).toEqual([]);
      expect(updated.standardizedStrings).toEqual([]);
    });

    it('updates v1 to v3 and keeps defined arrays intact', () => {
      const mceDataV1: MceDataInterface_v1 = {
        schemaVersion: '1.0',
        title: 'Test Edition',
        lang: 'la',
        archived: false,
        siglaGroups: [],
        stylesheetId: '',
        chunks: [
          {
            chunkId: 'W1-1',
            break: '',
            chunkEditionTableId: 10,
            lineNumbersRestart: false,
            title: 'Chunk 1',
            version: '1.0',
            witnessIndices: []
          }
        ],
        initialSpace: '',
        preamble: [],
        witnesses: [],
        sigla: [],
        chunkOrder: [5, 1, 3],
        includeInAutoMarginalFoliation: [3, 4]
      };

      const updated = MceData.update(mceDataV1);

      expect(updated.schemaVersion).toBe('3');
      expect(updated.chunkOrder).toEqual([5, 1, 3]);
      expect(updated.includeInAutoMarginalFoliation).toEqual([3, 4]);
      expect(updated.standardizedStrings).toEqual([]);
    });

    it('updates v2 to v3 and keeps arrays intact', () => {
      const mceDataV2: MceDataInterface_v2 = {
        schemaVersion: '2',
        title: 'Test Edition',
        lang: 'la',
        archived: false,
        siglaGroups: [],
        stylesheetId: '',
        chunks: [],
        initialSpace: '',
        preamble: [],
        witnesses: [],
        sigla: [],
        chunkOrder: [2, 0, 1],
        includeInAutoMarginalFoliation: [0, 2]
      };

      const updated = MceData.update(mceDataV2);

      expect(updated.schemaVersion).toBe('3');
      expect(updated.chunkOrder).toEqual([2, 0, 1]);
      expect(updated.includeInAutoMarginalFoliation).toEqual([0, 2]);
      expect(updated.standardizedStrings).toEqual([]);
    });

    it('throws ValidationError when schemaVersion is unknown', () => {
      const invalidMceData = {
        ...MceData.createEmpty(),
        schemaVersion: '999'
      } as any;

      expect(() => MceData.update(invalidMceData)).toThrow(ValidationError);
    });
  });


  describe('moveChunk', () => {
    it('moves a chunk forwards', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{} as any, {} as any, {} as any];
      mceData.chunkOrder = [0, 1, 2];

      MceData.moveChunk(mceData, 0, 'forwards');
      expect(mceData.chunkOrder).toEqual([1, 0, 2]);
    });

    it('moves a chunk backwards', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{} as any, {} as any, {} as any];
      mceData.chunkOrder = [0, 1, 2];

      MceData.moveChunk(mceData, 2, 'backwards');
      expect(mceData.chunkOrder).toEqual([0, 2, 1]);
    });

    it('does nothing when moving the first chunk backwards', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{} as any, {} as any];
      mceData.chunkOrder = [0, 1];

      MceData.moveChunk(mceData, 0, 'backwards');
      expect(mceData.chunkOrder).toEqual([0, 1]);
    });

    it('does nothing when moving the last chunk forwards', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{} as any, {} as any];
      mceData.chunkOrder = [0, 1];

      MceData.moveChunk(mceData, 1, 'forwards');
      expect(mceData.chunkOrder).toEqual([0, 1]);
    });

  });

  describe('updateChunk', () => {
    const getDocTitle = vi.fn().mockImplementation((id) => Promise.resolve(`Doc ${id}`));
    const getSourceTitle = vi.fn().mockImplementation((id) => Promise.resolve(`Source ${id}`));

    it('updates version/title and synchronizes witnesses', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'la';
      mceData.witnesses = [
        { witnessId: 'source:10', type: 'source', tid: 10, title: 'Source 10' } as any,
        { witnessId: 'source:20', type: 'source', tid: 20, title: 'Source 20' } as any
      ];
      mceData.sigla = ['S10', 'S20'];
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] }
      ];
      mceData.chunks = [
        {
          chunkId: 'c0',
          chunkEditionTableId: 1,
          version: 'v1',
          title: 'Old title',
          break: 'paragraph',
          lineNumbersRestart: false,
          witnessIndices: [0]
        } as any,
        {
          chunkId: 'c1',
          chunkEditionTableId: 2,
          version: 'v1',
          title: 'Chunk 1',
          break: 'paragraph',
          lineNumbersRestart: false,
          witnessIndices: [1]
        } as any
      ];

      const ctData = {
        archived: false,
        type: 'edition',
        lang: 'la',
        title: 'New title',
        witnesses: [
          { witnessType: 'source', ApmWitnessId: 'source:20', title: 'Source 20' },
          { witnessType: 'source', ApmWitnessId: 'source:30', title: 'Source 30' },
          { witnessType: 'edition' }
        ],
        sigla: ['S20', 'S30', 'Ed']
      } as any;

      await MceData.updateChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle);

      expect(mceData.chunks[0].version).toBe('v2');
      expect(mceData.chunks[0].title).toBe('New title');
      expect(mceData.witnesses).toEqual([
        { witnessId: 'source:20', type: 'source', tid: 20, title: 'Source 20' },
        { witnessId: 'source:30', type: 'source', tid: 30, title: 'Source 30' }
      ]);
      expect(mceData.sigla).toEqual(['S20', 'S30']);
      expect(mceData.chunks[0].witnessIndices).toEqual([0, 1, -1]);
      expect(mceData.chunks[1].witnessIndices).toEqual([0]);
      expect(mceData.siglaGroups).toEqual([{ siglum: 'G1', witnesses: [0] }]);
      expect(getSourceTitle).toHaveBeenCalledWith(30);
    });

    it('uses title resolvers for new witnesses when ct witness title is missing', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'la';
      mceData.witnesses = [
        { witnessId: 'source:20', type: 'source', tid: 20, title: 'Source 20' } as any
      ];
      mceData.sigla = ['S20'];
      mceData.chunks = [
        {
          chunkId: 'c0',
          chunkEditionTableId: 1,
          version: 'v1',
          title: 'Old title',
          break: 'paragraph',
          lineNumbersRestart: false,
          witnessIndices: [0]
        } as any
      ];

      const ctData = {
        archived: false,
        type: 'edition',
        lang: 'la',
        title: 'New title',
        witnesses: [
          { witnessType: 'source', ApmWitnessId: 'source:30', title: '' },
          { witnessType: 'fullTx', docId: 10, localWitnessId: 'A', title: '' }
        ],
        sigla: ['S30', 'A']
      } as any;

      await MceData.updateChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle);

      expect(mceData.witnesses).toEqual([
        { witnessId: 'source:30', type: 'source', tid: 30, title: 'Source 30' },
        { witnessId: 'fullTx-10-A', type: 'fullTx', docId: 10, localWitnessId: 'A', title: 'Doc 10' }
      ]);
      expect(getSourceTitle).toHaveBeenCalledWith(30);
      expect(getDocTitle).toHaveBeenCalledWith(10);
    });

    it('throws when chunk table id does not exist', async () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [
        { chunkId: 'c0', chunkEditionTableId: 1, version: 'v1', title: 'Chunk 0', witnessIndices: [] } as any
      ];

      const ctData = { archived: false, title: 'New title', witnesses: [], sigla: [] } as any;

      await expect(MceData.updateChunk(mceData, 999, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow(ValidationError);
      await expect(MceData.updateChunk(mceData, 999, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow('Chunk with table id 999 which does not exist');
    });

    it('throws when updating a non-edition chunk', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'la';
      mceData.chunks = [
        { chunkId: 'c0', chunkEditionTableId: 1, version: 'v1', title: 'Chunk 0', witnessIndices: [] } as any
      ];

      const ctData = {
        archived: false,
        type: 'translation',
        lang: 'la',
        title: 'New title',
        witnesses: [],
        sigla: []
      } as any;

      await expect(MceData.updateChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow(ValidationError);
      await expect(MceData.updateChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow('Table id 1 used to update a chunk is not an edition');
    });

    it('throws when updating a chunk with different language', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'la';
      mceData.chunks = [
        { chunkId: 'c0', chunkEditionTableId: 1, version: 'v1', title: 'Chunk 0', witnessIndices: [] } as any
      ];

      const ctData = {
        archived: false,
        type: 'edition',
        lang: 'en',
        title: 'New title',
        witnesses: [],
        sigla: []
      } as any;

      await expect(MceData.updateChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow(ValidationError);
      await expect(MceData.updateChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow("Table id 1 is not in the same language as the multi-chunk edition: 'en' (must be 'la')");
    });
  });

  describe('deleteChunk', () => {
    it('resets index-based arrays after deleting the only chunk', async () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{
        chunkId: 'c1',
        break: 'paragraph',
        chunkEditionTableId: 1,
        lineNumbersRestart: false,
        title: 'Chunk 1',
        version: 'v1',
        witnessIndices: [0]
      }];
      mceData.witnesses = [{ witnessId: 'w1', title: 'Witness 1' }];
      mceData.sigla = ['W1'];
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0] }];
      mceData.chunkOrder = [0];
      mceData.includeInAutoMarginalFoliation = [0];

      MceData.deleteChunk(mceData, 0);

      expect(mceData.chunks).toEqual([]);
      expect(mceData.witnesses).toEqual([]);
      expect(mceData.sigla).toEqual([]);
      expect(mceData.siglaGroups).toEqual([]);
      expect(mceData.chunkOrder).toEqual([]);
      expect(mceData.includeInAutoMarginalFoliation).toEqual([]);

      const replacementChunkData: CtDataInterface = {
        lang: 'la',
        witnesses: [],
        editionWitnessIndex: 0,
        witnessTitles: [],
        witnessOrder: [],
        sigla: [],
        siglaGroups: [],
        chunkId: 'c2',
        tableId: 2,
        customApparatuses: [],
        schemaVersion: '1.0',
        type: 'edition',
        title: 'Replacement chunk',
        collationMatrix: [],
        groupedColumns: [],
        automaticNormalizationsApplied: [],
        excludeFromAutoCriticalApparatus: [],
        includeInAutoMarginalFoliation: [],
        archived: false
      };

      await MceData.addChunk(mceData, 2, replacementChunkData, 'v2', async () => '', async () => '');

      expect(mceData.chunkOrder).toEqual([0]);
    });

    it('deletes a chunk and updates chunkOrder', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [
        { chunkId: 'c1', witnessIndices: [] } as any,
        { chunkId: 'c2', witnessIndices: [] } as any,
        { chunkId: 'c3', witnessIndices: [] } as any
      ];
      mceData.chunkOrder = [0, 1, 2];

      MceData.deleteChunk(mceData, 1); // Delete c2

      expect(mceData.chunks.length).toBe(2);
      expect(mceData.chunks[0].chunkId).toBe('c1');
      expect(mceData.chunks[1].chunkId).toBe('c3');
      expect(mceData.chunkOrder).toEqual([0, 1]);
    });


    it('removes unused witnesses and updates indices', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [
        { witnessId: 'w0' } as any,
        { witnessId: 'w1' } as any,
        { witnessId: 'w2' } as any
      ];
      mceData.sigla = ['W0', 'W1', 'W2'];
      mceData.chunks = [
        { chunkId: 'c0', witnessIndices: [0, 1] } as any,
        { chunkId: 'c1', witnessIndices: [1, 2] } as any
      ];
      mceData.chunkOrder = [0, 1];

      // Delete chunk 0. w0 is now unused. w1 and w2 are still used by chunk 1.
      // Chunk 1 was at index 1, now at index 0.
      // Its witnessIndices were [1, 2].
      // w1 is now at index 0, w2 is now at index 1 in the new witnesses array.
      MceData.deleteChunk(mceData, 0);

      expect(mceData.witnesses).toEqual([{ witnessId: 'w1' }, { witnessId: 'w2' }]);
      expect(mceData.sigla).toEqual(['W1', 'W2']);
      expect(mceData.chunks[0].witnessIndices).toEqual([0, 1]);
    });

    it('handles -1 in witnessIndices correctly', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.sigla = ['W0'];
      mceData.chunks = [
        { chunkId: 'c0', witnessIndices: [0] } as any,
        { chunkId: 'c1', witnessIndices: [-1, 0] } as any
      ];

      MceData.deleteChunk(mceData, 0);

      expect(mceData.witnesses).toEqual([{ witnessId: 'w0' }]);
      expect(mceData.chunks[0].witnessIndices).toEqual([-1, 0]);
    });

    it('updates siglaGroups correctly', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [
        { witnessId: 'w0' } as any,
        { witnessId: 'w1' } as any,
        { witnessId: 'w2' } as any
      ];
      mceData.sigla = ['W0', 'W1', 'W2'];
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] },
        { siglum: 'G2', witnesses: [1, 2] }
      ];
      mceData.chunks = [
        { chunkId: 'c0', witnessIndices: [0, 1] } as any,
        { chunkId: 'c1', witnessIndices: [1, 2] } as any
      ];

      // Delete chunk 0. w0 unused.
      // New witnesses: [w1, w2]
      // G1 had [0, 1]. w0 (0) removed, w1 (1) becomes 0. G1: [0]
      // G2 had [1, 2]. w1 (1) becomes 0, w2 (2) becomes 1. G2: [0, 1]
      MceData.deleteChunk(mceData, 0);

      expect(mceData.siglaGroups).toEqual([
        { siglum: 'G1', witnesses: [0] },
        { siglum: 'G2', witnesses: [0, 1] }
      ]);
    });
  });

  describe('deleteSiglaGroup', () => {
    it('deletes a sigla group at a valid index', () => {
      const mceData = MceData.createEmpty();
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] },
        { siglum: 'G2', witnesses: [1, 2] }
      ];

      const result = MceData.deleteSiglaGroup(mceData, 0);

      expect(result).toBe(mceData);
      expect(mceData.siglaGroups).toEqual([{ siglum: 'G2', witnesses: [1, 2] }]);
    });

    it('throws when index is out of range', () => {
      const mceData = MceData.createEmpty();
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0, 1] }];

      expect(() => MceData.deleteSiglaGroup(mceData, -1)).toThrow(ValidationError);
      expect(() => MceData.deleteSiglaGroup(mceData, -1)).toThrow("Invalid sigla group index -1");
      expect(() => MceData.deleteSiglaGroup(mceData, 1)).toThrow(ValidationError);
      expect(() => MceData.deleteSiglaGroup(mceData, 1)).toThrow("Invalid sigla group index 1");
    });
  });

  describe('isSiglaGroupValid', () => {
    it('returns an error for an invalid sigla group index', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0, 1] }];

      expect(MceData.isSiglaGroupValid(mceData, 1, { siglum: 'G2', witnesses: [0, 1] }))
        .toBe('Invalid sigla group index');
    });

    it('returns an error when a group has fewer than two witnesses', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];

      expect(MceData.isSiglaGroupValid(mceData, -1, { siglum: 'G1', witnesses: [0] }))
        .toBe('Sigla group must have at least two witnesses');
    });

    it('returns an error when a group has an empty siglum after trim', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];

      expect(MceData.isSiglaGroupValid(mceData, -1, { siglum: '   ', witnesses: [0, 1] }))
        .toBe('Sigla group must have a non-empty siglum');
    });

    it('returns an error when a group contains invalid witnesses', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];

      expect(MceData.isSiglaGroupValid(mceData, -1, { siglum: 'G1', witnesses: [0, 2] }))
        .toBe('Sigla group contains invalid witnesses');
    });

    it('returns an error when siglum duplicates another sigla group siglum', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] },
        { siglum: 'G2', witnesses: [1, 2] }
      ];

      expect(MceData.isSiglaGroupValid(mceData, 0, { siglum: 'G2', witnesses: [0, 2] }))
        .toBe('Sigla group siglum is duplicated');
    });

    it('returns an error when siglum duplicates a witness siglum', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      mceData.sigla = ['A', 'B', 'C'];

      expect(MceData.isSiglaGroupValid(mceData, -1, { siglum: 'B', witnesses: [0, 2] }))
        .toBe('Sigla group siglum is a witness siglum');
    });

    it('returns an error when a group duplicates another group', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] },
        { siglum: 'G2', witnesses: [1, 2] }
      ];

      expect(MceData.isSiglaGroupValid(mceData, 0, { siglum: 'G3', witnesses: [1, 2] }))
        .toBe('Sigla group is duplicated');
    });

    it('returns true for a valid replacement group', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] },
        { siglum: 'G2', witnesses: [1, 2] }
      ];

      expect(MceData.isSiglaGroupValid(mceData, 0, { siglum: 'G3', witnesses: [0, 2] })).toBe(true);
    });

    it('returns true when replacement group is identical to current group at index', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      mceData.siglaGroups = [
        { siglum: 'G1', witnesses: [0, 1] },
        { siglum: 'G2', witnesses: [1, 2] }
      ];

      expect(MceData.isSiglaGroupValid(mceData, 0, { siglum: 'G1', witnesses: [0, 1] })).toBe(true);
    });
  });

  describe('changeSiglaGroup', () => {
    it('throws when index is out of range', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0, 1] }];

      expect(() => MceData.changeSiglaGroup(mceData, -1, { siglum: 'G2', witnesses: [0, 1] }))
        .toThrow(ValidationError);
      expect(() => MceData.changeSiglaGroup(mceData, -1, { siglum: 'G2', witnesses: [0, 1] }))
        .toThrow('Invalid sigla group index -1');
      expect(() => MceData.changeSiglaGroup(mceData, 1, { siglum: 'G2', witnesses: [0, 1] }))
        .toThrow(ValidationError);
      expect(() => MceData.changeSiglaGroup(mceData, 1, { siglum: 'G2', witnesses: [0, 1] }))
        .toThrow('Invalid sigla group index 1');
    });

    it('replaces a group using a deep copy', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0, 1] }];
      const newGroup = { siglum: 'G2', witnesses: [1, 2] };

      MceData.changeSiglaGroup(mceData, 0, newGroup);
      newGroup.witnesses.push(0);

      expect(mceData.siglaGroups).toEqual([{ siglum: 'G2', witnesses: [1, 2] }]);
    });

    it('throws when replacement group is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0, 1] }];

      expect(() => MceData.changeSiglaGroup(mceData, 0, { siglum: 'G2', witnesses: [0] }))
        .toThrow(ValidationError);
      expect(() => MceData.changeSiglaGroup(mceData, 0, { siglum: 'G2', witnesses: [0] }))
        .toThrow('Invalid sigla group {"siglum":"G2","witnesses":[0]}: Sigla group must have at least two witnesses');
    });
  });

  describe('addSiglaGroup', () => {
    it('adds a sigla group using a deep copy', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any, { witnessId: 'w2' } as any];
      const group = { siglum: 'G1', witnesses: [0, 1] };

      MceData.addSiglaGroup(mceData, group);
      group.witnesses.push(2);

      expect(mceData.siglaGroups).toEqual([{ siglum: 'G1', witnesses: [0, 1] }]);
    });

    it('throws when group is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];

      expect(() => MceData.addSiglaGroup(mceData, { siglum: 'G1', witnesses: [0] }))
        .toThrow(ValidationError);
      expect(() => MceData.addSiglaGroup(mceData, { siglum: 'G1', witnesses: [0] }))
        .toThrow('Invalid sigla group {"siglum":"G1","witnesses":[0]}: Sigla group must have at least two witnesses');
      expect(mceData.siglaGroups).toEqual([]);
    });
  });

  describe('standardized string manipulation', () => {
    it('adds a standardized string with empty instances and trims input strings', () => {
      const mceData = MceData.createEmpty();

      const result = MceData.addStandardizedString(mceData, '  uel ', ' vel  ');

      expect(result).toBe(mceData);
      expect(mceData.standardizedStrings).toEqual([
        {original: 'uel', standardized: 'vel', instances: []}
      ]);
    });

    it('throws when adding a standardized string with invalid values after trim', () => {
      const mceData = MceData.createEmpty();

      expect(() => MceData.addStandardizedString(mceData, '   ', 'vel')).toThrow(ValidationError);
      expect(() => MceData.addStandardizedString(mceData, 'uel', '   ')).toThrow(ValidationError);
    });

    it('throws when adding a standardized string with identical values after trim', () => {
      const mceData = MceData.createEmpty();

      expect(() => MceData.addStandardizedString(mceData, ' uel ', 'uel  ')).toThrow(ValidationError);
      expect(() => MceData.addStandardizedString(mceData, ' uel ', 'uel  ')).toThrow('Original and standardized strings cannot be the same');
    });

    it('throws when adding a duplicate standardized string after trim', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [{original: 'uel', standardized: 'vel', instances: []}];

      expect(() => MceData.addStandardizedString(mceData, ' uel ', 'v')).toThrow(ValidationError);
      expect(() => MceData.addStandardizedString(mceData, ' uel ', 'v')).toThrow("Standardized string 'uel' already exists");
    });

    it('deletes an existing standardized string', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [
        {original: 'uel', standardized: 'vel', instances: []},
        {original: 'autem', standardized: 'aut', instances: []}
      ];

      const result = MceData.deleteStandardizeString(mceData, 'uel');

      expect(result).toBe(mceData);
      expect(mceData.standardizedStrings).toEqual([
        {original: 'autem', standardized: 'aut', instances: []}
      ]);
    });

    it('throws when deleting with invalid original string', () => {
      const mceData = MceData.createEmpty();

      expect(() => MceData.deleteStandardizeString(mceData, '')).toThrow(ValidationError);
      expect(() => MceData.deleteStandardizeString(mceData, undefined as unknown as string)).toThrow(ValidationError);
    });

    it('accepts and rejects standardized string instances', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [{original: 'uel', standardized: 'vel', instances: []}];

      MceData.acceptStandardizedStringInstance(mceData, 'uel', 3);
      expect(mceData.standardizedStrings[0].instances).toEqual([{mainTextIndex: 3, status: 'accepted'}]);

      MceData.rejectStandardizedStringInstance(mceData, 'uel', 3);
      expect(mceData.standardizedStrings[0].instances).toEqual([{mainTextIndex: 3, status: 'rejected'}]);

      MceData.acceptStandardizedStringInstance(mceData, 'uel', 4);
      expect(mceData.standardizedStrings[0].instances).toEqual([
        {mainTextIndex: 3, status: 'rejected'},
        {mainTextIndex: 4, status: 'accepted'}
      ]);
    });

    it('resets a standardized string instance', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [{
        original: 'uel',
        standardized: 'vel',
        instances: [
          {mainTextIndex: 1, status: 'accepted'},
          {mainTextIndex: 2, status: 'rejected'}
        ]
      }];

      const result = MceData.resetStandardizedStringInstance(mceData, 'uel', 1);

      expect(result).toBe(mceData);
      expect(mceData.standardizedStrings[0].instances).toEqual([
        {mainTextIndex: 2, status: 'rejected'}
      ]);
    });

    it('resets all standardized string instances for a specific string', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [
        {
          original: 'uel',
          standardized: 'vel',
          instances: [
            {mainTextIndex: 1, status: 'accepted'},
            {mainTextIndex: 2, status: 'rejected'}
          ]
        },
        {
          original: 'autem',
          standardized: 'aut',
          instances: [
            {mainTextIndex: 7, status: 'accepted'}
          ]
        }
      ];

      const result = MceData.resetStandardizedStringInstanceAll(mceData, 'uel');

      expect(result).toBe(mceData);
      expect(mceData.standardizedStrings).toEqual([
        {
          original: 'uel',
          standardized: 'vel',
          instances: []
        },
        {
          original: 'autem',
          standardized: 'aut',
          instances: [
            {mainTextIndex: 7, status: 'accepted'}
          ]
        }
      ]);
    });

    it('throws when resetStandardizedStringInstanceAll targets an invalid or missing string', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [{original: 'uel', standardized: 'vel', instances: []}];

      expect(() => MceData.resetStandardizedStringInstanceAll(mceData, '')).toThrow(ValidationError);
      expect(() => MceData.resetStandardizedStringInstanceAll(mceData, undefined as unknown as string)).toThrow(ValidationError);
      expect(() => MceData.resetStandardizedStringInstanceAll(mceData, 'autem')).toThrow(ValidationError);
      expect(() => MceData.resetStandardizedStringInstanceAll(mceData, 'autem')).toThrow("String 'autem' not found");
    });

    it('throws when instance operations target an invalid or missing string', () => {
      const mceData = MceData.createEmpty();
      mceData.standardizedStrings = [{original: 'uel', standardized: 'vel', instances: []}];

      expect(() => MceData.acceptStandardizedStringInstance(mceData, '', 0)).toThrow(ValidationError);
      expect(() => MceData.rejectStandardizedStringInstance(mceData, 'autem', 0)).toThrow(ValidationError);
      expect(() => MceData.resetStandardizedStringInstance(mceData, 'autem', 0)).toThrow(ValidationError);
      expect(() => MceData.rejectStandardizedStringInstance(mceData, 'autem', 0)).toThrow("String 'autem' not found");
    });
  });

  describe('setTitle', () => {
    it('sets the title on the mceData', () => {
      const mceData = MceData.createEmpty();
      mceData.title = 'Old Title';

      MceData.setTitle(mceData, 'New Title');
      expect(mceData.title).toBe('New Title');
    });

    it('trims whitespace from the new title', () => {
      const mceData = MceData.createEmpty();

      MceData.setTitle(mceData, '  Trimmed Title  ');
      expect(mceData.title).toBe('Trimmed Title');
    });

    it('throws when given an empty string after trim', () => {
      const mceData = MceData.createEmpty();
      mceData.title = 'Original';

      expect(() => MceData.setTitle(mceData, '   ')).toThrow(ValidationError);
      expect(() => MceData.setTitle(mceData, '   ')).toThrow("Invalid title ''");
      expect(mceData.title).toBe('Original');
    });

    it('returns the mceData instance', () => {
      const mceData = MceData.createEmpty();

      const result = MceData.setTitle(mceData, 'Title');
      expect(result).toBe(mceData);
    });
  });

  describe('setChunkBreak', () => {
    it('sets the break on the chunk at the given index', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [
        { break: '' } as any,
        { break: 'paragraph' } as any,
      ];

      MceData.setChunkBreak(mceData, 0, 'paragraph');
      expect(mceData.chunks[0].break).toBe('paragraph');

      MceData.setChunkBreak(mceData, 1, '');
      expect(mceData.chunks[1].break).toBe('');
    });

    it('throws when chunkIndex is negative', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: 'paragraph' } as any];

      expect(() => MceData.setChunkBreak(mceData, -1, '')).toThrow(ValidationError);
      expect(() => MceData.setChunkBreak(mceData, -1, '')).toThrow('Invalid chunk index -1');
      expect(mceData.chunks[0].break).toBe('paragraph');
    });

    it('throws when chunkIndex is out of range', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: 'paragraph' } as any];

      expect(() => MceData.setChunkBreak(mceData, 1, '')).toThrow(ValidationError);
      expect(() => MceData.setChunkBreak(mceData, 1, '')).toThrow('Invalid chunk index 1');
      expect(mceData.chunks[0].break).toBe('paragraph');
    });

    it('throws when break value is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: 'paragraph' } as any];

      expect(() => MceData.setChunkBreak(mceData, 0, 'invalid')).toThrow(ValidationError);
      expect(() => MceData.setChunkBreak(mceData, 0, 'invalid')).toThrow("Invalid chunk break 'invalid'");
      expect(mceData.chunks[0].break).toBe('paragraph');
    });

    it('throws when chunks array is empty', () => {
      const mceData = MceData.createEmpty();

      expect(() => MceData.setChunkBreak(mceData, 0, 'paragraph')).toThrow(ValidationError);
      expect(() => MceData.setChunkBreak(mceData, 0, 'paragraph')).toThrow('Invalid chunk index 0');
      expect(mceData.chunks).toEqual([]);
    });

    it('returns the mceData instance', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: '' } as any];

      const result = MceData.setChunkBreak(mceData, 0, 'paragraph');
      expect(result).toBe(mceData);
    });
  });

  describe('setSiglum', () => {
    it('sets a trimmed siglum at the given witness index', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.sigla = ['A', 'B'];

      MceData.setSiglum(mceData, 1, '  C  ');

      expect(mceData.sigla).toEqual(['A', 'C']);
    });

    it('throws when witness index is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.sigla = ['A'];

      expect(() => MceData.setSiglum(mceData, -1, 'B')).toThrow(ValidationError);
      expect(() => MceData.setSiglum(mceData, 1, 'C')).toThrow(ValidationError);

      expect(mceData.sigla).toEqual(['A']);
    });

    it('throws when siglum is empty after trimming', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.sigla = ['A'];

      expect(() => MceData.setSiglum(mceData, 0, '   ')).toThrow(ValidationError);

      expect(mceData.sigla).toEqual(['A']);
    });

    it('throws when siglum is duplicated in witness sigla', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.sigla = ['A', 'B'];

      expect(() => MceData.setSiglum(mceData, 1, ' A ')).toThrow(ValidationError);

      expect(mceData.sigla).toEqual(['A', 'B']);
    });

    it('throws when siglum is duplicated in sigla groups', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.sigla = ['A', 'B'];
      mceData.siglaGroups = [{ siglum: ' G1 ', witnesses: [0, 1] }];

      expect(() => MceData.setSiglum(mceData, 1, 'G1')).toThrow(ValidationError);

      expect(mceData.sigla).toEqual(['A', 'B']);
    });
  });

  describe('setAutoMarginalFoliation', () => {
    it('includes witness index when newState is true', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];

      MceData.setAutoMarginalFoliation(mceData, 1, true);

      expect(mceData.includeInAutoMarginalFoliation).toContain(1);
    });

    it('removes witness index when newState is false', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any, { witnessId: 'w1' } as any];
      mceData.includeInAutoMarginalFoliation = [0, 1];

      MceData.setAutoMarginalFoliation(mceData, 1, false);

      expect(mceData.includeInAutoMarginalFoliation).toEqual([0]);
    });

    it('throws when witness index is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.includeInAutoMarginalFoliation = [0];

      expect(() => MceData.setAutoMarginalFoliation(mceData, -1, true)).toThrow(ValidationError);
      expect(() => MceData.setAutoMarginalFoliation(mceData, -1, true)).toThrow('Invalid witness index -1');
      expect(() => MceData.setAutoMarginalFoliation(mceData, 1, false)).toThrow(ValidationError);
      expect(() => MceData.setAutoMarginalFoliation(mceData, 1, false)).toThrow('Invalid witness index 1');

      expect(mceData.includeInAutoMarginalFoliation).toEqual([0]);
    });
  });

  describe('addChunk', () => {
    const getDocTitle = vi.fn().mockImplementation((id) => Promise.resolve(`Doc ${id}`));
    const getSourceTitle = vi.fn().mockImplementation((id) => Promise.resolve(`Source ${id}`));

    it('throws when adding duplicate chunks', async () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ chunkEditionTableId: 1, version: 'v1' } as any];

      const ctData = { chunkId: 'c2', lang: 'en' } as any;
      await expect(MceData.addChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow(ValidationError);
      await expect(MceData.addChunk(mceData, 1, ctData, 'v2', getDocTitle, getSourceTitle))
        .rejects
        .toThrow('Table 1 already included');
    });

    it('throws when adding chunks with different language', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'en';
      mceData.chunks = [{ chunkId: 'c1' } as any];

      const ctData = { chunkId: 'c2', lang: 'fr', type: 'edition' } as any;

      await expect(MceData.addChunk(mceData, 2, ctData, 'v1', getDocTitle, getSourceTitle))
        .rejects
        .toThrow(ValidationError);
      await expect(MceData.addChunk(mceData, 2, ctData, 'v1', getDocTitle, getSourceTitle))
        .rejects
        .toThrow("Table id 2 is not in the same language as the multi-chunk edition: 'fr' (must be 'en')");
    });

    it('throws when adding a non-edition chunk', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'la';
      mceData.chunks = [{ chunkId: 'c1' } as any];

      const ctData = { chunkId: 'c2', lang: 'la', type: 'translation', witnesses: [], sigla: [] } as any;

      await expect(MceData.addChunk(mceData, 2, ctData, 'v1', getDocTitle, getSourceTitle))
        .rejects
        .toThrow(ValidationError);
      await expect(MceData.addChunk(mceData, 2, ctData, 'v1', getDocTitle, getSourceTitle))
        .rejects
        .toThrow('Table id 2 used to add a chunk is not an edition');
    });

    it('sets language and adds first chunk correctly', async () => {
      const mceData = MceData.createEmpty();
      const ctData = {
        chunkId: 'c1',
        lang: 'la',
        type: 'edition',
        title: 'Chunk Title',
        witnesses: [
          { witnessType: 'edition' },
          { witnessType: 'fullTx', docId: 10, localWitnessId: 'A' },
          { witnessType: 'source', ApmWitnessId: 'source:20' }
        ],
        sigla: ['Ed', 'A', 'S']
      } as any;

      await MceData.addChunk(mceData, 1, ctData, '2023-01-01', getDocTitle, getSourceTitle);

      expect(mceData.lang).toBe('la');
      expect(mceData.chunks.length).toBe(1);
      expect(mceData.chunks[0]).toEqual({
        chunkId: 'c1',
        chunkEditionTableId: 1,
        version: '2023-01-01',
        break: 'paragraph',
        lineNumbersRestart: false,
        witnessIndices: [-1, 0, 1],
        title: 'Chunk Title'
      });
      expect(mceData.witnesses.length).toBe(2);
      expect(mceData.witnesses[0]).toEqual({
        type: 'fullTx',
        witnessId: 'fullTx-10-A',
        docId: 10,
        localWitnessId: 'A',
        title: 'Doc 10'
      });
      expect(mceData.witnesses[1]).toEqual({
        type: 'source',
        witnessId: 'source:20',
        tid: 20,
        title: 'Source 20'
      });
      expect(mceData.sigla).toEqual(['A', 'S']);
      expect(mceData.chunkOrder).toEqual([0]);
    });

    it('reuses existing witnesses in subsequent chunks', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'la';
      mceData.witnesses = [{ witnessId: 'fullTx-10-A' } as any];
      mceData.sigla = ['A'];

      const ctData = {
        chunkId: 'c2',
        lang: 'la',
        type: 'edition',
        witnesses: [{ witnessType: 'fullTx', docId: 10, localWitnessId: 'A' }],
        sigla: ['A']
      } as any;

      await MceData.addChunk(mceData, 2, ctData, 'v2', getDocTitle, getSourceTitle);

      expect(mceData.chunks.length).toBe(1);
      expect(mceData.chunks[0].witnessIndices).toEqual([0]);
      expect(mceData.witnesses.length).toBe(1);
    });

    it('handles siglum collisions by generating a unique one', async () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.sigla = ['A'];

      const ctData = {
        chunkId: 'c1',
        lang: 'en',
        type: 'edition',
        witnesses: [{ witnessType: 'fullTx', docId: 10, localWitnessId: 'B' }],
        sigla: ['A']
      } as any;

      await MceData.addChunk(mceData, 1, ctData, 'v1', getDocTitle, getSourceTitle);

      // addNewWitnessInfo pushes to witnesses first, so length becomes 2. witnessIndex is 1.
      expect(mceData.sigla).toEqual(['A', 'W1']);
    });
  });
});
