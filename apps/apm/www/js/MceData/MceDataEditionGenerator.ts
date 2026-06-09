// noinspection ES6PreferShortImport

import {MceDataInterface} from "./MceDataInterface.js";
import {CtDataInterface} from "../CtData/CtDataInterface.js";
import {LoggerInterface} from "../lib/Logger/LoggerInterface.js";
import {NullLogger} from "../lib/Logger/NullLogger.js";
import {EditionInterface} from "../Edition/EditionInterface.js";
import {Edition} from "../Edition/Edition.js";
import {SiglaGroup} from "../Edition/SiglaGroup.js";
import {EditionWitnessInfo} from "../Edition/EditionWitnessInfo.js";
import {FoliationChangeInfoInterface} from "../Edition/FoliationChangeInfoInterface.js";
import {MceData} from "../MceData/MceData.js";
import {MainTextTokenFactory} from "../Edition/MainTextTokenFactory.js";
import {ApparatusTools} from "../Edition/ApparatusTools.js";
import {Apparatus} from "../Edition/Apparatus.js";
import {ApparatusEntry} from "../Edition/ApparatusEntry.js";
import {ApparatusSubEntry} from "../Edition/ApparatusSubEntry.js";
import {WitnessDataItem} from "../Edition/WitnessDataItem.js";
import {CtDataEditionGenerator} from "../Edition/EditionGenerator/CtDataEditionGenerator.js";
import {uniq} from "../lib/ToolBox/ArrayUtil.js";

export type CtDataGetter = (mceData: MceDataInterface, chunkIndex: number) => Promise<CtDataInterface>;
export type SingleChunkEditionSaver = (mceData: MceDataInterface, chunkIndex: number, edition: EditionInterface) => Promise<void>;
export type SingleChunkEditionGetter = (mceData: MceDataInterface, chunkIndex: number) => Promise<EditionInterface|null>;

export interface MceDataEditionGeneratorOptions {
  /**
   * A function that returns a promise that resolves to the CtDataInterface for a given chunk index.
   */
  ctDataGetter: CtDataGetter,
  /**
   * A function that saves the edition for a single chunk for any potential future use.
   */
  singleChunkEditionSaver?: SingleChunkEditionSaver,
  /**
   * A function that returns a previously saved edition for a single chunk.
   * If the edition is not available, it returns null.
   */
  singleChunkEditionGetter?: SingleChunkEditionGetter,
  /**
   * Logger for logging information and errors during edition generation.
   */
  logger?: LoggerInterface
}

export class MceDataEditionGenerator {
  private ctDataGetter: CtDataGetter;
  private logger: LoggerInterface;
  private singleChunkEditionSaver: SingleChunkEditionSaver;
  private singleChunkEditionGetter: SingleChunkEditionGetter;

  constructor(options: MceDataEditionGeneratorOptions) {
   this.ctDataGetter = options.ctDataGetter;
   this.logger = options.logger ?? new NullLogger();
   this.singleChunkEditionSaver = options.singleChunkEditionSaver ?? 
     (async (_mceData: MceDataInterface, _chunkIndex: number, _edition: EditionInterface) => {});
   this.singleChunkEditionGetter = options.singleChunkEditionGetter ?? 
     (async (_mceData: MceDataInterface, _chunkIndex: number) => null);
  }

