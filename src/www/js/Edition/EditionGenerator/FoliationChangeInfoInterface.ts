/**
 * Interface representing the information related to a foliation change event.

 * Properties:
 * - `baseWitnessTokenIndex`: The index of the base witness token associated with the foliation change.
 * - `witnessIndex`: The index identifying the specific witness involved in the foliation change.
 * - `newFoliation`: The updated foliation value after the change occurs.
 */
export interface FoliationChangeInfoInterface {
    collationTableColumn: number;
    witnessIndex: number;
    newFoliation: string;
}



