/**
 *
 * Site-wide url generator
 *
 */
import { ApmUrlGenerator } from '@/ApmUrlGenerator'

export var urlGen = new ApmUrlGenerator('')

export function setBaseUrl(baseUrl : string, apiUrl = '') {
  urlGen.setBase(baseUrl, apiUrl)
}