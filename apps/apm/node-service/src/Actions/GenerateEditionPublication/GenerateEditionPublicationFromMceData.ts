import { Action } from "#src/Actions/Action.js"
import {MceDataInterface} from "#www-js/MceData/MceDataInterface.js";
import {CtDataInterface} from "#www-js/CtData/CtDataInterface.js";
import {LoggerInterface} from "#www-js/lib/Logger/LoggerInterface.js";
import {EditionInterface} from "#www-js/Edition/EditionInterface.js";
import {MceDataEditionGenerator} from "#www-js/MceData/MceDataEditionGenerator.js";
import {EditionPublicationData} from "#shared-ts/ApmPublicationApi/ApmPublicationApi.js";
import {toCompactFmtText} from "@thomas-inst/fmt-text";
import {CtData} from "#www-js/CtData/CtData.js";
import {hrtime} from "node:process";
import {getDurationInMs} from "#src/util/getDurationInMs.js";


interface GenerateEditionInput {
  mceData: MceDataInterface;
  editionId: number;
  publicationId: number;
  versionString: string;
  chunksCtData: CtDataInterface[];
}
interface GenerateEditionOutput {
  edition: EditionPublicationData;
  error: boolean;
  errorMessage?: string;
}

interface GenerateEditionOptions {
  logger: LoggerInterface;
}

export class GenerateEditionPublicationFromMceData implements Action<GenerateEditionInput, GenerateEditionOutput>
{
  private readonly logger: LoggerInterface;
  constructor(options: GenerateEditionOptions) {
    this.logger = options.logger;
  }

  async execute(input: GenerateEditionInput): Promise<GenerateEditionOutput> {
    const mceData = input.mceData;
    const numChunks = input.mceData.chunks.length;
    const logPrefix = `PUB-${input.publicationId}:`;

    const start = hrtime.bigint();

    this.logger.info(`${logPrefix} Generating edition publication from MCE data: '${mceData.title}', edition Id ${input.editionId}, lang ${mceData.lang}, ${numChunks} chunks`);
    if (numChunks === 0) {
      return {
        edition: this.createEmptyEditionPublicationData(),
        error: true,
        errorMessage: 'No chunks found'
      };
    }

    if (input.chunksCtData.length !== numChunks) {
      return {
        edition: this.createEmptyEditionPublicationData(),
        error: true,
        errorMessage: 'Mismatch between MCE and CT data chunk counts'
      };
    }

    const cleanChunksCtData = input.chunksCtData.map( (ctData, index) => {
      this.logger.debug(`${logPrefix} Cleaning ct data for chunk ${index}: table ${ctData.tableId}, chunk ${ctData.chunkId}`);
      return CtData.getCleanAndUpdatedCtData(ctData);
    })

    const generator  = new MceDataEditionGenerator({
      ctDataGetter: (_mceData, chunkIndex) => Promise.resolve(cleanChunksCtData[chunkIndex]),
      logger: this.logger
    });

    try {
      this.logger.debug(`${logPrefix} Generating MCE Edition ${input.editionId} with ${cleanChunksCtData.length} chunks`);
      const editionInterface = await generator.generate(mceData, input.editionId);
      this.logger.debug(`Edition ${input.editionId} generated successfully, converting to publication`);
      const publicationData = this.convertEditionToEditionPublicationData(editionInterface, input.publicationId, input.versionString);
      const duration = getDurationInMs(process.hrtime.bigint(), start);
      this.logger.info(`${logPrefix} Publication ${input.publicationId} data created successfully in ${duration} ms`);
      return {
        edition: publicationData,
        error: false,
      };
    } catch (error) {
      return {
        edition: this.createEmptyEditionPublicationData(),
        error: true,
        errorMessage: String(error)
      }
    }
  }

  private convertEditionToEditionPublicationData(edition: EditionInterface, publicationId: number, versionString: string): EditionPublicationData {
    return {
      type: 'edition',
      id: publicationId,
      versionTimeString: versionString,
      title: edition.metadata.title || 'Untitled Edition',
      description: edition.metadata.description || '',
      languageCode: edition.lang,
      mainText: edition.mainText.map(token => ({
        type: token.type,
        text: toCompactFmtText(token.fmtText),
        style: token.style,
        lang: token.lang,
      })),
      apparatuses: edition.apparatuses.map(app => {
        const validApparatusTypes = ['criticus', 'fontium', 'comparativus', 'marginalia'];
        if (!validApparatusTypes.includes(app.type)) {
          this.logger.warn(`Apparatus type mismatch: '${app.type}' is not one of the expected literal types: ${validApparatusTypes.join(', ')}`);
        }
        return {
          type: app.type as any, // Cast to any because of potential mismatch between string and literal types
          entries: app.entries.map(entry => ({
            from: entry.from,
            to: entry.to,
            preLemma: entry.lemma,
            postLemma: entry.postLemma,
            lemmaText: entry.lemmaText,
            separator: entry.separator,
            subEntries: entry.subEntries.filter(s => s.enabled).map(subEntry => ({
              type: subEntry.type as any,
              text: toCompactFmtText(subEntry.fmtText),
              source: subEntry.source,
              witnessData: subEntry.witnessData.map(w => ({
                witnessIndex: w.witnessIndex,
                hand: w.hand,
                location: w.location,
                siglum: w.siglum,
                omitSiglum: w.omitSiglum,
                forceHandDisplay: w.forceHandDisplay
              })),
              keyword: subEntry.keyword,
              position: subEntry.position
            }))
          }))
        };
      }),
      witnesses: edition.witnesses.map(w => ({
        title: w.title,
        siglum: w.siglum,
        publicationId: -1 // APM's PHP backend will fill this correctly
      })),
      siglaGroups: edition.siglaGroups.map(sg => ({
        siglum: sg.siglum,
        witnessIndices: sg.witnesses
      }))
    };
  }

  private createEmptyEditionPublicationData(): EditionPublicationData {
   return {
     type: 'edition',
     id: -1,
     versionTimeString: '',
     title: 'Empty Edition',
     description: 'Empty Edition',
     languageCode: '',
     mainText: [],
     apparatuses: [],
     siglaGroups: [],
     witnesses: []
   }
  }
}