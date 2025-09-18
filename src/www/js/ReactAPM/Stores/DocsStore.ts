import { create } from 'zustand';
import {DocsTableItem} from "@/ReactAPM/Pages/Docs/Docs";
import {PaginationState, SortingState} from "@tanstack/react-table";

interface DocsStore {
  data: DocsTableItem[] | null;
  sorting: SortingState;
  pagination: PaginationState;
}

interface DocsActions {
  setData: (data: DocsTableItem[]) => void;
  setSorting: (sorting: SortingState) => void;
  setPagination: (pagination: PaginationState) => void;
}


export const useDocsStore = create<DocsStore & DocsActions>((set) => ({
  data: null,
  sorting: [{
    id: 'title', desc: false
  }],
  pagination: {
    pageIndex: 0,
    pageSize: 50,
  },
  setData: (data) => set({data: data}),
  setSorting: (sorting) => set({sorting: sorting}),
  setPagination: (pagination) => set({pagination: pagination}),
}));


