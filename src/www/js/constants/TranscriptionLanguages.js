import * as Entity from './Entity'

// Settings and common data for languages used for transcriptions
// this used to be given in the config.php file

export const TranscriptionLanguages = [
  { id: Entity.LangArabic, name: 'Arabic', code: 'ar', fontsize: 5, rtl: true },
  { id: Entity.LangHebrew, name: 'Hebrew', code: 'he', fontsize: 3, rtl: true },
  { id: Entity.LangLatin, name: 'Latin', code: 'la', fontsize: 3, rtl: false },
  { id: Entity.LangJudeoArabic, name: 'Judeo-Arabic', code: 'jrb', fontsize: 3, rtl: true }
]

/**
 * Returns the language code for the given language entity id
 *
 * Returns an empty string if the given id does not correspond to
 * a configured transcription language.
 * @param langId
 * @returns {string}
 */
export function getLangCodeFromLangId (langId) {
  for (let i = 0; i < TranscriptionLanguages.length; i++) {
    if (TranscriptionLanguages[i].id === langId) {
      return TranscriptionLanguages[i].code
    }
  }
  return ''
}

/**
 * Returns the language entity id for the given language ISO code or
 * -1 if the given code is not defined
 *
 * @param langCode
 * @returns {number}
 */
export function getLangIdFromLangCode (langCode) {
  for (let i = 0; i < TranscriptionLanguages.length; i++) {
    if (TranscriptionLanguages[i].code === langCode) {
      return TranscriptionLanguages[i].id
    }
  }
}

export function getLangName (langId) {
  for (let i = 0; i < TranscriptionLanguages.length; i++) {
    if (TranscriptionLanguages[i].id === langId) {
      return TranscriptionLanguages[i].name
    }
  }
  return ''
}
