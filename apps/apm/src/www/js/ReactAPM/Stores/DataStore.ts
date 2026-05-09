import type {DocsTableItem} from "@/ReactAPM/Pages/Docs/Docs";
import type {PeopleTableItem} from "@/ReactAPM/Pages/People/People";
import type {WorksByAuthorData} from "@/ReactAPM/Pages/Works/Works";
import {create} from "zustand";
import type {PaginationState, SortingState} from "@tanstack/react-table";
import type {StatePropSetter} from "@/ReactAPM/Stores/Types";
import type {ApiUserMultiChunkEdition} from "@/Api/DataSchema/ApiUserMultiChunkEdition";
import type {ApiUserCollationTables} from "@/Api/DataSchema/ApiUserCollationTables";
import type {ApiUserTranscriptions} from "@/Api/DataSchema/ApiUserTranscriptions";


const DefaultDocsTableSorting: SortingState = [{desc: false, id: 'title'}];
const DefaultDocsTablePagination = {pageIndex: 0, pageSize: 50};

const DefaultPeopleTableSorting: SortingState = [{desc: false, id: 'sortName'}];
const DefaultPeopleTablePagination = {pageIndex: 0, pageSize: 50};



interface DataStore {
  docsTableData: DocsTableItem[];
  setDocsTableData: (data: DocsTableItem[]) => void;
  docsTableSortingState: SortingState;
  setDocsTableSortingState: StatePropSetter<SortingState>;
  docsTablePaginationState: PaginationState;
  setDocsTablePaginationState: StatePropSetter<PaginationState>;

  peopleTableData: PeopleTableItem[];
  setPeopleTableData: (data: PeopleTableItem[]) => void;
  peopleTableSortingState: SortingState;
  setPeopleTableSortingState: StatePropSetter<SortingState>;
  peopleTablePaginationState: PaginationState;
  setPeopleTablePaginationState: StatePropSetter<PaginationState>;

  worksByAuthorData: WorksByAuthorData[];
  setWorksByAuthorData: (data: WorksByAuthorData[]) => void;

  multiChunkEditionsForLoggedUser: ApiUserMultiChunkEdition[];
  setMultiChunkEditionsForLoggedUser: (data: ApiUserMultiChunkEdition[]) => void;

  collationTablesForLoggedUser: ApiUserCollationTables;
  setCollationTablesForLoggedUser: (data: ApiUserCollationTables) => void;

  transcriptionsForLoggedUser: ApiUserTranscriptions;
  setTranscriptionsForLoggedUser: (data: ApiUserTranscriptions) => void;
}


export const useDataStore = create<DataStore>()((set) => ({
  docsTableData: [],
  setDocsTableData: (data) => set({docsTableData: data}),
  docsTableSortingState: DefaultDocsTableSorting,
  docsTablePaginationState: DefaultDocsTablePagination,
  setDocsTableSortingState: (newSorting) => set((state) => ({
    docsTableSortingState: typeof newSorting === 'function' ? newSorting(state.docsTableSortingState) : newSorting
  })),
  setDocsTablePaginationState: (newPagination) => set((state) => ({
    docsTablePaginationState: typeof newPagination === 'function' ? newPagination(state.docsTablePaginationState) : newPagination
  })),

  peopleTableData: [],
  peopleTableSortingState: DefaultPeopleTableSorting,
  peopleTablePaginationState: DefaultPeopleTablePagination,
  setPeopleTableData: (data) => set({peopleTableData: data}),
  setPeopleTableSortingState: (newSorting) => set((state) => ({
    peopleTableSortingState: typeof newSorting === 'function' ? newSorting(state.peopleTableSortingState) : newSorting
  })),
  setPeopleTablePaginationState: (newPagination) => set((state) => ({
    peopleTablePaginationState: typeof newPagination === 'function' ? newPagination(state.peopleTablePaginationState) : newPagination
  })),

  worksByAuthorData: [],
  setWorksByAuthorData: (data) => set({worksByAuthorData: data}),

  multiChunkEditionsForLoggedUser: [],
  setMultiChunkEditionsForLoggedUser: (data) => set({multiChunkEditionsForLoggedUser: data}),

  collationTablesForLoggedUser: {
    tableInfo: [], workInfo: {}
  },
  setCollationTablesForLoggedUser: (data) => set({collationTablesForLoggedUser: data}),

  transcriptionsForLoggedUser: {
    docIds: [], docInfoArray: {}, pageInfoArray: []
  },
  setTranscriptionsForLoggedUser: (data) => set({transcriptionsForLoggedUser: data}),

}));