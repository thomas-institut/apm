import { describe, expect, it, vi } from 'vitest';
import { ChangeTitleAction } from '@/ReactAPM/Pages/MceComposer/Actions/ChangeTitleAction';
import { MoveChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/MoveChunkAction';
import { DeleteChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/DeleteChunkAction';
import { SetChunkBreakAction } from '@/ReactAPM/Pages/MceComposer/Actions/SetChunkBreakAction';
import { MceDataInterface } from '@/MceData/MceDataInterface';

describe('MCE Actions', () => {
  describe('ChangeTitleAction', () => {
    it('should change title and undo', () => {
      const onUpdate = vi.fn();
      const action = new ChangeTitleAction('Old', 'New', onUpdate);
      
      action.execute();
      expect(onUpdate).toHaveBeenCalledWith('New');
      
      action.undo();
      expect(onUpdate).toHaveBeenCalledWith('Old');
    });
  });

  describe('MoveChunkAction', () => {
    it('should move chunk and undo', () => {
      const mceData: MceDataInterface = {
        title: 'Test',
        chunks: [
          { chunkId: '1', break: '', chunkEditionTableId: 10, version: '1', title: 'C1', witnessIndices: [] } as any,
          { chunkId: '2', break: '', chunkEditionTableId: 20, version: '1', title: 'C2', witnessIndices: [] } as any,
          { chunkId: '3', break: '', chunkEditionTableId: 30, version: '1', title: 'C3', witnessIndices: [] } as any
        ],
        chunkOrder: [0, 1, 2],
        witnesses: [],
        sigla: [],
        siglaGroups: [],
        preamble: [],
        initialSpace: '',
        lang: '',
        stylesheetId: '',
        archived: false,
        schemaVersion: '1.0'
      };

      const onUpdate = vi.fn();
      const action = new MoveChunkAction(mceData, 0, 'forwards', onUpdate);

      action.execute();
      const updatedData = onUpdate.mock.calls[0][0];
      expect(updatedData.chunkOrder).toEqual([1, 0, 2]);

      action.undo();
      const undoneData = onUpdate.mock.calls[1][0];
      expect(undoneData.chunkOrder).toEqual([0, 1, 2]);
    });
  });

  describe('DeleteChunkAction', () => {
    it('should delete chunk and update chunkOrder', () => {
      const chunk1 = { chunkId: '1', break: '', chunkEditionTableId: 10, version: '1', title: 'C1', witnessIndices: [] as number[] } as any;
      const chunk2 = { chunkId: '2', break: '', chunkEditionTableId: 20, version: '1', title: 'C2', witnessIndices: [] as number[] } as any;
      const chunk3 = { chunkId: '3', break: '', chunkEditionTableId: 30, version: '1', title: 'C3', witnessIndices: [] as number[] } as any;

      const mceData: MceDataInterface = {
        title: 'Test',
        chunks: [chunk1, chunk2, chunk3],
        chunkOrder: [0, 1, 2],
        witnesses: [],
        sigla: [],
        siglaGroups: [],
        preamble: [],
        initialSpace: '',
        lang: '',
        stylesheetId: '',
        archived: false,
        schemaVersion: '1.0'
      };

      const ctDataStatusArray = [
        { ctDataId: 10, chunkInMceData: chunk1, apiData: null, ctDataState: 'ready' as any, errorMsg: '' },
        { ctDataId: 20, chunkInMceData: chunk2, apiData: null, ctDataState: 'ready' as any, errorMsg: '' },
        { ctDataId: 30, chunkInMceData: chunk3, apiData: null, ctDataState: 'ready' as any, errorMsg: '' }
      ];

      const onUpdate = vi.fn();
      // Delete second chunk (index 1)
      const action = new DeleteChunkAction({ mceData, ctDataStatusArray}, 1, onUpdate);

      action.execute();
      const updatedData = onUpdate.mock.calls[0][0];
      expect(updatedData.mceData.chunks.length).toBe(2);
      expect(updatedData.mceData.chunks[0].title).toBe('C1');
      expect(updatedData.mceData.chunks[1].title).toBe('C3');
      expect(updatedData.mceData.chunkOrder).toEqual([0, 1]); // C1 stayed at 0, C3 (was 2) moved to 1
      expect(updatedData.ctDataStatusArray.length).toBe(2);
      expect(updatedData.ctDataStatusArray[0].ctDataId).toBe(10);
      expect(updatedData.ctDataStatusArray[1].ctDataId).toBe(30);

      action.undo();
      expect(onUpdate).toHaveBeenLastCalledWith({ mceData, ctDataStatusArray});
    });
  });

  describe('SetChunkBreakAction', () => {
    it('should set break and undo', () => {
      const mceData: MceDataInterface = {
        title: 'Test',
        chunks: [
          { chunkId: '1', break: 'none', chunkEditionTableId: 10, version: '1', title: 'C1', witnessIndices: [] as number[] } as any,
          { chunkId: '2', break: '', chunkEditionTableId: 20, version: '1', title: 'C2', witnessIndices: [] as number[] } as any
        ],
        chunkOrder: [0, 1],
        witnesses: [],
        sigla: [],
        siglaGroups: [],
        preamble: [],
        initialSpace: '',
        lang: '',
        stylesheetId: '',
        archived: false,
        schemaVersion: '1.0'
      };

      const onUpdate = vi.fn();
      const action = new SetChunkBreakAction(mceData, 1, 'paragraph', onUpdate);

      action.execute();
      const updatedData = onUpdate.mock.calls[0][0];
      expect(updatedData.chunks[1].break).toBe('paragraph');

      action.undo();
      const undoneData = onUpdate.mock.calls[1][0];
      expect(undoneData.chunks[1].break).toBe('');
    });
  });
});
