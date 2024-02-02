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

export const defaultLanguage = 'en'

export const validLanguages = [ 'en', 'es', 'de', 'fr', 'it', 'he', 'ar']


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
  { key: 'Foliation not set, using sequence number', es: 'Foliación no definida, usando número de secuencia'},
  { key: 'Image Links', es: "Enlaces de imágenes"},
  { key: 'Click to open in new tab/window', es: 'Click para abrir en nueva tab/ventana'},
  { key: 'Page Type', es: 'Tipo de página'},
  { key: 'Works', es: 'Obras'},
  { key: 'Click to show chunk list', es: 'Click para mostrar lista de chunks'},
  { key: 'People', es: 'Personas'},
  { key: 'Name', es: 'Nombre'},
  { key: 'User', es: 'Usuario'},
  { key: 'Person Details', es: 'Datos personales'},
  { key: 'Click to see person details', es: 'Click para ver datos de la persona'},
  { key: 'Entity ID', es: 'Id de entidad'},
  { key: 'Sort Name', es: 'Nombre para ordenamiento'},
  { key: 'User Contributions', en: 'User Contributions', es: 'Contribuciones como usuario'},
  { key: 'UserContributions:None', en: 'None', es: 'Ninguna'},
  { key: 'Processing', es: 'Procesando'},
  { key: 'Empty Table', es: 'Tabla vacía'},
  { key: 'First', es: 'Primero'},
  { key: 'Previous', es: 'Anterior'},
  { key: 'Next', es: 'Siguiente'},
  { key: 'Last', es: 'Último'},
  { key: 'DataTables:Search', en: 'Search:', es: 'Buscar:'},
  { key: 'Show _MENU_ entries', es: 'Mostar _MENU_ filas'},
  { key: 'Showing _START_ to _END_ of _TOTAL_ rows', es: 'Mostrando filas _START_ a _END_ de _TOTAL_'},
  { key: 'Title', es: 'Título'},
  { key: 'Type', es: 'Tipo'},
  { key: 'Language', es: 'Idioma'},
  { key: 'Pages', es: 'Páginas'},
  { key: 'Pages:Transcribed', en: 'Transcribed', es: 'Transcritas'},
  { key: 'Transcribers', es: 'Transcriptores'},
  { key: 'Create New Document', es: 'Crear nuevo documento'},

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

  /**
   * Saves the language
   * @param {string}lang
   * @param {WebStorageKeyCache} cache
   *
   */


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