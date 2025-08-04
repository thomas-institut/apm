import {Apparatus} from '../Apparatus'
import {ApparatusTools} from "@/Edition/ApparatusTools";
import {MARGINALIA} from '@/constants/ApparatusType'
import {ApparatusSubEntry} from '../ApparatusSubEntry'
import * as SubEntryType from '../SubEntryType'
import * as SubEntrySource from '../SubEntrySource'
import {ApparatusEntry} from '../ApparatusEntry'
import {FmtTextFactory} from '@/FmtText/FmtTextFactory'
import {FmtTextTokenFactory} from '@/FmtText/FmtTextTokenFactory'
import {NumeralStyles} from '@/toolbox/NumeralStyles'
import {CtDataInterface, FullTxItemInterface, WitnessTokenInterface} from "@/CtData/CtDataInterface";
import {FoliationChangeInfoInterface} from "../FoliationChangeInfoInterface";
import {MainTextToken} from "../MainTextToken";
import {FmtTextToken} from "@/FmtText/FmtTextToken";

export class MarginalFoliationGenerator {
    private readonly ctData: CtDataInterface;
    private readonly lastFoliations: FoliationChangeInfoInterface[];
    private currentFoliationChanges: FoliationChangeInfoInterface[] | null = null;

    /**
     *
     * @param {CtDataInterface}ctData
     * @param {FoliationChangeInfoInterface[]} lastFoliations
     */
    constructor(ctData: CtDataInterface, lastFoliations: FoliationChangeInfoInterface[] = []) {
        this.ctData = ctData;
        this.lastFoliations = lastFoliations;
    }

    /**
     * Returns the array of foliation changes in the current CtData
     *
     * @return {FoliationChangeInfoInterface[]}
     */
    getCurrentFoliationChanges(): FoliationChangeInfoInterface[] {
      if(this.currentFoliationChanges === null) {
        this.currentFoliationChanges = MarginalFoliationGenerator.getFoliationChangeInfoArray(this.ctData, this.lastFoliations);
      }
      return this.currentFoliationChanges;
    }

    /**
     * @param {MainTextToken[]} mainText
     * @return {Apparatus}
     */
    generateMarginaliaApparatus(mainText: MainTextToken[]): Apparatus {
        let app = ApparatusTools.createEmpty();
        app.type = MARGINALIA;
        let mainTextCollationRow = this.ctData.collationMatrix[this.ctData.editionWitnessIndex];

        mainTextCollationRow.forEach((mainTextTokenIndex, collationTableColumnNumber) => {
            if (mainTextTokenIndex === -1) {
                return;
            }
            const changesInColumn = this.getCurrentFoliationChanges().filter((change) => {
                return change.collationTableColumn === collationTableColumnNumber;
            });
            let subEntries: ApparatusSubEntry[] = [];
            changesInColumn.forEach((change) => {
                const siglum = this.ctData.sigla[change.witnessIndex];
                let subEntry = new ApparatusSubEntry();
                subEntry.source = SubEntrySource.AUTO;
                subEntry.type = SubEntryType.AUTO_FOLIATION;
                subEntry.fmtText = this.getMarginalSubEntryFmtText(siglum, change.newFoliation);
                subEntry.witnessData = [{
                    witnessIndex: change.witnessIndex,
                    hand: 0,
                    forceHandDisplay: false,
                    location: "",
                    omitSiglum: true
                }];
                subEntries.push(subEntry);
            });
            if (subEntries.length > 0) {
                const mainTextTokenIndex = this.getMainTextIndexFromCtIndex(collationTableColumnNumber, mainText);
                if (mainTextTokenIndex === -1) {
                    console.warn(`Found change associated with non-existed main text token`, {
                        collationTableColumnNumber: collationTableColumnNumber,
                    });
                    return;
                }
                const editionWitnessTokenIndex = this.ctData.collationMatrix[this.ctData.editionWitnessIndex][collationTableColumnNumber];

                const editionWitnessToken = this.ctData.witnesses[this.ctData.editionWitnessIndex].tokens[editionWitnessTokenIndex];

                let entry = new ApparatusEntry();
                entry.from = mainTextTokenIndex;
                entry.to = mainTextTokenIndex;
                entry.subEntries = subEntries;
                entry.lemmaText = editionWitnessToken.text;
                app.entries.push(entry);
            }
        });
        return app;
    }


