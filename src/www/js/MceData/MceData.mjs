

export class MceData {


  static createEmpty()  {
    return {
      chunks: [],
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

}