import {beforeEach, describe, expect, it, vi} from 'vitest';
import {MceDataEditionGenerator} from '@/MceData/MceDataEditionGenerator.js';
import {MceDataInterface} from '@/MceData/MceDataInterface.js';
import {Edition} from '@/Edition/Edition.js';
import {MainTextTokenFactory} from '@/Edition/MainTextTokenFactory.js';
import {Apparatus} from '@/Edition/Apparatus.js';
import {ApparatusEntry} from '@/Edition/ApparatusEntry.js';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry.js';
import {WitnessDataItem} from '@/Edition/WitnessDataItem.js';
import {FoliationChangeInfoInterface} from '@/Edition/FoliationChangeInfoInterface.js';
import {fromString, getPlainText} from '@thomas-inst/fmt-text';

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
    schemaVersion: '3',
    includeInAutoMarginalFoliation: [],
    standardizedStrings: [],
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

/**
 * Creates a marginalia apparatus using the provided entries data.
 *
 * @param {Array<Object>} entries - An array of entry data objects.
 * @param {number} entries[].from - The starting position for the entry.
 * @param {number} entries[].witnessIndex - The index of the witness associated with the entry.
 * @param {boolean} entries[].realFoliationChange - Indicates if the entry involves a real foliation change.
 * @param {string} entries[].foliationText - The formatted foliation text (`siglum:foliation`) for the sub-entry.
 * @return {Apparatus} A newly created marginalia apparatus object with the processed entries.
 */
