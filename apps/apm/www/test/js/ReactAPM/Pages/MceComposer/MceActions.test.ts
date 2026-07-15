import { describe, expect, it } from 'vitest';
import { ChangeTitleAction } from '@/ReactAPM/Pages/MceComposer/Actions/ChangeTitleAction';
import { MoveChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/MoveChunkAction';
import { DeleteChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/DeleteChunkAction';
import { SetChunkBreakAction } from '@/ReactAPM/Pages/MceComposer/Actions/SetChunkBreakAction';
import { MceDataInterface } from '@/MceData/MceDataInterface';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

const makeBaseMceData = (): MceDataInterface => ({
  title: 'Test',
  chunks: [],
  chunkOrder: [],
  witnesses: [],
  sigla: [],
  siglaGroups: [],
  preamble: [],
  initialSpace: '',
  lang: '',
  stylesheetId: '',
  archived: false,
  schemaVersion: '1.0'
});

const makeState = (mceData: MceDataInterface): HistoryState => ({
  mceData,
  ctDataStatusArray: mceData.chunks.map(chunk => ({
    ctDataId: chunk.chunkEditionTableId,
    chunkInMceData: chunk,
    apiData: null,
    ctDataState: 'loaded',
    errorMsg: ''
  }))
});

describe('MCE Actions', () => {
  describe('ChangeTitleAction', () => {
    it('should change title', () => {
      const state = makeState({...makeBaseMceData(), title: 'Old'});
      const action = new ChangeTitleAction('New');

      const result = action.execute(state);
      expect(result.mceData.title).toBe('New');
      expect(action.description(state)).toBe('Change title to "New"');
    });
  });

  describe('MoveChunkAction', () => {
    it('should move chunk', () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        chunks: [
          { chunkId: '1', break: '', chunkEditionTableId: 10, version: '1', title: 'C1', witnessIndices: [] } as any,
          { chunkId: '2', break: '', chunkEditionTableId: 20, version: '1', title: 'C2', witnessIndices: [] } as any,
          { chunkId: '3', break: '', chunkEditionTableId: 30, version: '1', title: 'C3', witnessIndices: [] } as any
        ],
        chunkOrder: [0, 1, 2],
      };
      const state = makeState(mceData);
      const action = new MoveChunkAction(0, 'forwards');

      const result = action.execute(state);
      expect(result.mceData.chunkOrder).toEqual([1, 0, 2]);
    });
  });

  describe('DeleteChunkAction', () => {
    it('should delete chunk and update chunkOrder and ct data statuses', () => {
      const chunk1 = { chunkId: '1', break: '', chunkEditionTableId: 10, version: '1', title: 'C1', witnessIndices: [] as number[] } as any;
      const chunk2 = { chunkId: '2', break: '', chunkEditionTableId: 20, version: '1', title: 'C2', witnessIndices: [] as number[] } as any;
      const chunk3 = { chunkId: '3', break: '', chunkEditionTableId: 30, version: '1', title: 'C3', witnessIndices: [] as number[] } as any;

      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        chunks: [chunk1, chunk2, chunk3],
        chunkOrder: [0, 1, 2],
      };
      const state = makeState(mceData);
      const action = new DeleteChunkAction(1);

      const result = action.execute(state);
      expect(result.mceData.chunks.length).toBe(2);
      expect(result.mceData.chunks[0].title).toBe('C1');
      expect(result.mceData.chunks[1].title).toBe('C3');
      expect(result.mceData.chunkOrder).toEqual([0, 1]);
      expect(result.ctDataStatusArray.length).toBe(2);
      expect(result.ctDataStatusArray[0].ctDataId).toBe(10);
      expect(result.ctDataStatusArray[1].ctDataId).toBe(30);
    });
  });

  describe('SetChunkBreakAction', () => {
    it('should set break', () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        chunks: [
          { chunkId: '1', break: 'none', chunkEditionTableId: 10, version: '1', title: 'C1', witnessIndices: [] as number[] } as any,
          { chunkId: '2', break: '', chunkEditionTableId: 20, version: '1', title: 'C2', witnessIndices: [] as number[] } as any
        ],
        chunkOrder: [0, 1],
      };

      const state = makeState(mceData);
      const action = new SetChunkBreakAction(1, 'paragraph');

      const result = action.execute(state);
      expect(result.mceData.chunks[1].break).toBe('paragraph');
    });
  });
});
