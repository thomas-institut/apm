
export class SiglaGroup {
    siglum: string;
    witnesses: number[];

    matchWitnesses(witnessesToMatch: number[]): number[]

    static fromObject(obj: any): SiglaGroup
}