import {describe, expect, test} from 'vitest';
import {FullTxItemInterface, WitnessTokenInterface} from "@/CtData/CtDataInterface";
import {getNonTokenItemIndices} from "@/Witness/TranscriptionWitness";


describe("TranscriptionWitness", () => {
  test("NonTokenItemIndices 1", () => {
    const tokens: WitnessTokenInterface[] = [];
    const items: FullTxItemInterface[] = [];

    expect(getNonTokenItemIndices(tokens, items)).toEqual([]);
  });

  test("NonTokenItemIndices 2", () => {
    const tokens: WitnessTokenInterface[] = [createTokenWithItemIndex(1), // 0
      createTokenWithItemIndex(1), // 1
      createTokenWithItemIndex(1), // 2
      createTokenWithItemIndex(3), // 3
      createTokenWithItemIndex(3), // 4
      createTokenWithItemIndex(3), // 5
      createTokenWithItemIndex(3), // 6
    ];
    const items: FullTxItemInterface[] = [0, 1, 2, 3, 4].map(createFullTxItem);
    const nonTokenItemIndices = getNonTokenItemIndices(tokens, items);
    expect(nonTokenItemIndices.length).toEqual(tokens.length);
    expect(nonTokenItemIndices[0].pre).toEqual([0]);
    for (let i = 1; i < nonTokenItemIndices.length; i++) {
      expect(nonTokenItemIndices[i].pre).toEqual([]);
    }
    expect(nonTokenItemIndices[2].post).toEqual([2]);
    expect(nonTokenItemIndices[6].post).toEqual([4]);
    [0, 1, 3, 4, 5].forEach((i) => {
      expect(nonTokenItemIndices[i].post).toEqual([]);
    });
  });
});

function createTokenWithItemIndex(itemIndex: number): WitnessTokenInterface {
  return {
    text: '',
    sourceItems: [{index: itemIndex, charRange: {from: -1, to: -1}}],
    tokenType: "",
    tokenClass: "",
    fmtText: []
  };
}

function createFullTxItem(): FullTxItemInterface {
  return {
    type: "Mark", text: "", address: {
      itemIndex: 0, textBoxIndex: 0, pageId: 0, ceId: 0, column: 0, foliation: "", itemSeq: 0, itemId: 0, ceSeq: 0
    }
  };
}