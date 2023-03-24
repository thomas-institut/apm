
export class ApiHelper {

  /**
   *
   * @param {string}apmBaseUrl
   * @param {string}origin
   */
  constructor (apmBaseUrl, origin) {
    this.apmBaseurl = apmBaseUrl
    this.origin = origin
  }

  getAllUsers() {
    return this.__get(`${this.apmBaseurl}/api/users/all`)
  }



  /**
   *
   * @param {string}user
   * @param {string}pwd
   * @param withCredentials
   */
  login(user, pwd, withCredentials) {
    return this.__post(`${this.apmBaseurl}/api/app/login`, {user: user, pwd: pwd}, withCredentials)
  }


  async __post(url, data, withCredentials = true, postWithJson = false) {
    const contentType =  postWithJson ? "application/json" : 'application/x-www-form-urlencoded'
    const body = postWithJson ? JSON.stringify(data) : (new URLSearchParams(data)).toString()

    let fetchInit = {
      method: "POST",
      headers: {
        "Content-Type" : contentType,
      },
      body: body
    }
    if (withCredentials) {
      fetchInit.credentials = "include"
    }
    if (this.origin !== '') {
      fetchInit.headers["Origin"] = this.origin
    }
    return await fetch(url, fetchInit)
  }

  async __get(url, withCredentials = true) {
    let fetchInit = {
      method: "GET",
      headers: {
      }
    }
    if (withCredentials) {
      fetchInit.credentials = "include"
    }
    if (this.origin !== '') {
      fetchInit.headers["Origin"] = this.origin
    }
    let response = await fetch(url, fetchInit)
    return await response.json()
  }

}