import {beforeEach, describe, expect, it, vi} from 'vitest';
import {MceDataEditionGenerator} from '@/MceData/MceDataEditionGenerator.js';
import {MceDataInterface} from '@/MceData/MceDataInterface.js';
import {Edition} from '@/Edition/Edition.js';
import {MainTextTokenFactory} from '@/Edition/MainTextTokenFactory.js';
import {Apparatus} from '@/Edition/Apparatus.js';
import {ApparatusEntry} from '@/Edition/ApparatusEntry.js';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry.js';
import {WitnessDataItem} from '@/Edition/WitnessDataItem.js';
import {MceData} from '@/MceData/MceData.js';
import {FoliationChangeInfoInterface} from '@/Edition/FoliationChangeInfoInterface.js';

const mockCtDataGeneratorState = vi.hoisted(() => {
  return {
    constructorOptions: [] as any[],
    generatedEditionsQueue: [] as any[],
    throwOnGenerate: false,
  };
});

vi.mock('@/Edition/EditionGenerator/CtDataEditionGenerator.js', () => {
  class MockCtDataEditionGenerator {
    constructor(options: any) {
      mockCtDataGeneratorState.constructorOptions.push(options);
    }

    generateEdition() {
      if (mockCtDataGeneratorState.throwOnGenerate) {
        throw new Error('mocked-generation-error');
      }
      const nextEdition = mockCtDataGeneratorState.generatedEditionsQueue.shift();
      if (nextEdition === undefined) {
        throw new Error('No queued mocked edition');
      }
      return nextEdition;
    }
  }

  return {CtDataEditionGenerator: MockCtDataEditionGenerator};
});

function buildMceData(overrides: Partial<MceDataInterface> = {}): MceDataInterface {
  return {
    chunks: [
      {
        chunkId: 'c1',
        break: '',
        chunkEditionTableId: 100,
        lineNumbersRestart: false,
        title: 'Chunk 1',
        version: 'v1',
        witnessIndices: [0, 1],
      },
      {
        chunkId: 'c2',
        break: '',
        chunkEditionTableId: 101,
        lineNumbersRestart: false,
        title: 'Chunk 2',
        version: 'v1',
        witnessIndices: [0, 1],
      }
    ],
    chunkOrder: [0, 1],
    title: 'Edition title',
    initialSpace: '',
    preamble: [],
    witnesses: [
      {title: 'Witness A', witnessId: 'A'},
      {title: 'Witness B', witnessId: 'B'},
    ],
    sigla: ['A', 'B'],
    siglaGroups: [],
    lang: 'la',
    stylesheetId: 'default',
    archived: false,
    schemaVersion: '1.0',
    includeInAutoMarginalFoliation: [],
    ...overrides,
  };
}

function makeSingleChunkEdition(options: {
  lang?: string,
  tokenIndices?: number[],
  apparatuses?: Apparatus[],
  foliationChanges?: FoliationChangeInfoInterface[]
} = {}): Edition {
  const edition = new Edition();
  edition.lang = options.lang ?? 'la';
  edition.foliationChanges = options.foliationChanges ?? [];
  edition.mainText = (options.tokenIndices ?? [0]).map((index) => {
    return MainTextTokenFactory.createSimpleText('text', `t${index}`, index, edition.lang);
  });
  edition.apparatuses = options.apparatuses ?? [];
  return edition;
}

