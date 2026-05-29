
export interface PersonEssentialData {
  tid: number;
   name: string;
   sortName: string;
   extraAttributes: any[];
   userName: string;
   userTags: string[];
   isUser: boolean;
   userEmailAddress: string;
}


export interface AllPeopleDataForPeoplePageItem {
  tid: number
  name: string
  sortName: string
  dateOfBirth: string | null
  dateOfDeath: string | null
  isUser: boolean
  mergedInto: number | null
}