function makeMarginaliaApparatus(entries: Array<{
  from: number,
  witnessIndex: number,
  realFoliationChange: boolean,
  foliationText: string,
}>): Apparatus {
  const apparatus = new Apparatus();
  apparatus.type = 'marginalia';
  apparatus.entries = entries.map((entryData) => {
    const entry = new ApparatusEntry();
    entry.from = entryData.from;
    entry.to = entryData.from;
    entry.mainTextWords = [''];

    const subEntry = new ApparatusSubEntry();
    subEntry.type = 'auto_foliation';
    subEntry.fmtText = fromString(entryData.foliationText);
    const witnessData = new WitnessDataItem().setWitnessIndex(entryData.witnessIndex).setHand(0);
    witnessData.realFoliationChange = entryData.realFoliationChange;
    subEntry.witnessData = [witnessData];
    entry.subEntries = [subEntry];
    return entry;
  });
  return apparatus;
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

    it('converts chunk witness indices before merging foliation changes', () => {
      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn()});
      const previous: FoliationChangeInfoInterface[] = [
        {collationTableColumn: 2, witnessIndex: 5, previousFoliation: '1r', newFoliation: '1v'},
      ];
      const current: FoliationChangeInfoInterface[] = [
        {collationTableColumn: 3, witnessIndex: 0, previousFoliation: '1v', newFoliation: '2r'},
      ];

      const merged = generator.mergeFoliationChanges(previous, current, [5, 3]);

      expect(merged).toEqual([
        {collationTableColumn: 3, witnessIndex: 5, previousFoliation: '1v', newFoliation: '2r'},
      ]);
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

      expect(edition.mainText.map((t) => t.type)).toEqual([
        'chunk_start',
        'text',
        'chunk_end',
        'paragraph_end',
        'chunk_start',
        'text',
        'chunk_end',
      ]);
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

      expect(edition.mainText.map((t) => t.type)).toEqual([
        'chunk_start',
        'text',
        'chunk_end',
        'glue',
        'chunk_start',
        'text',
        'chunk_end',
      ]);
    });

    it('shifts mainText editionWitnessTokenIndex by cumulative output length', async () => {
      const first = makeSingleChunkEdition({tokenIndices: [0, 1]});
      const second = makeSingleChunkEdition({tokenIndices: [0]});
      mockCtDataGeneratorState.generatedEditionsQueue.push(first, second);

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(buildMceData(), 1);

      expect(edition.mainText[1].editionWitnessTokenIndex).toBe(1);
      expect(edition.mainText[2].editionWitnessTokenIndex).toBe(2);
      expect(edition.mainText[6].editionWitnessTokenIndex).toBe(6);
    });

    it('maps apparatus witness indices to global indices and shifts entry from/to', async () => {
      const apparatus = new Apparatus();
      apparatus.type = 'critical';
      const entry = new ApparatusEntry();
      entry.from = 0;
      entry.to = 0;
      entry.mainTextWords = ['t0'];
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
      expect(edition.apparatuses[0].entries[0].from).toBe(6);
      expect(edition.apparatuses[0].entries[0].to).toBe(6);
      expect(edition.apparatuses[0].entries[0].subEntries[0].witnessData[0].witnessIndex).toBe(1);
      expect(edition.apparatuses[0].entries[0].subEntries[0].witnessData[0].hand).toBe(2);
    });

    it('standardizes only accepted Latin instances in main text and apparatus', async () => {
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
          }
        ],
        chunkOrder: [0],
        witnesses: [{title: 'Witness A', witnessId: 'A'}],
        sigla: ['A'],
        lang: 'la',
        standardizedStrings: [{
          original: 'uel',
          standardized: 'vel',
          instances: [
            {mainTextIndex: 1, status: 'accepted'},
            {mainTextIndex: 2, status: 'rejected'},
            {mainTextIndex: 3, status: 'accepted'},
          ]
        }],
      });

      const apparatus = new Apparatus();
      apparatus.type = 'critical';
      const entry = new ApparatusEntry();
      entry.from = 0;
      entry.to = 3;
      entry.mainTextWords = ['uel', 'Uel', 'UEL', 'uEl'];
      const subEntry = new ApparatusSubEntry();
      subEntry.witnessData = [];
      entry.subEntries = [subEntry];
      apparatus.entries = [entry];

      const singleChunkEdition = makeSingleChunkEdition({tokenIndices: []});
      singleChunkEdition.mainText = [
        MainTextTokenFactory.createSimpleText('text', 'uel', 0, 'la'),
        MainTextTokenFactory.createSimpleText('text', 'Uel', 1, 'la'),
        MainTextTokenFactory.createSimpleText('text', 'UEL', 2, 'la'),
        MainTextTokenFactory.createSimpleText('text', 'uEl', 3, 'la'),
      ];
      singleChunkEdition.apparatuses = [apparatus];

      mockCtDataGeneratorState.generatedEditionsQueue.push(singleChunkEdition);

      const generator = new MceDataEditionGenerator({ctDataGetter: vi.fn().mockResolvedValue({})});
      const edition = await generator.generate(mceData, 1);

      const standardizedMainTextWords = edition.mainText
        .filter((token) => token.type === 'text')
        .map((token) => getPlainText(token.fmtText));

      expect(standardizedMainTextWords).toEqual(['vel', 'Uel', 'VEL', 'uEl']);
      expect(edition.apparatuses[0].entries[0].mainTextWords).toEqual(['vel', 'Uel', 'VEL', 'uEl']);
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

    it('keeps auto marginal foliation witness mapping and positions correct across chunk witness permutations', async () => {
      const mceData = buildMceData({
        chunks: [
          {
            chunkId: 'c1',
            break: '',
            chunkEditionTableId: 100,
            lineNumbersRestart: false,
            title: 'Chunk 1',
            version: 'v1',
            witnessIndices: [2, 0, 1, -1],
          },
          {
            chunkId: 'c2',
            break: '',
            chunkEditionTableId: 101,
            lineNumbersRestart: false,
            title: 'Chunk 2',
            version: 'v1',
            witnessIndices: [1, 2, 0, -1],
          },
          {
            chunkId: 'c3',
            break: '',
            chunkEditionTableId: 102,
            lineNumbersRestart: false,
            title: 'Chunk 3',
            version: 'v1',
            witnessIndices: [0, 2, 1, -1],
          }
        ],
        chunkOrder: [0, 1, 2],
        witnesses: [
          {title: 'Witness A', witnessId: 'A'},
          {title: 'Witness B', witnessId: 'B'},
          {title: 'Witness C', witnessId: 'C'},
        ],
        sigla: ['A', 'B', 'C'],
        includeInAutoMarginalFoliation: [0, 1, 2],
      });

      const chunkOne = makeSingleChunkEdition({
        tokenIndices: [0, 1],
        apparatuses: [makeMarginaliaApparatus([
          {from: 0, witnessIndex: 1, realFoliationChange: false, foliationText: 'A:Af1'},
          {from: 0, witnessIndex: 2, realFoliationChange: false, foliationText: 'B:Bf1'},
          {from: 1, witnessIndex: 2, realFoliationChange: true, foliationText: 'B:Bf2'},
          {from: 0, witnessIndex: 0, realFoliationChange: false, foliationText: 'C:Cf1'},
          {from: 1, witnessIndex: 0, realFoliationChange: true, foliationText: 'C:Cf2'},
        ])],
        foliationChanges: [
          {collationTableColumn: 0, witnessIndex: 1, previousFoliation: '', newFoliation: 'Af1'},
          {collationTableColumn: 0, witnessIndex: 2, previousFoliation: '', newFoliation: 'Bf1'},
          {collationTableColumn: 1, witnessIndex: 2, previousFoliation: 'Bf1', newFoliation: 'Bf2'},
          {collationTableColumn: 0, witnessIndex: 0, previousFoliation: '', newFoliation: 'Cf1'},
          {collationTableColumn: 1, witnessIndex: 0, previousFoliation: 'Cf1', newFoliation: 'Cf2'},
        ]
      });

      const chunkTwo = makeSingleChunkEdition({
        tokenIndices: [0, 1],
        apparatuses: [makeMarginaliaApparatus([
          {from: 0, witnessIndex: 0, realFoliationChange: true, foliationText: 'B:Bf3'},
          {from: 1, witnessIndex: 1, realFoliationChange: true, foliationText: 'C:Cf3'},
        ])],
        foliationChanges: [
          {collationTableColumn: 0, witnessIndex: 0, previousFoliation: 'Bf2', newFoliation: 'Bf3'},
          {collationTableColumn: 1, witnessIndex: 1, previousFoliation: 'Cf2', newFoliation: 'Cf3'},
        ]
      });

      const chunkThree = makeSingleChunkEdition({
        tokenIndices: [0, 1],
        apparatuses: [makeMarginaliaApparatus([
          {from: 1, witnessIndex: 2, realFoliationChange: true, foliationText: 'B:Bf4'},
          {from: 0, witnessIndex: 1, realFoliationChange: true, foliationText: 'C:Cf4'},
        ])],
        foliationChanges: [
          {collationTableColumn: 1, witnessIndex: 2, previousFoliation: 'Bf3', newFoliation: 'Bf4'},
          {collationTableColumn: 0, witnessIndex: 1, previousFoliation: 'Cf3', newFoliation: 'Cf4'},
        ]
      });

      mockCtDataGeneratorState.generatedEditionsQueue.push(chunkOne, chunkTwo, chunkThree);
      const ctDataPerChunk = [{}, {}, {}] as any[];
      const ctDataGetter = vi.fn().mockImplementation((_data, chunkIndex) => Promise.resolve(ctDataPerChunk[chunkIndex]));

      const generator = new MceDataEditionGenerator({ctDataGetter});
      const edition = await generator.generate(mceData, 99);

      expect(ctDataGetter).toHaveBeenCalledTimes(3);
      expect(ctDataPerChunk[0].includeInAutoMarginalFoliation).toEqual([1, 2, 0]);
      expect(ctDataPerChunk[1].includeInAutoMarginalFoliation).toEqual([2, 0, 1]);
      expect(ctDataPerChunk[2].includeInAutoMarginalFoliation).toEqual([0, 2, 1]);

      expect(mockCtDataGeneratorState.constructorOptions[2].lastFoliationChanges.map((c: any) => c.witnessIndex)).toEqual([0, 2, 1]);

      expect(edition.apparatuses).toHaveLength(1);
      const marginalia = edition.apparatuses[0];
      expect(marginalia.type).toBe('marginalia');

      const flattenedEntries = marginalia.entries.map((entry) => {
        const witnessData = entry.subEntries[0].witnessData[0];
        return {
          from: entry.from,
          to: entry.to,
          witnessIndex: witnessData.witnessIndex,
          realFoliationChange: witnessData.realFoliationChange,
          type: entry.subEntries[0].type,
          foliationText: getPlainText(entry.subEntries[0].fmtText),
        };
      });

      expect(flattenedEntries.every((entry) => entry.from === entry.to)).toBe(true);
      expect(flattenedEntries.every((entry) => entry.type === 'auto_foliation')).toBe(true);

      const witness0 = flattenedEntries.filter((entry) => entry.witnessIndex === 0);
      const witness1 = flattenedEntries.filter((entry) => entry.witnessIndex === 1);
      const witness2 = flattenedEntries.filter((entry) => entry.witnessIndex === 2);

      expect(witness0).toEqual([
        {from: 1, to: 1, witnessIndex: 0, realFoliationChange: false, type: 'auto_foliation', foliationText: 'A:Af1'},
      ]);
      expect(witness1).toEqual([
        {from: 1, to: 1, witnessIndex: 1, realFoliationChange: false, type: 'auto_foliation', foliationText: 'B:Bf1'},
        {from: 2, to: 2, witnessIndex: 1, realFoliationChange: true, type: 'auto_foliation', foliationText: 'B:Bf2'},
        {from: 6, to: 6, witnessIndex: 1, realFoliationChange: true, type: 'auto_foliation', foliationText: 'B:Bf3'},
        {from: 12, to: 12, witnessIndex: 1, realFoliationChange: true, type: 'auto_foliation', foliationText: 'B:Bf4'},
      ]);
      expect(witness2).toEqual([
        {from: 1, to: 1, witnessIndex: 2, realFoliationChange: false, type: 'auto_foliation', foliationText: 'C:Cf1'},
        {from: 2, to: 2, witnessIndex: 2, realFoliationChange: true, type: 'auto_foliation', foliationText: 'C:Cf2'},
        {from: 7, to: 7, witnessIndex: 2, realFoliationChange: true, type: 'auto_foliation', foliationText: 'C:Cf3'},
        {from: 11, to: 11, witnessIndex: 2, realFoliationChange: true, type: 'auto_foliation', foliationText: 'C:Cf4'},
      ]);
    });
  });
});
