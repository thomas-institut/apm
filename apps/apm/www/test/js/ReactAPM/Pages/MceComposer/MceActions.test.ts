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
      const onUpdate = vi.fn();
      const action = new MoveChunkAction([0, 1, 2], [1, 0, 2], onUpdate);
      
      action.execute();
      expect(onUpdate).toHaveBeenCalledWith([1, 0, 2]);
      
      action.undo();
      expect(onUpdate).toHaveBeenCalledWith([0, 1, 2]);
    });
  });

  describe('DeleteChunkAction', () => {
    it('should delete chunk and update chunkOrder', () => {
      const mceData: MceDataInterface = {
        title: 'Test',
        chunks: [
          { chunkId: 1, break: '', chunkEditionTableId: 10, version: 1, title: 'C1', witnessIndices: {} },
          { chunkId: 2, break: '', chunkEditionTableId: 20, version: 1, title: 'C2', witnessIndices: {} },
          { chunkId: 3, break: '', chunkEditionTableId: 30, version: 1, title: 'C3', witnessIndices: {} }
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
      // Delete second chunk (index 1)
      const action = new DeleteChunkAction(mceData, 1, onUpdate);
      
      action.execute();
      const updatedData = onUpdate.mock.calls[0][0];
      expect(updatedData.chunks.length).toBe(2);
      expect(updatedData.chunks[0].title).toBe('C1');
      expect(updatedData.chunks[1].title).toBe('C3');
      expect(updatedData.chunkOrder).toEqual([0, 1]); // C1 stayed at 0, C3 (was 2) moved to 1
      
      action.undo();
      expect(onUpdate).toHaveBeenLastCalledWith(mceData);
    });
  });

  describe('SetChunkBreakAction', () => {
    it('should set break and undo', () => {
      const onUpdate = vi.fn();
      const action = new SetChunkBreakAction(1, 'none', 'paragraph', onUpdate);
      
      action.execute();
      expect(onUpdate).toHaveBeenCalledWith(1, 'paragraph');
      
      action.undo();
      expect(onUpdate).toHaveBeenCalledWith(1, 'none');
    });
  });
});