  async generate(mceData: MceDataInterface, editionId: number) : Promise<EditionInterface> {
    const numChunks = mceData.chunks.length;
    this.logger.debug(`Generating edition from ${numChunks} chunks`);
    const edition = new Edition();
    edition.info = {
      tableId: -1, singleChunk: false, source: 'multiChunk', editionId: editionId, chunkId: '', baseWitnessIndex: 0
    };
    edition.metadata.infoText = `Multi chunk edition`;

    edition.siglaGroups = mceData.siglaGroups.map( sgi => SiglaGroup.fromObject(sgi));
    edition.witnesses = mceData.witnesses.map((w, i) => {
      return (new EditionWitnessInfo()).setSiglum(mceData.sigla[i]).setTitle(w.title);
    });
    // merge main text
    let currentMainTextIndexShift = 0;
    let nextChunkShift = 0;
    let currentFoliationChanges: FoliationChangeInfoInterface[] = [];
    if (mceData.chunkOrder === undefined) {
      // console.warn(`No chunk order in MceData`);
      mceData.chunkOrder = MceData.getDefaultChunkOrder(mceData);
    }
    for (let chunkOrderIndex = 0; chunkOrderIndex < mceData.chunkOrder.length; chunkOrderIndex++) {
      let chunkIndex = mceData.chunkOrder[chunkOrderIndex];
      const cachedEdition = await this.singleChunkEditionGetter(mceData, chunkIndex);
      const singleChunkEdition = cachedEdition !== null ? cachedEdition :
        await this.regenerateSingleChunkEdition(mceData, chunkIndex, currentFoliationChanges);

      if (cachedEdition === null) {
        await this.singleChunkEditionSaver(mceData, chunkIndex, singleChunkEdition);
      }


      currentFoliationChanges = this.mergeFoliationChanges(currentFoliationChanges, singleChunkEdition.foliationChanges ?? []);

      if (chunkOrderIndex === 0) {
        edition.lang = singleChunkEdition.lang;
      }

      currentMainTextIndexShift = nextChunkShift;

      // Add main text
      edition.mainText.push(...singleChunkEdition.mainText.map((mainTextToken) => {
        let newToken = MainTextTokenFactory.clone(mainTextToken);
        newToken.editionWitnessTokenIndex = mainTextToken.editionWitnessTokenIndex + currentMainTextIndexShift;
        return newToken;
      }));

      nextChunkShift += singleChunkEdition.mainText.length;
      switch (mceData.chunks[chunkIndex].break) {
        case 'paragraph':
          if (chunkOrderIndex !== mceData.chunkOrder.length - 1) {
            // add a paragraph mark if not the last chunk
            edition.mainText.push(MainTextTokenFactory.createParagraphEnd());
            nextChunkShift++;
          }
          break;

        case '':
          if (chunkOrderIndex !== mceData.chunkOrder.length - 1) {
            // add a paragraph mark if not the last chunk
            edition.mainText.push(MainTextTokenFactory.createNormalGlue());
            nextChunkShift++;
          }
          break;

        case 'page':
          // TODO: implement page break
          break;

        case 'section':
          // TODO: implement section break
          break;

        default:
        // nothing to do!
      }

      // process apparatuses
      for (let appIndex = 0; appIndex < singleChunkEdition.apparatuses.length; appIndex++) {
        let singleChunkApparatus = singleChunkEdition.apparatuses[appIndex];
        let currentApparatus;
        if (edition.apparatuses[appIndex] === undefined) {
          // console.log(`At chunk index ${chunkIndex}, apparatus ${appIndex} is empty, creating empty apparatus`);
          currentApparatus = ApparatusTools.createEmpty();
          currentApparatus.type = singleChunkApparatus.type;
          edition.apparatuses.push((new Apparatus()).setFromInterface(currentApparatus));
        }
        currentApparatus = edition.apparatuses[appIndex];

        let apparatusEntriesToAdd = singleChunkApparatus.entries.map((entry) => {
          let newEntry = new ApparatusEntry();
          newEntry.from = entry.from + currentMainTextIndexShift;
          newEntry.to = entry.to + currentMainTextIndexShift;
          newEntry.lemma = entry.lemma;
          newEntry.lemmaText = entry.lemmaText;
          newEntry.postLemma = entry.postLemma;
          newEntry.preLemma = entry.preLemma;
          newEntry.separator = entry.separator;
          newEntry.subEntries = entry.subEntries.map((subEntry) => {
            let newSubEntry = new ApparatusSubEntry();
            newSubEntry.enabled = subEntry.enabled;
            newSubEntry.fmtText = subEntry.fmtText;
            newSubEntry.source = subEntry.source;
            newSubEntry.type = subEntry.type;
            newSubEntry.keyword = subEntry.keyword;
            newSubEntry.witnessData = subEntry.witnessData.map( (wd) => {
              let newWd = new WitnessDataItem()
              newWd.setHand(wd.hand)
              newWd.setWitnessIndex(mceData.chunks[chunkIndex].witnessIndices[wd.witnessIndex])
              return newWd
            });
            return newSubEntry;
          });
          return newEntry;
        });

        // filter out empty entries
        apparatusEntriesToAdd = apparatusEntriesToAdd.filter((entry) => {
          return entry.subEntries.length > 0;
        });

        currentApparatus.entries.push(...apparatusEntriesToAdd);
      }
    }
    return edition;
    
  }

