import { describe, expect, it } from 'vitest';
import { ChangeTitleAction } from '@/ReactAPM/Pages/MceComposer/Actions/ChangeTitleAction';
import { MoveChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/MoveChunkAction';
import { DeleteChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/DeleteChunkAction';
import { SetChunkBreakAction } from '@/ReactAPM/Pages/MceComposer/Actions/SetChunkBreakAction';
import { AddChunkAction } from '@/ReactAPM/Pages/MceComposer/Actions/AddChunkAction';
import { SetSiglumAction } from '@/ReactAPM/Pages/MceComposer/Actions/SetSiglumAction';
import { SetIncludeInAutoMarginalFoliationAction } from '@/ReactAPM/Pages/MceComposer/Actions/SetIncludeInAutoMarginalFoliationAction';
import { AddStandardizedStringAction } from '@/ReactAPM/Pages/MceComposer/Actions/AddStandardizedStringAction';
import { DeleteStandardizedStringAction } from '@/ReactAPM/Pages/MceComposer/Actions/DeleteStandardizedStringAction';
import { ResetStandardizedStringAllAction } from '@/ReactAPM/Pages/MceComposer/Actions/ResetStandardizedStringAllAction';
import { MceDataInterface } from '@/MceData/MceDataInterface';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {ValidationError} from '@/lib/Error/SystemError';

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
  schemaVersion: '3',
  standardizedStrings: [],
  includeInAutoMarginalFoliation: [],
});

const makeState = (mceData: MceDataInterface): MceComposerHistoryState => ({
  mceData,
});

