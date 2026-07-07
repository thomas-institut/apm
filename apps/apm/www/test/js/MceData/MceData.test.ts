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
});
