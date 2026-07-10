import { describe, expect, it } from 'vitest';
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
});
