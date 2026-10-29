/*
 *  Copyright (C) 2026 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {NormalizerRegister} from '../pages/common/NormalizerRegister.js';
import {ToLowerCaseNormalizer} from './TokenNormalizer/ToLowerCaseNormalizer.js';
import {IgnoreArabicVocalizationNormalizer} from './TokenNormalizer/IgnoreArabicVocalizationNormalizer.js';
import {IgnoreShaddaNormalizer} from './TokenNormalizer/IgnoreShaddaNormalizer.js';
import {RemoveHamzahMaddahFromAlifWawYahNormalizer} from './TokenNormalizer/RemoveHamzahMaddahFromAlifWawYahNormalizer.js';
import {IgnoreTatwilNormalizer} from './TokenNormalizer/IgnoreTatwilNormalizer.js';
import {IgnoreIsolatedHamzaNormalizer} from './TokenNormalizer/IgnoreIsolatedHamzaNormalizer.js';

export function createStandardNormalizerRegister(lang: string): NormalizerRegister {
  const normalizerRegister = new NormalizerRegister();
  switch (lang) {
    case 'la':
      normalizerRegister.registerNormalizer('toLowerCase', new ToLowerCaseNormalizer(), {
        lang: 'la',
        label: 'Ignore Letter Case',
        help: 'E.g., \'Et\' and \'et\' will be taken to be the same word'
      });
      break;
    case 'ar':
      normalizerRegister.registerNormalizer('removeHamzahMaddahFromAlifWawYah', new RemoveHamzahMaddahFromAlifWawYahNormalizer(), {
        lang: 'ar',
        label: 'Ignore hamzah and maddah in ʾalif, wāw and yāʾ',
        help: 'آ , أ, إ &larr; ا      ؤ &larr; و      ئ &larr; ي'
      });
      normalizerRegister.registerNormalizer('ignoreVocalization', new IgnoreArabicVocalizationNormalizer(), {
        lang: 'ar',
        label: 'Ignore Vocalization',
        help: 'Ignore vocal diacritics, e.g., الْحُرُوف &larr; الحروف'
      });
      normalizerRegister.registerNormalizer('ignoreShadda', new IgnoreShaddaNormalizer(), {
        lang: 'ar',
        label: 'Ignore shaddah',
        help: 'Ignore shaddah, e.g., درّس &larr; درس'
      });
      normalizerRegister.registerNormalizer('ignoreTatwil', new IgnoreTatwilNormalizer(), {
        lang: 'ar',
        label: 'Ignore taṭwīl',
        help: 'Ignore taṭwīl'
      });
      normalizerRegister.registerNormalizer('ignoreIsolatedHamza', new IgnoreIsolatedHamzaNormalizer(), {
        lang: 'ar',
        label: 'Ignore isolated hamza',
        help: 'Ignore isolated hamza'
      });
      break;
  }
  return normalizerRegister;
}