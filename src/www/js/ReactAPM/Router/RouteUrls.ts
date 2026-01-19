import {Tid} from "@/Tid/Tid";

let baseUrl = '';
let betaPathInfix = 'beta';

export class RouteUrls {

  static setBaseUrl(url: string) {
    baseUrl = url;
    if (baseUrl === '') {
      betaPathInfix = '/' + betaPathInfix;
    }
  }

  static home() {
    return baseUrl;
  }
  static homeWithTrailingSlash() {
    return baseUrl + '/';
  }

  static dashboard() {
    return baseUrl + '/dashboard';
  }

  static docs() {
    return baseUrl + '/documents';
  }

  static search() {
    return baseUrl + betaPathInfix + '/search';
  }

  static works() {
    return baseUrl + '/works';
  }

  static people() {
    return baseUrl + '/people';
  }

  static login() {
    return baseUrl + '/login';
  }

  static logout() {
    return baseUrl + '/logout';
  }

  static patternPerson() {
    return baseUrl + betaPathInfix + '/person/:id';
  }

  static person(id: number|string) {
    return baseUrl + betaPathInfix + '/person/' + id;
  }

  static patternCollationTable() {
     return baseUrl + betaPathInfix + '/collationTable/:id';
  }

  static collationTable(id: number) {
    return baseUrl + betaPathInfix + '/collationTable/' + id;
  }

  static patternSingleChunkEdition() {
    return baseUrl + betaPathInfix + '/edition/:id';
  }

  static singleChunkEdition(id: number|string) {
    return baseUrl + betaPathInfix + '/edition/' + id;
  }

  static patternMultiChunkEdition() {
    return baseUrl + betaPathInfix + '/multiChunkEdition/:id';
  }

  static multiChunkEdition(id: number | 'new') {
    return baseUrl + betaPathInfix +  '/multiChunkEdition/' + id;
  }


  static patternWork() {
    return baseUrl + betaPathInfix + '/work/:workId';
  }

  static work(id: number|string) {
    return baseUrl + betaPathInfix + '/work/' + id;
  }

  static patternDocument() {
    return baseUrl + betaPathInfix +  '/doc/:id/*';
  }

  static document(id: number|string) {
    return baseUrl + '/doc/' + id;
  }

  static docPage(id: number|string, page: number) {
    return baseUrl + '/doc/' + id + '/page/' + page + '/view';
  }

  static patternChunk() {
    return baseUrl + '/work/:workId/chunk/:chunkId';
  }



  static chunk(workId: number|string, chunkId: number) {
    if(typeof workId === 'number') {
      workId = Tid.toCanonicalString(workId);
    }

    return baseUrl + '/work/' + workId + '/chunk/' + chunkId;
  }


}