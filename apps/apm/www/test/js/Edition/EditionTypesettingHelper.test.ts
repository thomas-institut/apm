import {describe, expect, it, vi} from 'vitest';
import {
  HorizontalItemDirection,
  Glue,
  ItemList,
  LineList,
  LineNumber,
  ListType,
  MainTextBlockList,
  MainTextOriginalIndex,
  PageFoliation,
  PageNumber,
  TextBox,
  TextBoxMeasurer,
  TypesetterPage,
  VerticalItemDirection
} from '@thomas-inst/typesetter';
import {EditionTypesettingHelper} from '@/Edition/EditionTypesettingHelper.js';
import {Edition} from '@/Edition/Edition.js';
import {ApparatusInterface, ApparatusSubEntryInterface} from '@/Edition/EditionInterface.js';
import {SystemStyleSheet} from '@/defaults/EditionStyles/SystemStyleSheet.js';

describe('EditionTypesettingHelper', () => {
  it('prepends a styled Endnotes heading before the note entries', async () => {
    const edition = new Edition();
    edition.lang = 'la';
    const helper = new EditionTypesettingHelper({
      edition,
      editionStyleSheet: SystemStyleSheet.getStyleSheet('la', 'default'),
      textBoxMeasurer: {} as TextBoxMeasurer,
    });
    const getSubEntryTsItems = vi.spyOn(helper, 'getSubEntryTsItems').mockResolvedValue([new TextBox().setText('A note')]);

    const apparatus = {
      type: 'endNotes',
      entries: [{
        from: 0,
        to: 0,
        preLemma: '',
        lemmaType: 'auto',
        customLemmaText: '',
        mainTextWords: ['note'],
        postLemma: '',
        separator: '',
        subEntries: [{enabled: true} as ApparatusSubEntryInterface]
      }],
    } as ApparatusInterface;

    const output = await helper.generateEndNotesApparatusVerticalListToTypeset(apparatus, []);
    const paragraphs = output.getList().filter((item) => item instanceof ItemList) as ItemList[];
    const headingParagraph = paragraphs[0];
    const noteParagraph = paragraphs[2];
    const headingTextBox = headingParagraph.getList().find((item) => item instanceof TextBox);
    const noteTextBox = noteParagraph.getList().find((item) => item instanceof TextBox && item.getText() === 'A note');

    expect(headingTextBox).toBeInstanceOf(TextBox);
    expect((headingTextBox as TextBox).getText()).toBe('Endnotes');
    expect(noteTextBox).toBeInstanceOf(TextBox);
    expect((noteTextBox as TextBox).getText()).toBe('A note');
    expect(getSubEntryTsItems).toHaveBeenCalledWith(apparatus.entries[0].subEntries[0], 'endNotesSubEntry', 'endNotesSubEntry apparatusKeyword');
    expect(noteParagraph.getTextDirection()).toBe('ltr');
    const outputItems = output.getList();
    const separator = outputItems[outputItems.length - 1] as Glue;
    expect(separator.getHeight()).toBe(12);
    expect(separator.getStretch()).toBe(3);
    expect(separator.getShrink()).toBeCloseTo(1.2);
  });

  it('uses the endnote style for witness sigla in subentries', async () => {
    const edition = new Edition();
    edition.lang = 'la';
    const helper = new EditionTypesettingHelper({
      edition,
      editionStyleSheet: SystemStyleSheet.getStyleSheet('la', 'default'),
      textBoxMeasurer: {} as TextBoxMeasurer,
    });
    const subEntry = {type: 'variant'} as ApparatusSubEntryInterface;
    vi.spyOn(helper, 'getTsItemsForFmtText').mockResolvedValue([]);
    const getTsItemsForSigla = vi.spyOn(helper, 'getTsItemsForSigla').mockResolvedValue([]);

    await helper.getSubEntryTsItems(subEntry, 'endNotesSubEntry', 'endNotesSubEntry apparatusKeyword');

    expect(getTsItemsForSigla).toHaveBeenCalledWith(subEntry, 'endNotesSubEntry');
  });

  it('prefixes each endnote with its page and line range and lemma', async () => {
    const edition = new Edition();
    edition.lang = 'la';
    const helper = new EditionTypesettingHelper({
      edition,
      editionStyleSheet: SystemStyleSheet.getStyleSheet('la', 'default'),
      textBoxMeasurer: {} as TextBoxMeasurer,
    });
    vi.spyOn(helper, 'getSubEntryTsItems')
      .mockResolvedValueOnce([new TextBox().setText('First note')])
      .mockResolvedValueOnce([new TextBox().setText('Second note')]);

    const createPage = (pageNumber: number, pageFoliation: string, lines: {lineNumber: number, tokenIndex: number}[]) => {
      const mainTextBlock = new ItemList(VerticalItemDirection);
      mainTextBlock.addMetadata(ListType, MainTextBlockList);
      lines.forEach(({lineNumber, tokenIndex}) => {
        const line = new ItemList(HorizontalItemDirection);
        line.addMetadata(ListType, LineList);
        line.addMetadata(LineNumber, lineNumber);
        line.pushItem(new TextBox().setText(`token${tokenIndex}`).addMetadata(MainTextOriginalIndex, tokenIndex));
        mainTextBlock.pushItem(line);
      });
      const page = new TypesetterPage(100, 100, [mainTextBlock]);
      page.addMetadata(PageNumber, pageNumber);
      page.addMetadata(PageFoliation, pageFoliation);
      return page;
    };

    const apparatus = {
      type: 'endNotes',
      entries: [{
        from: 1,
        to: 3,
        preLemma: '',
        lemmaType: 'auto',
        customLemmaText: '',
        mainTextWords: ['lemma'],
        postLemma: '',
        separator: '',
        subEntries: [{enabled: true} as ApparatusSubEntryInterface],
      }, {
        from: 1,
        to: 2,
        preLemma: '',
        lemmaType: 'auto',
        customLemmaText: '',
        mainTextWords: ['lemma'],
        postLemma: '',
        separator: '',
        subEntries: [{enabled: true} as ApparatusSubEntryInterface],
      }],
    } as ApparatusInterface;

    const output = await helper.generateEndNotesApparatusVerticalListToTypeset(apparatus, [
      createPage(6, '6r', [{lineNumber: 5, tokenIndex: 1}, {lineNumber: 6, tokenIndex: 2}]),
      createPage(7, '6v', [{lineNumber: 8, tokenIndex: 3}]),
    ]);
    const paragraphs = output.getList().filter((item) => item instanceof ItemList) as ItemList[];
    const entryTextBoxes = paragraphs[1].getList().filter((item) => item instanceof TextBox) as TextBox[];
    const entrySubEntryTextBoxes = paragraphs[2].getList().filter((item) => item instanceof TextBox) as TextBox[];
    const singlePageEntryTextBoxes = paragraphs[3].getList().filter((item) => item instanceof TextBox) as TextBox[];
    const singlePageSubEntryTextBoxes = paragraphs[4].getList().filter((item) => item instanceof TextBox) as TextBox[];

    expect(entryTextBoxes[0].getText()).toBe('6r:5-6v:8');
    expect(entryTextBoxes[0].getFontWeight()).toBe('bold');
    expect(entryTextBoxes.map((item) => item.getText()).join(' ')).toContain('lemma');
    expect(entrySubEntryTextBoxes.map((item) => item.getText()).join(' ')).toContain('First note');
    expect(singlePageEntryTextBoxes[0].getText()).toBe('6r:5–6');
    expect(singlePageSubEntryTextBoxes.map((item) => item.getText()).join(' ')).toContain('Second note');
  });

  it.each(['ar', 'he'])('uses RTL for the reference paragraph and LTR for subentries in %s editions', async (lang) => {
    const edition = new Edition();
    edition.lang = lang;
    const helper = new EditionTypesettingHelper({
      edition,
      editionStyleSheet: SystemStyleSheet.getStyleSheet(lang, 'default'),
      textBoxMeasurer: {} as TextBoxMeasurer,
    });
    vi.spyOn(helper, 'getSubEntryTsItems')
      .mockResolvedValueOnce([new TextBox().setText('First note')])
      .mockResolvedValueOnce([new TextBox().setText('Second note')]);

    const apparatus = {
      type: 'endNotes',
      entries: [{
        from: 0,
        to: 0,
        preLemma: '',
        lemmaType: 'auto',
        customLemmaText: '',
        mainTextWords: ['lemma'],
        postLemma: '',
        separator: '',
        subEntries: [
          {enabled: true} as ApparatusSubEntryInterface,
          {enabled: true} as ApparatusSubEntryInterface
        ]
      }],
    } as ApparatusInterface;

    const output = await helper.generateEndNotesApparatusVerticalListToTypeset(apparatus, []);
    const paragraphs = output.getList().filter((item) => item instanceof ItemList) as ItemList[];
    const referenceParagraph = paragraphs[1];
    const firstSubEntryParagraph = paragraphs[2];
    const secondSubEntryParagraph = paragraphs[3];
    const outputItems = output.getList();
    const separator = outputItems[outputItems.length - 1];

    expect(output.getTextDirection()).toBe('rtl');
    expect(referenceParagraph.getTextDirection()).toBe('rtl');
    expect(firstSubEntryParagraph.getTextDirection()).toBe('ltr');
    expect(secondSubEntryParagraph.getTextDirection()).toBe('ltr');
    expect((firstSubEntryParagraph.getList().find((item) => item instanceof TextBox) as TextBox).getText()).toBe('First note');
    expect((secondSubEntryParagraph.getList().find((item) => item instanceof TextBox) as TextBox).getText()).toBe('Second note');
    expect(separator).toBeInstanceOf(Glue);
    expect((separator as Glue).getHeight()).toBe(12);
  });
});