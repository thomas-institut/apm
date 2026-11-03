import {
  FmtText,
  getCleanFmtText,
  getNormalizedFmtText,
  getPlainText,
  fromString,
  newGlueToken,
  newMarkToken,
  MARK_TYPE_PARAGRAPH,
  TOKEN_TYPE_GLUE,
  TOKEN_TYPE_MARK
} from '@thomas-inst/fmt-text';
import {MainTextToken} from '@/Edition/MainTextToken';
import * as MainTextTokenType from '@/Edition/MainTextTokenType.js';
import {CtData} from '@/CtData/CtData';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {EditionWitnessTokenStringParser} from '@/toolbox/EditionWitnessTokenStringParser';
import {WitnessToken} from '@/Witness/WitnessToken';
import {EditionWitnessToken} from '@/Witness/EditionWitnessToken';
import * as WitnessTokenType from '@/Witness/WitnessTokenType';
import * as EditionWitnessParagraphStyle from '@/Witness/EditionWitnessParagraphStyle';
import {PARSER_NORMALIZER, COLLATION_EDITOR_AUTOMATIC} from '@/constants/NormalizationSource';
import {AsyncMyersDiff, ADD, DEL, KEEP} from '@/toolbox/MyersDiff/AysncMyersDiff';
import {EditCommand} from '@/toolbox/MyersDiff/MyersDiff';
import {TokenMatchScorer} from '@/Edition/TokenMatchScorer';
import {wait} from '@/toolbox/wait';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';

export interface MainTextEditChange {
  newToken?: WitnessTokenInterface;
  currentToken: WitnessTokenInterface | null;
  index: number;
  index2?: number;
  change: 'replace' | 'delete' | 'add';
}

const numberingLabelFmtTextClass = 'numberingLabel';
const activeDiffRun = new WeakMap<AsyncMyersDiff, Promise<void>>();
const diffRequestNumber = new WeakMap<AsyncMyersDiff, number>();

export function convertMainTextToFmtText(mainText: MainTextToken[]): FmtText {
  const fmtText: FmtText = [];

  mainText.forEach((token) => {
    switch (token.type) {
      case MainTextTokenType.GLUE:
        fmtText.push(newGlueToken());
        break;
      case MainTextTokenType.NUMBERING_LABEL:
        fmtText.push(...token.fmtText.map((fmtToken) => {
          const copy = deepCopy(fmtToken);
          if (copy.type === 'text') {
            copy.classList = numberingLabelFmtTextClass;
          }
          return copy;
        }));
        break;
      case MainTextTokenType.TEXT:
        fmtText.push(...getNormalizedFmtText(token.fmtText));
        break;
      case MainTextTokenType.PARAGRAPH_END:
        fmtText.push(newMarkToken(MARK_TYPE_PARAGRAPH, token.style));
        break;
    }
  });
  return getCleanFmtText(fmtText);
}

export function applyAutomaticNormalizationsToWitnessToken(
  token: WitnessToken,
  ctData: CtDataInterface,
  normalizerRegister: NormalizerRegister
): WitnessToken {
  if (token.tokenType !== WitnessTokenType.WORD || token.normalizedText !== '') {
    return token;
  }
  if (ctData.automaticNormalizationsApplied.length === 0) {
    return token;
  }

  const normalizedText = normalizerRegister.applyNormalizerList(ctData.automaticNormalizationsApplied, token.text);
  if (normalizedText === token.text) {
    return token;
  }
  // keep the token's class (deepCopy returns a plain object without WitnessToken methods)
  const normalizedToken: WitnessToken = Object.assign(Object.create(Object.getPrototypeOf(token)), deepCopy(token));
  normalizedToken.normalizedText = normalizedText;
  normalizedToken.normalizationSource = COLLATION_EDITOR_AUTOMATIC;
  return normalizedToken;
}

