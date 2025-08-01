

export class WitnessDataItem {
    witnessIndex: number
    hand: number
    location: string
    forceHandDisplay: boolean
    static clone(dataItem: WitnessDataItem) : WitnessDataItem;
    setWitnessIndex(witnessIndex: number): this;
    setHand(hand: number): this;
}