/**
 *
 * Site-wide url generator
 *
 */
import { ApmUrlGenerator } from '../../ApmUrlGenerator'

export var urlGen = new ApmUrlGenerator('')

export function setBaseUrl(baseUrl : string) {
  urlGen.setBase(baseUrl)
}