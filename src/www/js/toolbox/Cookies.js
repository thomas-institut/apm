
// Usage - Cookie.set(name, value [, options]):
// options supports all standard cookie options and adds "days":
//
//   path: '/' - any absolute path. Default: current document location,
//   domain: 'sub.example.com' - may not start with dot. Default: current host without subdomain.
//   secure: true - Only serve cookie over https. Default: false.
//   days: 2 - days till cookie expires. Default: End of session.
//   Alternative ways of setting expiration:
//      expires: 'Sun, 18 Feb 2018 16:23:42 GMT' - date of expiry as a GMT string.
//      Current date can be gotten with: new Date(Date.now()).toUTCString()
//      'max-age': 30 - same as days, but in seconds instead of days.

export class Cookies {

  static set(name, value, opts = {}) {
    /*If options contains days then we're configuring max-age*/
    if (opts.days) {
      opts['max-age'] = opts.days * 60 * 60 * 24;
      /*Deleting days from options to pass remaining opts to cookie settings*/
      delete opts.days
    }

    /*Configuring options to cookie standard by reducing each property*/
    opts = Object.entries(opts).reduce(
      (accumulatedStr, [k, v]) => `${accumulatedStr}; ${k}=${v}`, ''
    )
    /*Finally, creating the key*/
    document.cookie = name + '=' + encodeURIComponent(value) + opts
  }

  static get(name) {
    let c = document.cookie.match(`(?:(?:^|.*; *)${name} *= *([^;]*).*$)|^.*$`)[1]
    if (c) return decodeURIComponent(c)
  }

  static delete(name, opts) {
    this.set(name, '', {'max-age': -1, ...opts})
  }

}