export function uniq(theArray: any[]): [];
export function swapElements(theArray:any[], index1: number, index2:number);
export function arraysAreEqual(array1:any[], array2: any[], comparisonFunction: (a:any,b:any) => number, depth= 1);
export function varsAreEqual(var1:any, var2:any): boolean
export function arraysHaveTheSameValues(array1:any[], array2: any[]): boolean;
export function prettyPrintArray(array: any[]): string;
export function shuffleArray(array:any[]): array;
export function createSequenceArray(from:number, to:number, increment = 1): number[];
export function createIndexArray(size:number):number[]
export function flatten(theArray:any[]): any[];
export function numericSort(theArray: number[], asc = true): number[];
export function numericFieldSort(theArray: any[], fieldName:string, asc= true): any[];
export function stringFieldSort(theArray: any, fieldName: string, asc = true): any[]
export function pushArray(theArray: any[], arrayToPush: any[]): any[];
export function joinWithArray(sourceArray: any[], separator: any):any[];
export function maxValue(theArray: number[]):number;
export function makeCopyOfArray(someArray: any[]): any[];
export function allTrue(someArray: boolean[]): boolean;