describe('MceDataEditionGenerator', () => {
  beforeEach(() => {
    mockCtDataGeneratorState.constructorOptions = [];
    mockCtDataGeneratorState.generatedEditionsQueue = [];
    mockCtDataGeneratorState.throwOnGenerate = false;
    vi.restoreAllMocks();
  });

  describe('getSingleChunkIncludeInAutoFoliationArray', () => {
    it('maps global witness indices to chunk-local witness indices', () => {
      const mceData = buildMceData({
        includeInAutoMarginalFoliation: [3, 5],
        chunks: [{
          chunkId: 'c1',
          break: '',
          chunkEditionTableId: 100,
          lineNumbersRestart: false,
          title: 'Chunk 1',
          version: 'v1',
          witnessIndices: [1, 3, 5],
        }],
        chunkOrder: [0],
      });

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn()});

      expect(generator.getSingleChunkIncludeInAutoFoliationArray(mceData, 0)).toEqual([1, 2]);
    });

    it('returns empty array when includeInAutoMarginalFoliation is undefined', () => {
      const mceData = buildMceData({includeInAutoMarginalFoliation: undefined});
      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn()});

      expect(generator.getSingleChunkIncludeInAutoFoliationArray(mceData, 0)).toEqual([]);
    });
  });

  describe('mergeFoliationChanges', () => {
    it('carries over the latest previous change for witnesses missing in current changes', () => {
      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn()});
      const previous: FoliationChangeInfoInterface[] = [
        {collationTableColumn: 1, witnessIndex: 0, previousFoliation: '', newFoliation: '1r'},
        {collationTableColumn: 2, witnessIndex: 0, previousFoliation: '1r', newFoliation: '1v'},
        {collationTableColumn: 3, witnessIndex: 1, previousFoliation: '', newFoliation: '2r'},
      ];

      const current: FoliationChangeInfoInterface[] = [
        {collationTableColumn: 4, witnessIndex: 1, previousFoliation: '2r', newFoliation: '2v'},
      ];

      const merged = generator.mergeFoliationChanges(previous, current);

      expect(merged).toEqual([
        {collationTableColumn: 2, witnessIndex: 0, previousFoliation: '1r', newFoliation: '1v'},
        {collationTableColumn: 4, witnessIndex: 1, previousFoliation: '2r', newFoliation: '2v'},
      ]);
    });

    it('returns current changes when previous is empty', () => {
      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn()});
      const current: FoliationChangeInfoInterface[] = [
        {collationTableColumn: 4, witnessIndex: 1, previousFoliation: '2r', newFoliation: '2v'},
      ];

      expect(generator.mergeFoliationChanges([], current)).toEqual(current);
    });
  });

  describe('regenerateSingleChunkEdition', () => {
    it('throws when chunk does not exist', async () => {
      const mceData = buildMceData({chunks: [], chunkOrder: []});
      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn()});

      await expect(generator.regenerateSingleChunkEdition(mceData, 5, [])).rejects.toThrow(
        'Attempt to regenerate non-existent chunk 5'
      );
    });

    it('injects mapped includeInAutoMarginalFoliation and passes lastFoliationChanges', async () => {
      const ctData = {} as any;
      const ctDataGetter = vi.fn().mockResolvedValue(ctData);
      const mceData = buildMceData({
        includeInAutoMarginalFoliation: [1, 9],
        chunks: [{
          chunkId: 'c1',
          break: '',
          chunkEditionTableId: 200,
          lineNumbersRestart: false,
          title: 'Chunk 1',
          version: 'v1',
          witnessIndices: [0, 1],
        }],
        chunkOrder: [0],
      });

      const expectedEdition = makeSingleChunkEdition({tokenIndices: [0]});
      mockCtDataGeneratorState.generatedEditionsQueue.push(expectedEdition);

      const generator = new MceDataEditionGenerator({ctDataGetter});
      const previousFoliation: FoliationChangeInfoInterface[] = [
        {collationTableColumn: 7, witnessIndex: 0, previousFoliation: '1r', newFoliation: '1v'}
      ];

      const result = await generator.regenerateSingleChunkEdition(mceData, 0, previousFoliation);

      expect(result).toBe(expectedEdition);
      expect(ctDataGetter).toHaveBeenCalledWith(mceData, 0);
      expect(ctData.includeInAutoMarginalFoliation).toEqual([1]);
      expect(mockCtDataGeneratorState.constructorOptions[0].lastFoliationChanges).toEqual(previousFoliation);
      expect(mockCtDataGeneratorState.constructorOptions[0].ctData).toBe(ctData);
    });

    it('wraps generation errors with contextual message', async () => {
      const mceData = buildMceData({
        chunks: [{
          chunkId: 'chunk-alpha',
          break: '',
          chunkEditionTableId: 333,
          lineNumbersRestart: false,
          title: 'Chunk alpha',
          version: 'v1',
          witnessIndices: [0],
        }],
        chunkOrder: [0],
      });
      const ctDataGetter = vi.fn().mockResolvedValue({});
      mockCtDataGeneratorState.throwOnGenerate = true;

      const generator = new MceDataEditionGenerator({ctDataGetter});

      await expect(generator.regenerateSingleChunkEdition(mceData, 0, [])).rejects.toThrow(
        'Error generating edition for table id 333, chunk chunk-alpha'
      );
    });
  });

  describe('generate', () => {
    it('builds multi-chunk edition metadata and propagates witnesses/sigla', async () => {
      const mceData = buildMceData();
      mockCtDataGeneratorState.generatedEditionsQueue.push(
        makeSingleChunkEdition({lang: 'ar', tokenIndices: [0]}),
        makeSingleChunkEdition({lang: 'la', tokenIndices: [0]}),
      );

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(mceData, 987);

      expect(edition.info.singleChunk).toBe(false);
      expect(edition.info.source).toBe('multiChunk');
      expect(edition.info.editionId).toBe(987);
      expect(edition.metadata.infoText).toBe('Multi chunk edition');
      expect(edition.lang).toBe('ar');
      expect(edition.witnesses.map((w) => w.siglum)).toEqual(['A', 'B']);
      expect(edition.witnesses.map((w) => w.title)).toEqual(['Witness A', 'Witness B']);
    });

    it('uses cached chunk edition and only saves cache on misses', async () => {
      const cachedEdition = makeSingleChunkEdition({tokenIndices: [0, 1]});
      const generatedEdition = makeSingleChunkEdition({tokenIndices: [0]});
      mockCtDataGeneratorState.generatedEditionsQueue.push(generatedEdition);

      const getter = vi.fn()
      .mockResolvedValueOnce(cachedEdition)
      .mockResolvedValueOnce(null);
      const saver = vi.fn().mockResolvedValue(undefined);

      const generator = new MceDataEditionGenerator({
        ctDataGetter: vi.fn().mockResolvedValue({}),
        singleChunkEditionGetter: getter,
        singleChunkEditionSaver: saver,
      });

      const mceData = buildMceData();
      await generator.generate(mceData, 10);

      expect(getter).toHaveBeenCalledTimes(2);
      expect(saver).toHaveBeenCalledTimes(1);
      expect(saver).toHaveBeenCalledWith(mceData, 1, generatedEdition);
    });

    it('adds paragraph-end token between non-final chunks with paragraph break', async () => {
      const mceData = buildMceData({
        chunks: [
          {
            chunkId: 'c1',
            break: 'paragraph',
            chunkEditionTableId: 100,
            lineNumbersRestart: false,
            title: 'Chunk 1',
            version: 'v1',
            witnessIndices: [0],
          },
          {
            chunkId: 'c2',
            break: '',
            chunkEditionTableId: 101,
            lineNumbersRestart: false,
            title: 'Chunk 2',
            version: 'v1',
            witnessIndices: [0],
          }
        ],
        chunkOrder: [0, 1],
        witnesses: [{title: 'Witness A', witnessId: 'A'}],
        sigla: ['A'],
      });

      mockCtDataGeneratorState.generatedEditionsQueue.push(
        makeSingleChunkEdition({tokenIndices: [0]}),
        makeSingleChunkEdition({tokenIndices: [0]}),
      );

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(mceData, 1);

      expect(edition.mainText.map((t) => t.type)).toEqual(['text', 'paragraph_end', 'text']);
    });

    it('adds glue token between non-final chunks with empty break', async () => {
      const mceData = buildMceData({
        chunks: [
          {
            chunkId: 'c1',
            break: '',
            chunkEditionTableId: 100,
            lineNumbersRestart: false,
            title: 'Chunk 1',
            version: 'v1',
            witnessIndices: [0],
          },
          {
            chunkId: 'c2',
            break: '',
            chunkEditionTableId: 101,
            lineNumbersRestart: false,
            title: 'Chunk 2',
            version: 'v1',
            witnessIndices: [0],
          }
        ],
        chunkOrder: [0, 1],
        witnesses: [{title: 'Witness A', witnessId: 'A'}],
        sigla: ['A'],
      });

      mockCtDataGeneratorState.generatedEditionsQueue.push(
        makeSingleChunkEdition({tokenIndices: [0]}),
        makeSingleChunkEdition({tokenIndices: [0]}),
      );

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(mceData, 1);

      expect(edition.mainText.map((t) => t.type)).toEqual(['text', 'glue', 'text']);
    });

    it('shifts mainText editionWitnessTokenIndex by cumulative output length', async () => {
      const first = makeSingleChunkEdition({tokenIndices: [0, 1]});
      const second = makeSingleChunkEdition({tokenIndices: [0]});
      mockCtDataGeneratorState.generatedEditionsQueue.push(first, second);

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(buildMceData(), 1);

      expect(edition.mainText[0].editionWitnessTokenIndex).toBe(0);
      expect(edition.mainText[1].editionWitnessTokenIndex).toBe(1);
      expect(edition.mainText[3].editionWitnessTokenIndex).toBe(3);
    });

    it('maps apparatus witness indices to global indices and shifts entry from/to', async () => {
      const apparatus = new Apparatus();
      apparatus.type = 'critical';
      const entry = new ApparatusEntry();
      entry.from = 0;
      entry.to = 0;
      const subEntry = new ApparatusSubEntry();
      subEntry.witnessData = [new WitnessDataItem().setWitnessIndex(0).setHand(2)];
      entry.subEntries = [subEntry];
      apparatus.entries = [entry];

      const first = makeSingleChunkEdition({tokenIndices: [0, 1]});
      const second = makeSingleChunkEdition({
        tokenIndices: [0],
        apparatuses: [apparatus],
      });

      const mceData = buildMceData({
        chunks: [
          {
            chunkId: 'c1',
            break: '',
            chunkEditionTableId: 100,
            lineNumbersRestart: false,
            title: 'Chunk 1',
            version: 'v1',
            witnessIndices: [0, 1],
          },
          {
            chunkId: 'c2',
            break: '',
            chunkEditionTableId: 101,
            lineNumbersRestart: false,
            title: 'Chunk 2',
            version: 'v1',
            witnessIndices: [1, 0],
          }
        ],
        chunkOrder: [0, 1],
      });

      mockCtDataGeneratorState.generatedEditionsQueue.push(first, second);

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(mceData, 1);

      expect(edition.apparatuses).toHaveLength(1);
      expect(edition.apparatuses[0].entries).toHaveLength(1);
      expect(edition.apparatuses[0].entries[0].from).toBe(3);
      expect(edition.apparatuses[0].entries[0].to).toBe(3);
      expect(edition.apparatuses[0].entries[0].subEntries[0].witnessData[0].witnessIndex).toBe(1);
      expect(edition.apparatuses[0].entries[0].subEntries[0].witnessData[0].hand).toBe(2);
    });

    it('filters out apparatus entries with empty subEntries', async () => {
      const apparatus = new Apparatus();
      apparatus.type = 'critical';
      const emptyEntry = new ApparatusEntry();
      emptyEntry.from = 0;
      emptyEntry.to = 0;
      emptyEntry.subEntries = [];
      apparatus.entries = [emptyEntry];

      mockCtDataGeneratorState.generatedEditionsQueue.push(
        makeSingleChunkEdition({tokenIndices: [0]}),
        makeSingleChunkEdition({tokenIndices: [0], apparatuses: [apparatus]}),
      );

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(buildMceData(), 1);

      expect(edition.apparatuses[0].entries).toEqual([]);
    });

    it('uses MceData.getDefaultChunkOrder when chunkOrder is undefined', async () => {
      const mceData = buildMceData({chunkOrder: undefined});
      const chunkOrderSpy = vi.spyOn(MceData, 'getDefaultChunkOrder').mockReturnValue([1, 0]);

      mockCtDataGeneratorState.generatedEditionsQueue.push(
        makeSingleChunkEdition({tokenIndices: [10]}),
        makeSingleChunkEdition({tokenIndices: [20]}),
      );

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(mceData, 1);

      expect(chunkOrderSpy).toHaveBeenCalledWith(mceData);
      expect(mceData.chunkOrder).toEqual([1, 0]);
      // @ts-ignore
      expect(edition.mainText[0].getPlainText()).toBe('t10');
    });

    it('merges foliation changes between chunk iterations', async () => {
      const regenSpy = vi.spyOn(MceDataEditionGenerator.prototype, 'regenerateSingleChunkEdition');
      const first = makeSingleChunkEdition({
        tokenIndices: [0],
        foliationChanges: [
          {collationTableColumn: 1, witnessIndex: 0, previousFoliation: '', newFoliation: '1r'}
        ]
      });
      const second = makeSingleChunkEdition({
        tokenIndices: [0],
        foliationChanges: [
          {collationTableColumn: 2, witnessIndex: 1, previousFoliation: '', newFoliation: '2r'}
        ]
      });
      mockCtDataGeneratorState.generatedEditionsQueue.push(first, second);

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      await generator.generate(buildMceData(), 1);

      expect(regenSpy).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        0,
        []
      );
      expect(regenSpy).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        1,
        [{collationTableColumn: 1, witnessIndex: 0, previousFoliation: '', newFoliation: '1r'}]
      );
    });
  });
});
