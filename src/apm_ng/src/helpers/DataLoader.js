
export const STATE_NOT_LOADED = 'not_loaded'
export const STATE_LOADING = 'loading'
export const STATE_LOADED = 'loaded'
export const STATE_ERROR = 'error'
export class DataLoader {
  /**
   *
   * @param {function()}fetchData
   */
  constructor (fetchData) {

    this.fetchData = fetchData
    this.reset()
  }

  reset() {
    this.data = null
    this.state = STATE_NOT_LOADED
    this.error = ''
  }
  doFetch() {
    return new Promise( (resolve) => {
      this.state = STATE_LOADING
      this.fetchData().then( (data) => {
        this.data = data
        this.state = STATE_LOADED
        resolve (this.state)
      }).catch( (e) => {
        this.state = STATE_ERROR
        this.error = e
        resolve(this.state)
      })
    })
  }

}