export function fmtTextToEditionWitnessTokens(
  fmtText: FmtText,
  lang: string,
  detectNumberingLabels: boolean,
  detectIntraWordQuotationMarks: boolean,
  editionWitnessTokenNormalizer: (token: WitnessToken) => WitnessToken = token => token
): WitnessToken[] {
  const attributesToCopy = ['fontWeight', 'fontStyle', 'fontSize', 'verticalAlign'];
  const witnessTokens: WitnessToken[] = [];

  fmtText.forEach((fmtTextToken) => {
    if (fmtTextToken.type === 'empty') {
      return;
    }
    if (fmtTextToken.type === TOKEN_TYPE_GLUE) {
      witnessTokens.push(new WitnessToken().setWhitespace());
      return;
    }
    if (fmtTextToken.type === TOKEN_TYPE_MARK) {
      if (fmtTextToken.markType === 'par') {
        const style = fmtTextToken.style || EditionWitnessParagraphStyle.NORMAL;
        witnessTokens.push(new EditionWitnessToken().setParagraphEnd(style));
      }
      return;
    }
    if (fmtTextToken.classList === numberingLabelFmtTextClass) {
      witnessTokens.push(new EditionWitnessToken().setNumberingLabel(fmtTextToken.text ?? ''));
      return;
    }

    const parsedTokens = EditionWitnessTokenStringParser.parse(
      fmtTextToken.text ?? '', lang, detectNumberingLabels, detectIntraWordQuotationMarks
    ).map((token) => {
      token.fmtText = fromString(token.text).map((tokenFmt) => {
        attributesToCopy.forEach((attribute) => {
          const value = (fmtTextToken as unknown as Record<string, unknown>)[attribute];
          if (value !== undefined && value !== '') {
            (tokenFmt as unknown as Record<string, unknown>)[attribute] = value;
          }
        });
        return tokenFmt;
      });
      return token;
    });
    witnessTokens.push(...parsedTokens);
  });

  const consolidatedTokens: WitnessToken[] = [];
  let tokensToConsolidate: WitnessToken[] = [];
  const flushTokensToConsolidate = () => {
    if (tokensToConsolidate.length === 0) {
      return;
    }
    const consolidatedToken = new WitnessToken();
    consolidatedToken.tokenType = tokensToConsolidate[0].tokenType;
    consolidatedToken.fmtText = tokensToConsolidate.flatMap(token => token.fmtText ?? fromString(token.text));
    consolidatedToken.text = getPlainText(consolidatedToken.fmtText);
    consolidatedTokens.push(consolidatedToken);
    tokensToConsolidate = [];
  };

  witnessTokens.forEach((token) => {
    if (token.tokenType === WitnessTokenType.WORD && token.normalizationSource !== PARSER_NORMALIZER) {
      tokensToConsolidate.push(token);
    } else {
      flushTokensToConsolidate();
      consolidatedTokens.push(token);
    }
  });
  flushTokensToConsolidate();

  return consolidatedTokens
    .filter(token => token.tokenType !== WitnessTokenType.EMPTY && token.tokenType !== WitnessTokenType.WHITESPACE)
    .map((token) => {
      token.tokenClass = 'edition';
      return token.normalizationSource === PARSER_NORMALIZER ? token : editionWitnessTokenNormalizer(token);
    })
    .map((token) => {
      if (token.fmtText?.length === 1) {
        const fmtToken = token.fmtText[0] as unknown as Record<string, unknown>;
        if (attributesToCopy.every(attribute => fmtToken[attribute] === undefined || fmtToken[attribute] === '')) {
          delete token.fmtText;
        }
      }
      return token;
    });
}

export async function getEditScript(
  diffEngine: AsyncMyersDiff,
  oldTokens: WitnessTokenInterface[],
  newTokens: WitnessTokenInterface[]
): Promise<EditCommand[] | null> {
  const request = (diffRequestNumber.get(diffEngine) ?? 0) + 1;
  diffRequestNumber.set(diffEngine, request);
  if (diffEngine.isRunning()) {
    diffEngine.abort();
  }

  const previousRun = activeDiffRun.get(diffEngine) ?? Promise.resolve();
  const run = previousRun.then(async () => {
    if (diffRequestNumber.get(diffEngine) !== request) {
      return null;
    }
    while (diffEngine.isRunning()) {
      diffEngine.abort();
      await wait(5);
    }
    if (diffRequestNumber.get(diffEngine) !== request) {
      return null;
    }
    if (oldTokens.length === 0) {
      return newTokens.map((_token, index) => ({index, command: ADD, seq: index}));
    }
    if (newTokens.length === 0) {
      return oldTokens.map((_token, index) => ({index, command: DEL, seq: -1}));
    }

    const attributesToCompare = ['fontWeight', 'fontStyle'];
    return diffEngine.calculate(oldTokens, newTokens, (a, b) => {
      if (a.tokenType !== b.tokenType) {
        return false;
      }
      if (a.tokenType === WitnessTokenType.FORMAT_MARK) {
        return a.markType === b.markType && a.style === b.style &&
          arraysAreEqual(a.formats ?? [], b.formats ?? []);
      }
      if (a.text !== b.text || (a.tokenType === WitnessTokenType.WORD &&
        (a.normalizedText ?? '') !== (b.normalizedText ?? ''))) {
        return false;
      }
      if (a.fmtText === undefined || b.fmtText === undefined) {
        return a.fmtText === undefined && b.fmtText === undefined;
      }
      return arraysAreEqual(a.fmtText, b.fmtText, (left, right) => attributesToCompare.every((attribute) => {
        const leftValue = (left as Record<string, unknown>)[attribute] ?? '';
        const rightValue = (right as Record<string, unknown>)[attribute] ?? '';
        return leftValue === rightValue;
      }));
    });
  });
  const finishedRun = run.then(() => undefined, () => undefined);
  activeDiffRun.set(diffEngine, finishedRun);
  try {
    return await run;
  } finally {
    if (activeDiffRun.get(diffEngine) === finishedRun) {
      activeDiffRun.delete(diffEngine);
    }
  }
}

