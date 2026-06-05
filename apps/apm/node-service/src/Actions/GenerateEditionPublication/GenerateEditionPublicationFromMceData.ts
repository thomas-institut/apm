import { Action } from "#src/Actions/Action.js"
// @ts-ignore
import {MceDataInterface} from "#www-js/MceData/MceDataInterface.js";
import {CtDataInterface} from "#www-js/CtData/CtDataInterface.js";
import {LoggerInterface} from "#www-js/lib/Logger/LoggerInterface.js";
import {EditionInterface} from "#www-js/Edition/EditionInterface.js";
import {Edition} from "#www-js/Edition/Edition.js";
import {MceDataEditionGenerator} from "#www-js/MceData/MceDataEditionGenerator.js";


interface GenerateEditionInput {
  mceData: MceDataInterface;
  editionId: number;
  chunksCtData: CtDataInterface[];
}
interface GenerateEditionOutput {
  edition: EditionInterface;
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

    this.logger.debug(`Generating edition from MCE data: '${mceData.title}', lang ${mceData.lang}, ${numChunks} chunks`);
    if (numChunks === 0) {
      return {
        edition: new Edition(),
        error: true,
        errorMessage: 'No chunks found'
      };
    }

    if (input.chunksCtData.length !== numChunks) {
      return {
        edition: new Edition(),
        error: true,
        errorMessage: 'Mismatch between MCE and CT data chunk counts'
      };
    }

    const generator  = new MceDataEditionGenerator({
      ctDataGetter: (_mceData, chunkIndex) => Promise.resolve(input.chunksCtData[chunkIndex]),
      logger: this.logger
    });

    try {
      return {
        edition: await generator.generate(mceData, input.editionId),
        error: true,
        errorMessage: 'Not implemented yet'
      };
    } catch (error) {
      return {
        edition: new Edition(),
        error: true,
        errorMessage: String(error)
      }
    }
  }
}