  async regenerateSingleChunkEdition(mceData: MceDataInterface, chunkIndex: number, currentFoliationChanges: FoliationChangeInfoInterface[]) : Promise<EditionInterface> {
    const chunk = mceData.chunks[chunkIndex];
    if (chunk === undefined) {
      this.logger.warn(`Attempt to regenerate non-existent chunk ${chunkIndex}`);
      throw new Error(`Attempt to regenerate non-existent chunk ${chunkIndex}`);
    }
    this.logger.debug(`Regenerating single chunk edition for chunk ${chunkIndex} ('${chunk.chunkId}' @ ${chunk.version})`);
    let singleChunkCtData = await this.ctDataGetter(mceData, chunkIndex);

    singleChunkCtData.includeInAutoMarginalFoliation = this.getSingleChunkIncludeInAutoFoliationArray(mceData, chunkIndex);
    let eg = new CtDataEditionGenerator({
      ctData: singleChunkCtData, lastFoliationChanges: currentFoliationChanges
    });
    try {
      return eg.generateEdition();
    } catch (e) {
      const errorMsg = `Error generating edition for table id ${chunk.chunkEditionTableId}, chunk ${chunk.chunkId}`;
      this.logger.error(errorMsg);
      this.logger.error(String(e));
      throw new Error(errorMsg);
    }
  }

  /**
   * Returns the CtData's includeInAutoFoliation array that is needed to include the witnesses
   * given in the MceData
   * @return {number[]}
   * @param {MceDataInterface}mceData
   * @param {number}chunkIndex
   */
  getSingleChunkIncludeInAutoFoliationArray(mceData: MceDataInterface, chunkIndex: number): number[] {
    // basically, translate the indices in MceData's includeInAutoMarginalFoliation into
    // indices relative to the chunk's witnesses
    const chunkWitnessIndices = mceData.chunks[chunkIndex].witnessIndices;
    if (mceData.includeInAutoMarginalFoliation === undefined) {
      mceData.includeInAutoMarginalFoliation = [];
    }
    return mceData.includeInAutoMarginalFoliation.map((mceWitnessIndex) => {
      return chunkWitnessIndices.indexOf(mceWitnessIndex);
    }).filter((index) => {
      return index !== -1;
    });
  }

  /**
   * Merges previous with current foliation changes making sure that the last foliation changes of
   * a witness is copied into the result if there are no changes in that witness in the new foliation changes
   *
   * @param {FoliationChangeInfoInterface[]}previousFoliationChanges
   * @param {FoliationChangeInfoInterface[]}currentFoliationChanges
   * @return {FoliationChangeInfoInterface[]}
   */
  mergeFoliationChanges(previousFoliationChanges: FoliationChangeInfoInterface[], currentFoliationChanges: FoliationChangeInfoInterface[]): FoliationChangeInfoInterface[] {

    let indicesInPrevious: number[] = [];
    previousFoliationChanges.forEach((previousFoliationChange) => {
      indicesInPrevious.push(previousFoliationChange.witnessIndex);
    });
    indicesInPrevious = uniq(indicesInPrevious);

    let indicesInCurrent: number[] = [];
    currentFoliationChanges.forEach((currentFoliationChange) => {
      indicesInCurrent.push(currentFoliationChange.witnessIndex);
    });
    indicesInCurrent = uniq(indicesInCurrent);

    const mergedChanges = [];
    indicesInPrevious.forEach((previousWitnessIndex) => {
      if (indicesInCurrent.indexOf(previousWitnessIndex) === -1) {
        const changes = previousFoliationChanges.filter((previousFoliationChange) => {
          return previousFoliationChange.witnessIndex === previousWitnessIndex;
        });
        if (changes.length > 0) {
          mergedChanges.push(changes[changes.length - 1]);
        }
      }
    });
    mergedChanges.push(...currentFoliationChanges);
    return mergedChanges;
  }


}
