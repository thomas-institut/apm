

export function doNothing(): void;
export function returnEmptyString(): string;
export function doNothingPromise(msg: string = '') : Promise<void>;
export function failPromise(msg : string = '', reason : string = 'no reason') : Promise<string>;
export function wait(milliseconds : number) : Promise<void>;