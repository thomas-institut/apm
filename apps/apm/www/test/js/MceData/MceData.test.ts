import { describe, expect, it, vi } from 'vitest';
import { MceData } from '@/MceData/MceData.js';
import { MceDataInterface } from '@/MceData/MceDataInterface.js';

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
      expect(empty.schemaVersion).toBe('1.0');
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

  describe('fix', () => {
    it('initializes chunkOrder and includeInAutoMarginalFoliation if they are missing', () => {
      const incomplete = {
        chunks: [
          { chunkId: 'c1', title: 'C1' },
          { chunkId: 'c2', title: 'C2' }
        ]
      } as unknown as MceDataInterface;

      const fixed = MceData.fix(incomplete);
      expect(fixed.chunkOrder).toEqual([0, 1]);
      expect(fixed.includeInAutoMarginalFoliation).toEqual([]);
    });

    it('does not overwrite existing chunkOrder or includeInAutoMarginalFoliation', () => {
      const existing: MceDataInterface = {
        ...MceData.createEmpty(),
        chunks: [
          { chunkId: 'c1', title: 'C1' } as any,
          { chunkId: 'c2', title: 'C2' } as any
        ],
        chunkOrder: [1, 0],
        includeInAutoMarginalFoliation: [5]
      };

      const fixed = MceData.fix(existing);
      expect(fixed.chunkOrder).toEqual([1, 0]);
      expect(fixed.includeInAutoMarginalFoliation).toEqual([5]);
    });
  });

  describe('getDefaultChunkOrder', () => {
    it('returns a sequence of indices based on the number of chunks', () => {
      const mceData = {
        chunks: [{}, {}, {}]
      } as unknown as MceDataInterface;

      expect(MceData.getDefaultChunkOrder(mceData)).toEqual([0, 1, 2]);
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

    it('initializes chunkOrder if it is missing before moving', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{} as any, {} as any];
      delete mceData.chunkOrder;

      MceData.moveChunk(mceData, 0, 'forwards');
      expect(mceData.chunkOrder).toEqual([1, 0]);
    });
  });

  describe('deleteChunk', () => {
    it('handles deleting the only chunk', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ chunkId: 'c1' } as any];
      mceData.witnesses = [{ witnessId: 'w1' } as any];
      mceData.sigla = ['W1'];
      mceData.siglaGroups = [{ siglum: 'G1', witnesses: [0] }];
      mceData.chunkOrder = [0];

      MceData.deleteChunk(mceData, 0);

      expect(mceData.chunks).toEqual([]);
      expect(mceData.witnesses).toEqual([]);
      expect(mceData.sigla).toEqual([]);
      expect(mceData.siglaGroups).toEqual([]);
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

    it('initializes chunkOrder if missing when deleting a chunk', () => {
      const mceData = MceData.createEmpty();
      delete mceData.chunkOrder;
      mceData.chunks = [
        { chunkId: 'c1', witnessIndices: [] } as any,
        { chunkId: 'c2', witnessIndices: [] } as any,
        { chunkId: 'c3', witnessIndices: [] } as any
      ];

      MceData.deleteChunk(mceData, 1);

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

      expect(() => MceData.deleteSiglaGroup(mceData, -1)).toThrow("Invalid sigla group index -1");
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
        .toThrow('Invalid sigla group index -1');
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
        .toThrow('Invalid sigla group {"siglum":"G1","witnesses":[0]}: Sigla group must have at least two witnesses');
      expect(mceData.siglaGroups).toEqual([]);
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

    it('does not change the title when given an empty string after trim', () => {
      const mceData = MceData.createEmpty();
      mceData.title = 'Original';

      MceData.setTitle(mceData, '   ');
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

    it('does nothing when chunkIndex is negative', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: 'paragraph' } as any];

      MceData.setChunkBreak(mceData, -1, '');
      expect(mceData.chunks[0].break).toBe('paragraph');
    });

    it('does nothing when chunkIndex is out of range', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: 'paragraph' } as any];

      MceData.setChunkBreak(mceData, 1, '');
      expect(mceData.chunks[0].break).toBe('paragraph');
    });

    it('does nothing when break value is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ break: 'paragraph' } as any];

      MceData.setChunkBreak(mceData, 0, 'invalid');
      expect(mceData.chunks[0].break).toBe('paragraph');
    });

    it('does nothing when chunks array is empty', () => {
      const mceData = MceData.createEmpty();

      MceData.setChunkBreak(mceData, 0, 'paragraph');
      // Should not throw, mceData remains empty
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

    it('does nothing when witness index is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.sigla = ['A'];

      MceData.setSiglum(mceData, -1, 'B');
      MceData.setSiglum(mceData, 1, 'C');

      expect(mceData.sigla).toEqual(['A']);
    });

    it('does nothing when siglum is empty after trimming', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.sigla = ['A'];

      MceData.setSiglum(mceData, 0, '   ');

      expect(mceData.sigla).toEqual(['A']);
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

    it('does nothing when witness index is invalid', () => {
      const mceData = MceData.createEmpty();
      mceData.witnesses = [{ witnessId: 'w0' } as any];
      mceData.includeInAutoMarginalFoliation = [0];

      MceData.setAutoMarginalFoliation(mceData, -1, true);
      MceData.setAutoMarginalFoliation(mceData, 1, false);

      expect(mceData.includeInAutoMarginalFoliation).toEqual([0]);
    });
  });

  describe('addChunk', () => {
    const getDocTitle = vi.fn().mockImplementation((id) => Promise.resolve(`Doc ${id}`));
    const getSourceTitle = vi.fn().mockImplementation((id) => Promise.resolve(`Source ${id}`));

    it('prevents adding duplicate chunks', async () => {
      const mceData = MceData.createEmpty();
      mceData.chunks = [{ chunkEditionTableId: 1, version: 'v1' } as any];

      const ctData = { chunkId: 'c2', lang: 'en' } as any;
      const result = await MceData.addChunk(mceData, 1, ctData, 'v1', getDocTitle, getSourceTitle);

      expect(result.chunks.length).toBe(1);
    });

    it('prevents adding chunks with different language', async () => {
      const mceData = MceData.createEmpty();
      mceData.lang = 'en';
      mceData.chunks = [{ chunkId: 'c1' } as any];

      const ctData = { chunkId: 'c2', lang: 'fr' } as any;
      const result = await MceData.addChunk(mceData, 2, ctData, 'v1', getDocTitle, getSourceTitle);

      expect(result.chunks.length).toBe(1);
    });

    it('sets language and adds first chunk correctly', async () => {
      const mceData = MceData.createEmpty();
      const ctData = {
        chunkId: 'c1',
        lang: 'la',
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
        witnesses: [{ witnessType: 'fullTx', docId: 10, localWitnessId: 'B' }],
        sigla: ['A']
      } as any;

      await MceData.addChunk(mceData, 1, ctData, 'v1', getDocTitle, getSourceTitle);

      // addNewWitnessInfo pushes to witnesses first, so length becomes 2. witnessIndex is 1.
      expect(mceData.sigla).toEqual(['A', 'W1']);
    });

    it('initializes chunkOrder if missing when adding a chunk', async () => {
      const mceData = MceData.createEmpty();
      delete mceData.chunkOrder;

      const ctData = { chunkId: 'c1', lang: 'en', witnesses: [], sigla: [] } as any;
      await MceData.addChunk(mceData, 1, ctData, 'v1', getDocTitle, getSourceTitle);

      expect(mceData.chunkOrder).toEqual([0]);
    });
  });
});
