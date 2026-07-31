import {SiglaGroupInterface} from '@/CtData/CtDataInterface';

export function getSiglaGroupString(siglaGroup: SiglaGroupInterface, sigla: string[]): string {
  const witnessSigla = siglaGroup.witnesses.map((witnessIndex) => sigla[witnessIndex] ?? '').join('');
  return `${siglaGroup.siglum.trim()} => ${witnessSigla}`;
}