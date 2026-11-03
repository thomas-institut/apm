import {describe, expect, it} from 'vitest';
import {fromString, getPlainText} from '@thomas-inst/fmt-text';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface';
import {MainTextToken} from '@/Edition/MainTextToken';
import * as MainTextTokenType from '@/Edition/MainTextTokenType';
import * as WitnessTokenType from '@/Witness/WitnessTokenType';
import {AsyncMyersDiff} from '@/toolbox/MyersDiff/AysncMyersDiff';
import {
  applyAutomaticNormalizationsToWitnessToken,
  applyMainTextChangesToCtData,
  calculateMainTextChanges,
  convertMainTextToFmtText,
  fmtTextToEditionWitnessTokens,
  witnessTokenFromEditor
} from '@/Edition/MainTextEditChanges';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';
import {COLLATION_EDITOR_AUTOMATIC} from '@/constants/NormalizationSource';

function witnessToken(text: string): WitnessTokenInterface {
  return {tokenClass: 'edition', tokenType: WitnessTokenType.WORD, text};
}

function editionCtData(token: WitnessTokenInterface): CtDataInterface {
  return {
    type: 'edition', lang: 'la', editionWitnessIndex: 0,
    witnesses: [{witnessType: 'edition', tokens: [token]}],
    collationMatrix: [[0]], groupedColumns: [], customApparatuses: []
  } as unknown as CtDataInterface;
}

describe('main text edit changes', () => {
  it('converts main-text tokens to formatted editor text and back to witness tokens', () => {
    const text = new MainTextToken().setText('alpha beta');
    const glue = new MainTextToken();
    glue.type = MainTextTokenType.GLUE;
    const fmtText = convertMainTextToFmtText([text, glue]);

    expect(getPlainText(fmtText)).toBe('alpha beta ');
    const tokens = fmtTextToEditionWitnessTokens(fromString('alpha beta'), 'la', false, false);
    expect(tokens.map(token => token.text)).toEqual(['alpha', 'beta']);
    expect(tokens.every(token => token.tokenClass === 'edition')).toBe(true);
  });

  it('keeps witness token methods on automatically normalized editor tokens', () => {
    const ctData = editionCtData(witnessToken('alpha'));
    ctData.automaticNormalizationsApplied = ['toLowerCase'];
    const normalizerRegister = {
      applyNormalizerList: (_list: string[], text: string) => text.toLowerCase()
    } as unknown as NormalizerRegister;

    const tokens = fmtTextToEditionWitnessTokens(fromString('Alpha'), 'la', false, false,
      token => applyAutomaticNormalizationsToWitnessToken(token, ctData, normalizerRegister));
    const ctTokens = tokens.map(witnessTokenFromEditor);

    expect(ctTokens).toHaveLength(1);
    expect(ctTokens[0].text).toBe('Alpha');
    expect(ctTokens[0].normalizedText).toBe('alpha');
    expect(ctTokens[0].normalizationSource).toBe(COLLATION_EDITOR_AUTOMATIC);
  });

  it('keeps formatting of editor tokens when converting them to CT data', () => {
    const fmtText = fromString('alpha');
    (fmtText[0] as unknown as Record<string, unknown>).fontWeight = 'bold';
    const ctTokens = fmtTextToEditionWitnessTokens(fmtText, 'la', false, false).map(witnessTokenFromEditor);

    expect(ctTokens).toHaveLength(1);
    expect((ctTokens[0].fmtText?.[0] as unknown as Record<string, unknown>)?.fontWeight).toBe('bold');
  });

  it('calculates replacement and addition changes asynchronously', async () => {
    const diffEngine = new AsyncMyersDiff();
    const changes = await calculateMainTextChanges(diffEngine,
      [witnessToken('alpha'), witnessToken('beta')],
      [witnessToken('alpha'), witnessToken('gamma'), witnessToken('delta')]);

    expect(changes).not.toBeNull();
    expect(changes?.map(change => change.change)).toEqual(['replace', 'add']);
    expect(changes?.map(change => change.newToken?.text)).toEqual(['gamma', 'delta']);
  });

  it('inserts a collation-table column for a main-text addition', () => {
    const originalToken = witnessToken('alpha');
    const ctData = editionCtData(originalToken);
    applyMainTextChangesToCtData(ctData, [{
      change: 'add', index: 0, currentToken: originalToken, index2: 0, newToken: witnessToken('beta')
    }]);

    expect(ctData.collationMatrix[0]).toEqual([0, 1]);
    expect(ctData.witnesses[0].tokens?.map(token => token.text)).toEqual(['alpha', 'beta']);
  });

  it('inserts a new first token before the existing collation-table columns', () => {
    const originalToken = witnessToken('alpha');
    const ctData = editionCtData(originalToken);
    applyMainTextChangesToCtData(ctData, [{
      change: 'add', index: -1, currentToken: null, index2: 0, newToken: witnessToken('beta')
    }]);

    expect(ctData.collationMatrix[0]).toEqual([0, 1]);
    expect(ctData.witnesses[0].tokens?.map(token => token.text)).toEqual(['beta', 'alpha']);
  });

  it('applies replacement and deletion changes to the edition witness', () => {
    const first = witnessToken('alpha');
    const second = witnessToken('beta');
    const ctData = editionCtData(first);
    ctData.witnesses[0].tokens?.push(second);
    ctData.collationMatrix[0].push(1);
    applyMainTextChangesToCtData(ctData, [
      {change: 'replace', index: 0, currentToken: first, index2: 0, newToken: witnessToken('gamma')},
      {change: 'delete', index: 1, currentToken: second}
    ]);

    expect(ctData.witnesses[0].tokens?.map(token => token.text)).toEqual(['gamma', '']);
    expect(ctData.collationMatrix[0]).toEqual([0, 1]);
  });
});