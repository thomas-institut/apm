


export class PdfDownloadUrl {

  static genGetPdfDownloadUrlForPreviewPanel(urlGenerator) {
    return (rawData) => {
      return new Promise( (resolve, reject) => {
        let apiUrl = urlGenerator.apiTypesetRaw()
        let dataJson = JSON.stringify(rawData)
        console.log(`About to make API call for PDF download url, data size is ${dataJson.length}`)
        console.log(`Calling typeset API at ${apiUrl}`)
        $.post(
          apiUrl,
          {data: JSON.stringify({
              jsonData: dataJson
            })}
        ).done(
          apiResponse => {
            console.log(`Got response from the server:`)
            console.log(apiResponse)
            if (apiResponse.url === undefined) {
              console.error('No url given by server')
              reject()
            }
            resolve(apiResponse.url)
          }
        ).fail (
          error => {
            console.error('PDF API error')
            console.log(error)
            reject()
          }
        )
      })
    }
  }

}