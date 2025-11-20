export interface QuillDelta {
  ops: QuillDeltaInsertOp[];
}

export interface QuillDeltaInsertOp {
  insert: string,
  attributes?: { [key: string]: any }
}

export interface QuillRange {
  index: number,
  length: number
}