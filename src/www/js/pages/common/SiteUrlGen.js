/**
 *
 * Site-wide url generator
 *
 */


export var urlGen = new ApmUrlGenerator('')

export function setBaseUrl(baseUrl) {
  urlGen.setBase(baseUrl)
}