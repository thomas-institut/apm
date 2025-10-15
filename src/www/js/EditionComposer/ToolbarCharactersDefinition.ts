// Characters to show in edition toolbars: EditionMainTextEditor and ApparatusEntryTextEditor

export type ToolbarCharactersDatabase = {
  [key: string]: ToolbarCharacters;
};


export type ToolbarCharacters = {
 [charTitle: string]: ToolbarCharacter;
};

export interface ToolbarCharacter {
  character: string;
  title: string;
  rtlVersion?: string;
}

export const toolbarCharactersDefinition: ToolbarCharactersDatabase = {
  la: {
    leftDQM: {character: '“', title: 'Left Double Quotation Mark'},
    rightDQM: {character: '”', title: 'Right Double Quotation Mark'},
    leftSQM: {character: '‘', title: 'Left Single Quotation Mark'},
    rightSQM: {character: '’', title: 'Right Single Quotation Mark'},
    enDash: {character: '\u2013', title: 'En Dash'},
    emDash: {character: '\u2014', title: 'Em dash'},
    guillemetSt: {character: '«', title: 'Opening Guillemet'},
    guillemetEnd: {character: '»', title: 'Closing Guillemet'}
  }, ar: {
    rightDQM: {character: '”', title: 'Right Double Quotation Mark'},
    leftDQM: {character: '“', title: 'Left Double Quotation Mark'},
    rightSQM: {character: '’', title: 'Right Single Quotation Mark'},
    leftSQM: {character: '‘', title: 'Left Single Quotation Mark'},
    enDash: {character: '\u2013', title: 'En Dash'},
    emDash: {character: '\u2014', title: 'Em dash'},
    leftBracket: {character: '[', title: 'Opening Bracket'},
    rightBracket: {character: ']', title: 'Closing Bracket'},
    guillemetSt: {character: '«', title: 'Opening Guillemet'},
    guillemetEnd: {character: '»', title: 'Closing Guillemet'},
  }, he: {
    rightDQM: {character: '”', title: 'Right Double Quotation Mark'},
    leftDQM: {character: '“', title: 'Left Double Quotation Mark'},
    rightSQM: {character: '’', title: 'Right Single Quotation Mark'},
    leftSQM: {character: '‘', title: 'Left Single Quotation Mark'},
    maqaf: {character: '\u05be', title: 'Maqaf'},
    enDash: {character: '\u2013', title: 'En Dash'},
    emDash: {character: '\u2014', title: 'Em dash'},
    guillemetSt: {character: '«', title: 'Opening Guillemet'},
    guillemetEnd: {character: '»', title: 'Closing Guillemet'},
    gershayim: {character: '\u05f4', title: 'Gershayim'}
  }
};