describe('MCE Actions', () => {
  describe('ChangeTitleAction', () => {
    it('should change title', async () => {
      const state = makeState({...makeBaseMceData(), title: 'Old'});
      const action = new ChangeTitleAction('New');

      const result = await action.execute(state);
      expect(result.mceData.title).toBe('New');
      expect(action.description(state)).toBe('Change title to "New"');
    });
  });

  describe('MoveChunkAction', () => {
    it('should move chunk', async () => {
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

      const result = await action.execute(state);
      expect(result.mceData.chunkOrder).toEqual([1, 0, 2]);
    });
  });

  describe('DeleteChunkAction', () => {
    it('should delete chunk and update chunkOrder', async () => {
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

      const result = await action.execute(state);
      expect(result.mceData.chunks.length).toBe(2);
      expect(result.mceData.chunks[0].title).toBe('C1');
      expect(result.mceData.chunks[1].title).toBe('C3');
      expect(result.mceData.chunkOrder).toEqual([0, 1]);
    });
  });

  describe('SetChunkBreakAction', () => {
    it('should set break', async () => {
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

      const result = await action.execute(state);
      expect(result.mceData.chunks[1].break).toBe('paragraph');
    });
  });

  describe('AddChunkAction', () => {
    it('should add chunk', async () => {
      const state = makeState(makeBaseMceData());
      const action = new AddChunkAction(
        10,
        {
          authorTid: 0, ctInfo: [], docInfo: [], isLatestVersion: false, versionId: 0, versions: [],
          timeStamp: '2025-01-01',
          ctData: {
            lang: 'la',
            witnesses: [{ witnessType: 'edition', ApmWitnessId: 'edition', tokens: [] } as any],
            editionWitnessIndex: 0,
            witnessTitles: ['Edition'],
            witnessOrder: [0],
            sigla: ['E'],
            siglaGroups: [],
            chunkId: '1',
            tableId: 10,
            customApparatuses: [],
            schemaVersion: '1.0',
            type: 'edition',
            title: 'Chunk 1',
            collationMatrix: [],
            groupedColumns: [],
            automaticNormalizationsApplied: [],
            excludeFromAutoCriticalApparatus: [],
            includeInAutoMarginalFoliation: [],
            archived: false,
          }
        },
        async (_docId) => 'Doc',
        async (_sourceId) => 'Source',
      );

      const result = await action.execute(state);
      expect(result.mceData.chunks.length).toBe(1);
      expect(result.mceData.chunks[0].chunkId).toBe('1');
      expect(result.mceData.chunks[0].chunkEditionTableId).toBe(10);
      expect(result.mceData.chunks[0].version).toBe('2025-01-01');
      expect(result.mceData.chunkOrder).toEqual([0]);
      expect(action.description()).toBe('Add chunk 1 to edition');
    });
  });

  describe('SetSiglumAction', () => {
    it('should set siglum and update description', async () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        witnesses: [
          { witnessId: 'w1', title: 'Witness A' } as any,
          { witnessId: 'w2', title: 'Witness B' } as any
        ],
        sigla: ['A', 'B']
      };

      const state = makeState(mceData);
      const action = new SetSiglumAction(1, 'C');

      const result = await action.execute(state);
      expect(result.mceData.sigla).toEqual(['A', 'C']);
      expect(action.description()).toBe("Change siglum for Witness B from 'B' to 'C'");
    });

    it('should throw when witness index is out of bounds', async () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        witnesses: [{ witnessId: 'w1', title: 'Witness A' } as any],
        sigla: ['A']
      };

      const state = makeState(mceData);

      await expect(new SetSiglumAction(-1, 'B').execute(state)).rejects.toThrow(ValidationError);
      await expect(new SetSiglumAction(-1, 'B').execute(state)).rejects.toThrow('Witness index -1 is out of bounds');
      await expect(new SetSiglumAction(1, 'B').execute(state)).rejects.toThrow(ValidationError);
      await expect(new SetSiglumAction(1, 'B').execute(state)).rejects.toThrow('Witness index 1 is out of bounds');
    });

    it('should throw when siglum is empty', async () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        witnesses: [{ witnessId: 'w1', title: 'Witness A' } as any],
        sigla: ['A']
      };

      const state = makeState(mceData);

      await expect(new SetSiglumAction(0, '   ').execute(state)).rejects.toThrow(ValidationError);
      await expect(new SetSiglumAction(0, '   ').execute(state)).rejects.toThrow('Siglum cannot be empty');
    });
  });

  describe('SetIncludeInAutoMarginalFoliationAction', () => {
    it('should include witness index and update description', async () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        witnesses: [
          { witnessId: 'w1', title: 'Witness A' } as any,
          { witnessId: 'w2', title: 'Witness B' } as any
        ],
        includeInAutoMarginalFoliation: [0]
      };

      const state = makeState(mceData);
      const action = new SetIncludeInAutoMarginalFoliationAction(1, true);

      const result = await action.execute(state);
      expect(result.mceData.includeInAutoMarginalFoliation).toEqual([0, 1]);
      expect(action.description()).toBe('Include Witness B in auto marginal foliation');
    });

    it('should exclude witness index and update description', async () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        witnesses: [
          { witnessId: 'w1', title: 'Witness A' } as any,
          { witnessId: 'w2', title: 'Witness B' } as any
        ],
        includeInAutoMarginalFoliation: [0, 1]
      };

      const state = makeState(mceData);
      const action = new SetIncludeInAutoMarginalFoliationAction(1, false);

      const result = await action.execute(state);
      expect(result.mceData.includeInAutoMarginalFoliation).toEqual([0]);
      expect(action.description()).toBe('Exclude Witness B from auto marginal foliation');
    });

    it('should throw when witness index is out of bounds', async () => {
      const mceData: MceDataInterface = {
        ...makeBaseMceData(),
        witnesses: [{ witnessId: 'w1', title: 'Witness A' } as any],
      };

      const state = makeState(mceData);

      await expect(new SetIncludeInAutoMarginalFoliationAction(-1, true).execute(state)).rejects.toThrow(ValidationError);
      await expect(new SetIncludeInAutoMarginalFoliationAction(-1, true).execute(state)).rejects.toThrow('Witness index -1 is out of bounds');
      await expect(new SetIncludeInAutoMarginalFoliationAction(1, false).execute(state)).rejects.toThrow(ValidationError);
      await expect(new SetIncludeInAutoMarginalFoliationAction(1, false).execute(state)).rejects.toThrow('Witness index 1 is out of bounds');
    });
  });

  describe('Standardization Actions', () => {
    describe('AddStandardizedStringAction', () => {
      it('should add standardized string', async () => {
        const state = makeState(makeBaseMceData());
        const action = new AddStandardizedStringAction('foo', 'bar');

        const result = await action.execute(state);
        expect(result.mceData.standardizedStrings.length).toBe(1);
        expect(result.mceData.standardizedStrings[0]).toEqual({
          original: 'foo',
          standardized: 'bar',
          instances: []
        });
        expect(action.description()).toBe("Add standardized string 'foo'");
      });

      it('should throw if original is empty', async () => {
        const state = makeState(makeBaseMceData());
        const action = new AddStandardizedStringAction('', 'bar');
        await expect(action.execute(state)).rejects.toThrow(ValidationError);
        await expect(action.execute(state)).rejects.toThrow("Invalid original string ''");
      });

      it('should throw if standardized is empty', async () => {
        const state = makeState(makeBaseMceData());
        const action = new AddStandardizedStringAction('foo', '');
        await expect(action.execute(state)).rejects.toThrow(ValidationError);
        await expect(action.execute(state)).rejects.toThrow("Invalid standardized string ''");
      });

      it('should throw if original and standardized are same', async () => {
        const state = makeState(makeBaseMceData());
        const action = new AddStandardizedStringAction('foo', 'foo');
        await expect(action.execute(state)).rejects.toThrow(ValidationError);
        await expect(action.execute(state)).rejects.toThrow("Original and standardized strings cannot be the same");
      });

      it('should throw if original already exists', async () => {
        const mceData = {
          ...makeBaseMceData(),
          standardizedStrings: [{ original: 'foo', standardized: 'bar', instances: [] }]
        };
        const state = makeState(mceData);
        const action = new AddStandardizedStringAction('foo', 'baz');
        await expect(action.execute(state)).rejects.toThrow(ValidationError);
        await expect(action.execute(state)).rejects.toThrow("Standardized string 'foo' already exists");
      });
    });

    describe('DeleteStandardizedStringAction', () => {
      it('should delete standardized string', async () => {
        const mceData = {
          ...makeBaseMceData(),
          standardizedStrings: [
            { original: 'foo', standardized: 'bar', instances: [] },
            { original: 'baz', standardized: 'qux', instances: [] }
          ]
        };
        const state = makeState(mceData);
        const action = new DeleteStandardizedStringAction('foo');

        const result = await action.execute(state);
        expect(result.mceData.standardizedStrings.length).toBe(1);
        expect(result.mceData.standardizedStrings[0].original).toBe('baz');
        expect(action.description()).toBe("Delete standardized string 'foo'");
      });

      it('should throw if original is empty', async () => {
        const state = makeState(makeBaseMceData());
        const action = new DeleteStandardizedStringAction('');
        await expect(action.execute(state)).rejects.toThrow(ValidationError);
        await expect(action.execute(state)).rejects.toThrow("Invalid original string ''");
      });
    });

    describe('ResetStandardizedStringAction', () => {
      it('should reset standardized string instances', async () => {
        const mceData = {
          ...makeBaseMceData(),
          standardizedStrings: [
            {
              original: 'foo',
              standardized: 'bar',
              instances: [{ mainTextIndex: 1, status: 'accepted' as const }]
            }
          ]
        };
        const state = makeState(mceData);
        const action = new ResetStandardizedStringAllAction('foo');

        const result = await action.execute(state);
        expect(result.mceData.standardizedStrings[0].instances.length).toBe(0);
        expect(action.description()).toBe("Reset standardized string 'foo'");
      });

      it('should throw if original is empty', async () => {
        const state = makeState(makeBaseMceData());
        const action = new ResetStandardizedStringAllAction('');
        await expect(action.execute(state)).rejects.toThrow(ValidationError);
        await expect(action.execute(state)).rejects.toThrow("Invalid string ''");
      });
    });
  });
});