    /**
     *
     * @param {string}siglum
     * @param {string}foliation
     * @return {FmtTextToken[]}
     * @private
     */
    getMarginalSubEntryFmtText(siglum: string, foliation: string): FmtTextToken[] {

        if (this.ctData.lang === 'ar') {

            let fmtText: FmtTextToken[] = [];

            fmtText.push(FmtTextTokenFactory.normalText(siglum));
            fmtText.push(FmtTextTokenFactory.normalText('-'));

            let foliationParts = foliation.match(/^(\d+)([r|v]?)$/);
            if (foliationParts === null) {
                fmtText.push(FmtTextTokenFactory.normalText(foliation));
            } else {
                let [, folioNumber, folioSuffix] = foliationParts;
                folioSuffix = folioSuffix ?? '';
                fmtText.push(FmtTextTokenFactory.normalText(NumeralStyles.toDecimalArabic(parseInt(folioNumber))));
                if (folioSuffix === 'r') {
                    folioSuffix = 'ظ';
                }
                if (folioSuffix === 'v') {
                    folioSuffix = 'و';
                }
                if (folioSuffix !== '') {
                    fmtText.push(FmtTextTokenFactory.normalText(folioSuffix));
                }
            }

            return fmtText;
        }

        return FmtTextFactory.fromString(`${siglum}:${foliation}`);
    }


    /**
     *
     * @param {number}ctIndex
     * @param {MainTextToken[]} mainText
     * @return {number}
     */
    getMainTextIndexFromCtIndex(ctIndex: number, mainText: MainTextToken[]): number {


        for (let i = 0; i < mainText.length; i++) {
            if (mainText[i].editionWitnessTokenIndex === this.ctData.collationMatrix[this.ctData.editionWitnessIndex][ctIndex]) {
                return i
            }
        }
        return -1
    }

    /**
     * Generates a list of foliation change information objects for the
     * witnesses that should be included in automatic marginal foliation.
     *
     * Each foliation change is associated with a non-empty column in the
     * collation table.
     *
     * If an array of foliation change info objects is given, the last foliation found
     * for a witness will be considered and no changes will be recorded until the
     * foliation for that witness changes to a different value
     *
     * @param ctData
     * @param {FoliationChangeInfoInterface[]} lastFoliations
     * @return {FoliationChangeInfoInterface[]}
     */
    static getFoliationChangeInfoArray(ctData: CtDataInterface, lastFoliations: FoliationChangeInfoInterface[] = []): FoliationChangeInfoInterface[] {
        let foliationChangeInfoArray: FoliationChangeInfoInterface[] = [];
        let mainTextCollationRow = ctData.collationMatrix[ctData.editionWitnessIndex];
        let baseWitnessTokens = ctData.witnesses[ctData.editionWitnessIndex].tokens;
        ctData.includeInAutoMarginalFoliation.forEach((witnessIndex) => {
            let lastFoliation = getLastFoliationForWitness(lastFoliations, witnessIndex);
            const witnessItems = ctData.witnesses[witnessIndex].items ?? [];
            mainTextCollationRow.forEach((baseWitnessTokenIndex, collationTableColumnNumber) => {
                if (baseWitnessTokenIndex === -1) {
                    return;
                }
                if (baseWitnessTokens[baseWitnessTokenIndex].tokenType === 'empty') {
                    return;
                }

                const witnessTokenIndex = ctData.collationMatrix[witnessIndex][collationTableColumnNumber];
                if (witnessTokenIndex === -1) {
                    return;
                }

                const witnessToken = ctData.witnesses[witnessIndex].tokens[witnessTokenIndex];

                let newFoliation = getFoliationForToken(witnessToken, witnessItems);
                if (newFoliation !== null && newFoliation !== lastFoliation) {
                    foliationChangeInfoArray.push({
                        collationTableColumn: collationTableColumnNumber,
                        witnessIndex: witnessIndex,
                        newFoliation: newFoliation
                    });
                    lastFoliation = newFoliation;
                }
            });
        });

        return foliationChangeInfoArray.sort((a, b) => {
            return a.collationTableColumn - b.collationTableColumn;
        });
    }
}

/**
 * Returns the foliation of the given witness token or null
 * if the foliation cannot be determined
 *
 * @param {WitnessTokenInterface} token
 * @param {FullTxItemInterface[]} items
 * @return {string|null}
 */
function getFoliationForToken(token: WitnessTokenInterface, items: FullTxItemInterface[]): string | null {
    let sourceItemIndex = token.sourceItems ? token.sourceItems[0].index : undefined;
    if (sourceItemIndex === undefined) {
        return null;
    }
    return items[sourceItemIndex]?.address?.foliation ?? null;
}

/**
 * Returns the last foliation found in the given array of foliation change info objects.
 *
 * If no foliation is found in the array, returns an empty string
 *
 * @param {FoliationChangeInfoInterface[]}foliationChangeInfoArray
 * @param {number}witnessIndex
 */
function getLastFoliationForWitness(foliationChangeInfoArray: FoliationChangeInfoInterface[], witnessIndex: number) {
    const changes = foliationChangeInfoArray.filter((change) => {
        return change.witnessIndex === witnessIndex;
    }).sort((a, b) => {
        return a.collationTableColumn - b.collationTableColumn;
    });

    if (changes.length === 0) {
        return '';
    }
    return changes[changes.length - 1].newFoliation;

}
