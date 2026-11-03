import {describe, expect, it} from 'vitest';
import {
  Dimension,
  Glue,
  ItemList,
  MinusInfinitePenalty,
  Penalty,
  StyleSheet,
  StyleSheetDefinition,
  TextBox,
  TextBoxMeasurer,
  TypesetterItem
} from '@thomas-inst/typesetter';
import {EditionTypesettingHelper} from '@/Edition/EditionTypesettingHelper';
import {Edition} from '@/Edition/Edition';
import {MainTextTokenFactory} from '@/Edition/MainTextTokenFactory';
import {MainTextToken} from '@/Edition/MainTextToken';
import {defaultLatinEditionStyle} from '@/defaults/EditionStyles/Latin';
import {deepCopy} from '@/toolbox/Util';

class MockTextBoxMeasurer extends TextBoxMeasurer {
  async getBoxWidth(item: TextBox): Promise<number> {
    return item.getText().length * 5;
  }

  async getBoxHeight(_item: TextBox): Promise<number> {
    return 12;
  }
}

function buildEdition(mainText: MainTextToken[]): Edition {
  const edition = new Edition();
  edition.lang = 'la';
  edition.mainText = mainText;
  return edition;
}

function twoParagraphs(firstStyle: string, breakToken: MainTextToken | null): MainTextToken[] {
  const tokens = [
    MainTextTokenFactory.createSimpleText('text', 'first', 0, 'la'),
    MainTextTokenFactory.createParagraphEnd(firstStyle),
  ];
  if (breakToken !== null) {
    tokens.push(breakToken);
  }
  tokens.push(MainTextTokenFactory.createSimpleText('text', 'second', 1, 'la'));
  return tokens;
}

/**
 * Returns the vertical items between the first and the second paragraph
 */
async function getItemsAfterFirstParagraph(mainText: MainTextToken[], ssDef: StyleSheetDefinition = defaultLatinEditionStyle): Promise<TypesetterItem[]> {
  const helper = new EditionTypesettingHelper({
    edition: buildEdition(mainText),
    editionStyleSheet: new StyleSheet(ssDef),
    textBoxMeasurer: new MockTextBoxMeasurer(),
  });
  const list = await helper.generateListToTypesetFromMainText();
  const items = list.getList();
  const paragraphIndices = items.map((item, index) => item instanceof ItemList ? index : -1).filter((i) => i !== -1);
  expect(paragraphIndices).toHaveLength(2);
  return items.slice(paragraphIndices[0] + 1, paragraphIndices[1]);
}

describe('EditionTypesettingHelper section and page breaks', () => {
  it('adds no vertical items between normal paragraphs without a break', async () => {
    const items = await getItemsAfterFirstParagraph(twoParagraphs('', null));
    expect(items).toHaveLength(0);
  });

  it('adds a forced break penalty after a paragraph with a page break', async () => {
    const items = await getItemsAfterFirstParagraph(twoParagraphs('', MainTextTokenFactory.createPageBreak()));
    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(Penalty);
    expect((items[0] as Penalty).getPenalty()).toBe(MinusInfinitePenalty);
  });

  it('uses the sectionBreak style glue for the section break space', async () => {
    const ssDef = deepCopy(defaultLatinEditionStyle);
    ssDef.sectionBreak = {parent: '', glue: {width: '30 pt', stretch: '2 pt', shrink: '1 pt'}};
    const items = await getItemsAfterFirstParagraph(twoParagraphs('', MainTextTokenFactory.createSectionBreak()), ssDef);
    const glue = items[0] as Glue;
    expect(glue.getHeight()).toBeCloseTo(Dimension.getPixelValue('30 pt', 12));
    expect(glue.getStretch()).toBeCloseTo(Dimension.getPixelValue('2 pt', 12));
    expect(glue.getShrink()).toBeCloseTo(Dimension.getPixelValue('1 pt', 12));
  });

  it('falls back to the normal paragraph lineSkip when there is no sectionBreak style', async () => {
    const ssDef = deepCopy(defaultLatinEditionStyle);
    delete ssDef.sectionBreak;
    ssDef.default.paragraph!.lineSkip = '20 pt';
    const items = await getItemsAfterFirstParagraph(twoParagraphs('', MainTextTokenFactory.createSectionBreak()), ssDef);
    expect(items).toHaveLength(1);
    expect((items[0] as Glue).getHeight()).toBeCloseTo(Dimension.getPixelValue('20 pt', 12));
  });

  it('does not add a never break penalty for keepWithNext paragraphs with a break', async () => {
    const items = await getItemsAfterFirstParagraph(twoParagraphs('h1', MainTextTokenFactory.createPageBreak()));
    const penalties = items.filter((item) => item instanceof Penalty) as Penalty[];
    expect(penalties).toHaveLength(1);
    expect(penalties[0].getPenalty()).toBe(MinusInfinitePenalty);
  });

  it('keeps the never break penalty for keepWithNext paragraphs without a break', async () => {
    const items = await getItemsAfterFirstParagraph(twoParagraphs('h1', null));
    const penalties = items.filter((item) => item instanceof Penalty) as Penalty[];
    expect(penalties).toHaveLength(1);
    expect(penalties[0].getPenalty()).toBe(Penalty.createNeverBreakPenalty().getPenalty());
  });
});
