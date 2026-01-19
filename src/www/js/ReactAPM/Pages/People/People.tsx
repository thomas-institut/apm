import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {useContext, useEffect} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {varsAreEqual} from "@/toolbox/ObjectUtil";
import {
  createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import TableStateSummary from "@/ReactAPM/Components/TableStateSummary";
import {Form} from "react-bootstrap";
import {TablePaginationControls} from "@/ReactAPM/Components/TablePaginationControls";
import GridTable from "@/ReactAPM/Components/GridTable";
import './people.css';
import {useDataStore} from "@/ReactAPM/Stores/DataStore";

export interface PeopleTableItem {
  name: string;
  sortName: string;
  id: number;
  dateOfBirth: string;
  dateOfDeath: string;
  tags: string;
}


export default function People() {
  document.title = 'People';
  const appContext = useContext(AppContext);
  const data = useDataStore((state) => state.peopleTableData);
  const setData = useDataStore((state) => state.setPeopleTableData);
  const sorting = useDataStore((state) => state.peopleTableSortingState);
  const setSorting = useDataStore((state) => state.setPeopleTableSortingState);
  const pagination = useDataStore((state) => state.peopleTablePaginationState);
  const setPagination = useDataStore((state) => state.setPeopleTablePaginationState);

  const getPeopleData = async () => {
    const serverData = await appContext.apiClient.getAllPeopleData();
    return serverData.map((serverDataItem): PeopleTableItem => {
      let tags: string[] = [];
      if (serverDataItem.isUser) {
        tags.push('User');
      }
      return {
        name: serverDataItem.name,
        sortName: serverDataItem.sortName,
        id: serverDataItem.tid,
        dateOfBirth: serverDataItem.dateOfBirth || '',
        dateOfDeath: serverDataItem.dateOfDeath || '',
        tags: tags.join(', '),
      };
    });

  };

  const queryResult = useQuery<PeopleTableItem[]>({
    queryKey: ['docs'], queryFn: () => getPeopleData(),
  });

  useEffect(() => {
    if (queryResult.status === 'success') {

      if (varsAreEqual(data, queryResult.data)) {
        return;
      }
      console.log('Data changed, updating store');
      setData(queryResult.data);
    }
  }, [queryResult.status]);

  const columnHelper = createColumnHelper<PeopleTableItem>();

  const columns = [

    columnHelper.accessor('name', {
      cell: info => {
        return (<EntityLink id={info.row.original.id} type="person" name={info.getValue()}/>);
      }, header: 'Name',
    }),

    columnHelper.accessor('sortName', {
      cell: info => info.getValue(), header: 'Sort Name', enableSorting: true
    }),

    columnHelper.accessor('dateOfBirth', {
      cell: info => info.getValue(), header: 'Date of Birth', enableSorting: true
    }),

    columnHelper.accessor('dateOfDeath', {
      cell: info => info.getValue(), header: 'Date of Death', enableSorting: true
    }),

    columnHelper.accessor('tags', {
      cell: info => info.getValue(), header: 'Other Info', enableSorting: false
    }),];

  const table = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {sorting, pagination},
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    rowCount: data?.length ?? 0,
    debugTable: false,
    enableSortingRemoval: true,
    globalFilterFn: "includesString"
  });
  let content = null;
  let header = null;
  let queryStatusDiv = (<div></div>);

  if (data.length > 0) {
    header = (<div className="tableNavigationDiv"
                   style={{display: 'flex', justifyContent: 'space-between', alignItems: "center",}}>
      <div key="summary"><TableStateSummary table={table} rowNounPlural="persons"/></div>
      <div key="search"><Form.Control type="text" className="mb-3" placeholder="Filter name..."
                                      onChange={e => table.setGlobalFilter(e.target.value.trim())}/></div>
      <TablePaginationControls className="tableNavigationDiv" table={table} key="pagination"/>
    </div>);
    content = <GridTable table={table} tableId="peopleTable" key="table"
                         style={{margin: '1em', overflow: 'auto'}}
                         gridColumnDef={'1fr 1fr 1fr 1fr 0.5fr'}/>;
  }

  switch (queryResult.status) {
    case 'pending':
      queryStatusDiv = <div className="appearAfterOneSecond text-secondary">Checking for updated data...</div>;
      break;

    case 'error':
      if (data.length === 0) {
        content = <div className="text-danger">Error: {queryResult.error.message}</div>;
      } else {
        queryStatusDiv = <div className="text-danger">Error checking data, shown data may be out of date</div>;
      }
      break;
  }


  return (<NormalPageContainer>
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div style={{flexGrow: 0}} key="header">
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <h1>People</h1>
          {queryStatusDiv}
        </div>
        {header}
      </div>
      {content}

    </div>
  </NormalPageContainer>);
}