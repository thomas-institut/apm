import * as Entity from './Entity'


// Settings and common data for languages used for transcriptions
// this used to be given in the config.php file

export const TranscriptionLanguages = [
  { id: Entity.LangArabic, name: 'Arabic', code: 'ar', fontsize: 5, rtl: true},
  { id: Entity.LangHebrew, name: 'Hebrew', code: 'he', fontsize: 3, rtl: true},
  { id: Entity.LangLatin, name: 'Latin', code: 'la', fontsize: 3, rtl: false},
  { id: Entity.LangJudeoArabic, name: 'Judeo-Arabic', code: 'jrb', fontsize: 3, rtl: true}
];
