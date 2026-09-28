import {describe, expect, it, vi} from 'vitest';
import {
  HorizontalItemDirection,
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
    vi.spyOn(helper, 'getSubEntryTsItems').mockResolvedValue([new TextBox().setText('A note')]);

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
    const noteParagraph = paragraphs[1];
    const headingTextBox = headingParagraph.getList().find((item) => item instanceof TextBox);
    const noteTextBox = noteParagraph.getList().find((item) => item instanceof TextBox && item.getText() === 'A note');

    expect(headingTextBox).toBeInstanceOf(TextBox);
    expect((headingTextBox as TextBox).getText()).toBe('Endnotes');
    expect(noteTextBox).toBeInstanceOf(TextBox);
    expect((noteTextBox as TextBox).getText()).toBe('A note');
  });

  it('prefixes each endnote with its page and line range and lemma', async () => {
    const edition = new Edition();
    edition.lang = 'la';
    const helper = new EditionTypesettingHelper({
      edition,
      editionStyleSheet: SystemStyleSheet.getStyleSheet('la', 'default'),
      textBoxMeasurer: {} as TextBoxMeasurer,
    });
    vi.spyOn(helper, 'getSubEntryTsItems').mockResolvedValue([new TextBox().setText('A note')]);

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
    const singlePageEntryTextBoxes = paragraphs[2].getList().filter((item) => item instanceof TextBox) as TextBox[];

    expect(entryTextBoxes[0].getText()).toBe('6r:5-6v:8');
    expect(entryTextBoxes[0].getFontWeight()).toBe('bold');
    expect(entryTextBoxes.map((item) => item.getText()).join(' ')).toContain('lemma');
    expect(entryTextBoxes.map((item) => item.getText()).join(' ')).toContain('A note');
    expect(singlePageEntryTextBoxes[0].getText()).toBe('6r:5–6');
  });
});