export function getChangeList(
  oldTokens: WitnessTokenInterface[],
  newTokens: WitnessTokenInterface[],
  editScript: EditCommand[]
): MainTextEditChange[] {
  const changeList: MainTextEditChange[] = [];
  const tokenMatchScorer = new TokenMatchScorer();
  let lastKeptOrReplaced = -1;
  let i = 0;

  const addChange = (index: number, newToken: WitnessTokenInterface, index2: number) => {
    changeList.push({
      change: 'add', index, currentToken: index >= 0 ? oldTokens[index] : null, index2, newToken
    });
  };

  while (i < editScript.length) {
    const command = editScript[i];
    if (command.command === KEEP) {
      lastKeptOrReplaced = command.index;
      i++;
      continue;
    }
    if (command.command === ADD) {
      const newToken = newTokens[command.seq];
      if (newToken !== undefined) {
        addChange(lastKeptOrReplaced, newToken, command.seq);
      }
      i++;
      continue;
    }

    const deleted: number[] = [];
    const added: number[] = [];
    while (i < editScript.length && editScript[i].command !== KEEP) {
      if (editScript[i].command === DEL) {
        deleted.push(editScript[i].index);
      } else if (editScript[i].command === ADD) {
        added.push(editScript[i].seq);
      }
      i++;
    }

    deleted.forEach((deleteIndex) => {
      const deletedToken = oldTokens[deleteIndex];
      let bestMatch = -1;
      let bestScore = -1;
      added.forEach((sequenceIndex, addIndex) => {
        const score = tokenMatchScorer.getMatchScore(deletedToken, newTokens[sequenceIndex]);
        if (score > bestScore) {
          bestMatch = addIndex;
          bestScore = score;
        }
      });

      if (bestMatch === -1) {
        changeList.push({
          change: 'delete', index: deletedToken.originalIndex ?? -1, currentToken: deletedToken
        });
        return;
      }

      for (let addIndex = 0; addIndex < bestMatch; addIndex++) {
        const sequenceIndex = added.shift();
        if (sequenceIndex !== undefined) {
          addChange(lastKeptOrReplaced, newTokens[sequenceIndex], sequenceIndex);
        }
      }
      const sequenceIndex = added.shift();
      if (sequenceIndex !== undefined) {
        changeList.push({
          change: 'replace', index: deletedToken.originalIndex ?? -1, currentToken: deletedToken,
          index2: sequenceIndex, newToken: newTokens[sequenceIndex]
        });
        lastKeptOrReplaced = deleteIndex;
      }
    });

    added.forEach((sequenceIndex) => {
      addChange(lastKeptOrReplaced, newTokens[sequenceIndex], sequenceIndex);
    });
  }

  return changeList.map((change) => {
    if (change.index !== -1) {
      change.index = change.currentToken?.originalIndex ?? -1;
    }
    return change;
  });
}

export async function calculateMainTextChanges(
  diffEngine: AsyncMyersDiff,
  currentTokens: WitnessTokenInterface[],
  newTokens: WitnessTokenInterface[]
): Promise<MainTextEditChange[] | null> {
  await wait(1);
  const workingCurrentTokens = deepCopy(currentTokens)
    .map((token, index) => ({...token, originalIndex: index}))
    .filter(token => token.tokenType !== WitnessTokenType.EMPTY);
  const editScript = await getEditScript(diffEngine, workingCurrentTokens, newTokens);
  return editScript === null ? null : getChangeList(workingCurrentTokens, newTokens, editScript);
}

export function applyMainTextChangesToCtData(
  ctData: CtDataInterface,
  changes: MainTextEditChange[]
): CtDataInterface {
  if (ctData.type !== 'edition') {
    throw new Error('Main text changes can only be applied to an edition collation table');
  }
  const editionWitness = ctData.witnesses[ctData.editionWitnessIndex];
  if (editionWitness?.tokens === undefined) {
    throw new Error('Edition witness has no tokens');
  }

  let columnsAdded = 0;
  changes.forEach((change) => {
    const tokenIndex = change.index + columnsAdded;
    switch (change.change) {
      case 'replace':
        if (change.newToken === undefined) {
          throw new Error('Replacement is missing its new token');
        }
        editionWitness.tokens[tokenIndex] = deepCopy(change.newToken);
        break;
      case 'delete':
        editionWitness.tokens[tokenIndex] = {tokenClass: 'edition', tokenType: WitnessTokenType.EMPTY, text: ''};
        break;
      case 'add':
        if (change.newToken === undefined) {
          throw new Error('Addition is missing its new token');
        }
        CtData.insertColumnsAfter(ctData, tokenIndex, 1);
        columnsAdded++;
        editionWitness.tokens[tokenIndex + 1] = deepCopy(change.newToken);
        break;
    }
  });
  return ctData;
}

/**
 * Converts a token produced from the editor's text into plain CT data.
 *
 * A plain data copy is used instead of getCtDataObject(), which discards the token's fmtText
 * and requires the token to be an actual WitnessToken instance.
 */
export function witnessTokenFromEditor(token: WitnessToken): WitnessTokenInterface {
  return deepCopy(token) as WitnessTokenInterface;
}

function arraysAreEqual<T>(a: T[], b: T[], equal: (left: T, right: T) => boolean = (left, right) => left === right): boolean {
  return a.length === b.length && a.every((value, index) => equal(value, b[index]));
}