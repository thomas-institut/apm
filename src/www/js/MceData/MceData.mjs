

export class MceData {


  static createEmpty()  {
    return {
      chunks: [],
      chunkOrder: [],
      title:  'New Edition',
      initialSpace: '',
      preamble: [],
      witnesses: [],
      sigla: [],
      siglaGroups: [],
      lang: '',
      stylesheetId: '',
      archived: false,
      schemaVersion: '1.0'
    }
  }

  static isEmpty(mceData) {
    return mceData['chunks'].length === 0
  }

  static fix(mceData) {
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = mceData.chunks.map ( (c,i) => { return i})
    }
    return mceData
  }

}