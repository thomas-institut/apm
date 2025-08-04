/**
 * Interface representing information related to a foliation change
 * associated with a column in the collation table.
 *
 * For example:
 * ```
 * {
 *  collationTableColumn: 20,
 *  witnessIndex: 3,
 *  newFoliation: '20r'
 * }
 * ```
 * indicates that in column 20 in the collation table, witness 3 has a new foliation,
 * namely `20r`
 *
 */
export interface FoliationChangeInfoInterface {
    collationTableColumn: number;
    witnessIndex: number;
    newFoliation: string;
}



