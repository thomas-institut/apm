import {Tid} from "@/Tid/Tid";

let baseUrl = '/';

export class RouteUrls {

  static setBaseUrl(url: string) {
    baseUrl = url;
  }

  static home() {
    return baseUrl + '/';
  }

  static docs() {
    return baseUrl + '/docs';
  }

  static search() {
    return baseUrl + '/search';
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

  static patternPerson() {
    return baseUrl + '/person/:id';
  }

  static person(id: number|string) {
    return baseUrl + '/person/' + id;
  }

  static patternCollationTable() {
     return baseUrl + '/collationTable/:id';
  }

  static collationTable(id: number) {
    return baseUrl + '/collationTable/' + id;
  }

  static patternSingleChunkEdition() {
    return baseUrl + '/edition/:id';
  }

  static singleChunkEdition(id: number|string) {
    return baseUrl + '/edition/' + id;
  }

  static patternMultiChunkEdition() {
    return baseUrl + '/multiChunkEdition/:id';
  }

  static multiChunkEdition(id: number | 'new') {
    return baseUrl + '/multiChunkEdition/' + id;
  }


  static patternWork() {
    return baseUrl + '/work/:workId';
  }

  static work(id: number|string) {
    return baseUrl + '/work/' + id;
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