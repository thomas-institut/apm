/*
 *  Copyright (C) 2023 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */


import { Language } from '../../toolbox/Language'
import {Cookies} from '../../toolbox/Cookies'

const defaultLanguage = 'en'

const validLanguages = [ 'en', 'es', 'de', 'fr', 'it', 'he', 'ar']

const languageCookieName = 'apm_lang'

const strings = [
  { key: 'Loading data', es: 'Cargando datos'},
  { key: 'Dashboard', es: 'Tablero de mandos'},
  { key: 'Documents', es: 'Documentos'},
  { key: 'Users', es: 'Usuarios'},
  { key: 'Chunks', es: 'Chunks'},
  { key: 'Search', es: 'Búsqueda'},
  { key: 'My Profile', es: 'Mi perfil'},
  { key: 'My Settings', es: 'Mi configuración'},
  { key: 'Logout', es: 'Desconectar'},
  { key: 'None', es: 'Ninguna'},
  { key: 'Useful Links',  es: 'Enlaces útiles'},
  { key: 'Click to start a new multi-chunk edition', es: 'Click para crear una nueva edición de múltiples chunks'},
  { key: "Click to edit in new tab/window", es: 'Click para editar en nueva tab/ventana'},
  { key: "Click to view page in new tab/window", es: 'Click para ver en nueva tab/ventana'},
  { key: "Click to open document in new tab/window", es: 'Click para abrir documento en nueva tab/ventana'},
  { key: "Click to see chunk {{chunk}} in new tab/window", es: "Click para ver chunk {{chunk}} en nueva tab/ventana"},
  { key: 'Create new multi-chunk edition', es: 'Crear nueva edición de múltiples chunks'},
  { key: "Edit profile / Change Password", es: 'Editar perfil / Cambiar password'},
  { key: 'Collation Tables', es: 'Tablas de cotejo'},
  { key: 'Chunk Editions', es: 'Ediciones de un chunk'},
  { key: 'Multi-Chunk Editions', es: 'Ediciones de múltiples chunks'},
  { key: 'Transcriptions', es: 'Transcripciones'},
  { key: 'Admin', es: 'Administración'},
  { key: 'undefined', es: 'indefinido'},
  { key: 'Arabic', es: 'Árabe'},
  { key: 'Hebrew', es: 'Hebreo'},
  { key: 'Latin', es: 'Latín' },
  { key: 'Judeo Arabic', es: 'Judeoarábe'},
  { key: 'Hebrew Manuscript', es: 'Manuscrito en hebreo'},
  { key: 'Latin Manuscript', es: 'Manuscrito en latín'},
  { key: 'Arabic Manuscript', es: 'Manuscrito en árabe'},
  { key: 'Judeo Arabic Manuscript', es: 'Manuscrito en judeoárabe'},
  { key: 'Hebrew Print', es: 'Impresión en hebreo'},
  { key: 'Latin Print', es: 'Impresión en latín'},
  { key: 'Arabic Print', es: 'Impresión en árabe'},
  { key: 'Judeo Arabic Print', es: 'Impresión en judeoárabe'},
  { key: '{{num}} of {{total}} pages transcribed', es: '{{num}} de {{total}} páginas transcritas'},
  { key: 'Page Id', es: 'Id de página'},
  { key: 'Foliation', es: 'Foliación'},
  { key: 'Page Number', es: 'Número de página'},
  { key: 'Image Number', es: 'Número de imagen'},
  { key: 'Sequence Number', es: 'Número de secuencia'},
  { key: 'Columns Defined', es: 'Columnas definidas'},
  { key: 'Edit Transcription', es: 'Editar transcripción'},
  { key: 'Foliation not set, using sequence number', es: 'Foliación no definida, usando número de secuencia'}
]

export class SiteLang {
  /**
   * Sets the language to the used to look for translated strings
   * @param {string}lang Two letter code
   */
  static setLang(lang) {
    this.__languageStringManager.setLang(lang)
  }
  static t(template, data ={}) {
    return this.__languageStringManager.getTranslation(template, data)
  }

  static saveLangInCookie(lang) {
    Cookies.set(languageCookieName, lang, { SameSite: 'Strict'})
  }
  /**
   * Tries to detect the valid language the user prefers the most.
   * If none of the user languages is available, returns the default language.
   * @return {string}
   */
  static detectBrowserLanguage() {
    // First, let's see if there's a cookie
    let cookieLang = Cookies.get(languageCookieName)
    if (validLanguages.indexOf(cookieLang) !== -1) {
      console.log(`Site language detected in cookie`)
      return cookieLang
    }
    // If not, go over browser languages
    let browserLanguages = navigator.languages
    for (let i = 0; i < browserLanguages.length; i++) {
      let lang = browserLanguages[i]
      if (validLanguages.indexOf(lang) !== -1) {
        return lang
      }
      lang = lang.split('-')[0]  // two-letter code
      if (validLanguages.indexOf(lang) !== -1) {
        return lang
      }
    }
    console.log(`Site language not detected, returning default`)
    return defaultLanguage
  }

}

SiteLang.__languageStringManager = new Language(strings, validLanguages, defaultLanguage, defaultLanguage)

/**
 * Translates the given template to the system language
 * @param {string}template
 * @param {{}}data
 * @return {string}
 */
export function tr (template, data = {}) {
  return SiteLang.t(template, data)
}

/**
 * Sets the language to the used to look for translated strings
 * @param {string}lang
 */
export function setSiteLanguage(lang) {
  SiteLang.setLang(lang)
}