

export class MceData {

  /**
   *
   * @return {MceDataInterface}
   */
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
      schemaVersion: '1.0',
      includeInAutoMarginalFoliation: []
    }
  }

  /**
   *
   * @param {MceDataInterface}mceData
   * @return {boolean}
   */
  static isEmpty(mceData) {
    return mceData['chunks'].length === 0
  }

  /**
   *
   * @param {MceDataInterface}mceData
   * @return {MceDataInterface}
   */
  static fix(mceData) {
    if (mceData.chunkOrder === undefined) {
      mceData.chunkOrder = mceData.chunks.map ( (c,i) => { return i})
    }
    if (mceData.includeInAutoMarginalFoliation === undefined) {
      mceData.includeInAutoMarginalFoliation = [];
    }
    return mceData
  }

}