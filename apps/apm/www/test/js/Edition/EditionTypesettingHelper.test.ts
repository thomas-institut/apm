import {describe, expect, it, vi} from 'vitest';
import {ItemList, TextBox, TextBoxMeasurer} from '@thomas-inst/typesetter';
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
      entries: [{subEntries: [{enabled: true} as ApparatusSubEntryInterface]}],
    } as ApparatusInterface;

    const output = await helper.generateEndNotesApparatusVerticalListToTypeset(apparatus, []);
    const paragraphs = output.getList().filter((item) => item instanceof ItemList) as ItemList[];
    const headingParagraph = paragraphs[0];
    const noteParagraph = paragraphs[1];
    const headingTextBox = headingParagraph.getList().find((item) => item instanceof TextBox);
    const noteTextBox = noteParagraph.getList().find((item) => item instanceof TextBox);

    expect(headingTextBox).toBeInstanceOf(TextBox);
    expect((headingTextBox as TextBox).getText()).toBe('Endnotes');
    expect(noteTextBox).toBeInstanceOf(TextBox);
    expect((noteTextBox as TextBox).getText()).toBe('A note');
  });
});