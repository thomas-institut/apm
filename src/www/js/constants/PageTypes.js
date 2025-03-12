import * as Entity from './Entity'

export const PageTypes = [
  { id: Entity.PageTypeNotSet, name: 'NotSet' },
  { id: Entity.PageTypeText, name: 'Text' },
  { id: Entity.PageTypeFrontMatter, name: 'Front Matter' },
  { id: Entity.PageTypeBackMatter, name: 'Back Matter' },
];

export function getPageTypes() {
  return PageTypes.map( (pageType) => {return pageType.id});
}

export function getPageTypeName(id) {
  for (let i= 0; i < PageTypes.length; i++) {
    if (PageTypes[i].id === id) {
      return PageTypes[i].name;
    }
  }
  return 'N/A';
}