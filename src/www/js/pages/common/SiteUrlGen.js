
export var urlGen = new ApmUrlGenerator('')

/**
 *
 * @param {string}key
 * @param {string[]}args
 */
export function urlFor(key, ...args) {
  if (key === '') {
    console.warn(`Attempt to get a url for empty key`)
    return ''
  }

  if (urlGen[key] === undefined || typeof  urlGen[key] !== 'function') {
    console.warn(`Attempt to get a url for non-existent key: '${key}'`)
    return ''
  }
  return urlGen[key](...args)
}

export function setBaseUrl(baseUrl) {
  urlGen.setBase(baseUrl)
}