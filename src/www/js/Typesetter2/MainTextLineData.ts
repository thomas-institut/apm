

export interface MainTextLineData {
    mainTextListIndex: number;
    lineData: LineNumberData[];
}


export interface LineNumberData {
    listIndex: number;
    lineNumber: number;
    y: number;
    lineNumberToShow?: number;
}