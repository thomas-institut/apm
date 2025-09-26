
export interface SchemaInterface {
    type: number;
    context: string;
    sections: SectionSchema[];
}


export interface SectionSchema {
  type: 'Header' | 'VerticalList' | 'HorizontalList';
  predicates: PredicateDefinitionForSection[];
  title?: string;
  postDescriptionInfoStrings?: string[];
  preDescriptionInfoStrings?: string[];
}

export interface PredicateDefinitionForSection{
  id: number;
  label?: string | null;
  alwaysShow?: boolean;
  showUrl?: boolean;
  showLogo?: boolean;
  hideEvenIfActive?: boolean;
  isUniqueInSection?: boolean;
  multiLineInput?: boolean;
}