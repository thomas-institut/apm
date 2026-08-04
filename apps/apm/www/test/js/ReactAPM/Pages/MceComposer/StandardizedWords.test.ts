import {describe, expect, it} from 'vitest';
import {StandardizedWords} from '@/ReactAPM/Pages/MceComposer/StandardizedWords.js';
import {Edition} from '@/Edition/Edition.js';
import {MainTextTokenFactory} from '@/Edition/MainTextTokenFactory.js';
import {StandardizedString} from '@/MceData/StandardizedString.js';

describe('StandardizedWords', () => {
  it('correctly builds standardized words with matching indices in Latin', () => {
    const edition = new Edition();
    edition.lang = 'la';
    edition.mainText = [
      MainTextTokenFactory.createSimpleText('text', 'Dominus', 0, 'la'),
      MainTextTokenFactory.createSimpleText('text', 'dominus', 1, 'la'),
      MainTextTokenFactory.createSimpleText('text', 'Deus', 2, 'la'),
      MainTextTokenFactory.createSimpleText('text', 'DOMINUS', 3, 'la'),
    ];

    const arrayInMce: StandardizedString[] = [
      {
        original: 'Dominus',
        standardized: 'dominus',
        instances: []
      }
    ];

    const result = StandardizedWords.build(arrayInMce, edition);

    expect(result).toHaveLength(1);
    expect(result[0].original).toBe('Dominus');
    expect(result[0].numInstances).toBe(3); // Dominus, dominus, DOMINUS
    expect(result[0].instances).toHaveLength(3);
    expect(result[0].instances.map(i => i.mainTextIndex)).toEqual([0, 1, 3]);
  });

  it('correctly builds standardized words with matching indices using originalText', () => {
    const edition = new Edition();
    edition.lang = 'la';
    const token = MainTextTokenFactory.createSimpleText('text', 'dominus', 0, 'la');
    token.originalText = 'Dominus';
    // If fmtText was changed but originalText kept old value
    
    edition.mainText = [token];

    const arrayInMce: StandardizedString[] = [
      {
        original: 'Dominus',
        standardized: 'dominus',
        instances: []
      }
    ];

    const result = StandardizedWords.build(arrayInMce, edition);

    expect(result).toHaveLength(1);
    expect(result[0].numInstances).toBe(1);
    expect(result[0].instances[0].mainTextIndex).toBe(0);
  });

  it('correctly builds standardized words with matching indices in Non-Latin', () => {
    const edition = new Edition();
    edition.lang = 'en';
    edition.mainText = [
      MainTextTokenFactory.createSimpleText('text', 'Dominus', 0, 'en'),
      MainTextTokenFactory.createSimpleText('text', 'dominus', 1, 'en'),
    ];

    const arrayInMce: StandardizedString[] = [
      {
        original: 'Dominus',
        standardized: 'dominus',
        instances: []
      }
    ];

    const result = StandardizedWords.build(arrayInMce, edition);

    expect(result).toHaveLength(1);
    expect(result[0].numInstances).toBe(1); // Only exact match "Dominus"
    expect(result[0].instances[0].mainTextIndex).toBe(0);
  });
});
