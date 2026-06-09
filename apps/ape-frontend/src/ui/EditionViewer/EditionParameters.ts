
export type FontStyle = 'normal' | 'italic' | 'small' | 'bold';

interface EditionParameters {
  smallFontFactor?: number;
  keywordFontStyle: FontStyle;
  siglaFontStyle: FontStyle
  strings: {
    omission: string;
    addition: string;
    ante: string;
    post: string;
    [key: string]: string;
  };
}

export const EditionParametersByLanguage: Record<string, EditionParameters> = {
  la: {
    keywordFontStyle: 'italic',
    siglaFontStyle: 'italic',
    strings: {
      omission: 'om.', addition: 'add.', ante: 'ante', post: 'post'
    },
  },
  ar: {
    keywordFontStyle: 'small',
    siglaFontStyle: 'normal',
    smallFontFactor: 0.8,
    strings: {
      omission: 'نقص', addition: 'ز', ante: 'قبل', post: 'بعد'
    }
  },
  he: {
    keywordFontStyle: 'small',
    siglaFontStyle: 'bold',
    smallFontFactor: 0.8,
    strings: {
      omission: 'חסר', addition: 'נוסף', ante: 'לפני', post: 'אחרי'
    }
  }
};
