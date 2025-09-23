import NormalPageContainer from "../../NormalPageContainer";
import {useContext, useEffect} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {DocumentData} from "@/Api/DataSchema/ApiDocumentsAllDocumentsData";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import './docs.css';
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {TablePaginationControls} from "@/ReactAPM/Components/TablePaginationControls";
import TableStateSummary from "@/ReactAPM/Components/TableStateSummary";
import GridTable from "@/ReactAPM/Components/GridTable";
import {Form} from "react-bootstrap";
import {EntityNameTuple} from "@/Api/ApmApiClient";
import {varsAreEqual} from "@/toolbox/ObjectUtil";
import {useDataStore} from "@/ReactAPM/Stores/DataStore";


export interface DocsTableItem {
  id: number;
  title: string;
  type: string;
  lang: string;
  numPages: number;
  numTranscribedPages: number;
  transcribers: number[];
}

export default function Docs() {
  document.title = 'Documents (beta)';
  const appContext = useContext(AppContext);
  const data = useDataStore((state) => state.docsTableData);
  const setData = useDataStore((state) => state.setDocsTableData);
  const sorting = useDataStore((state) => state.docsTableSortingState);
  const setSorting = useDataStore((state) => state.setDocsTableSortingState);
  const pagination = useDataStore((state) => state.docsTablePaginationState);
  const setPagination = useDataStore((state) => state.setDocsTablePaginationState);

  const getDataForTable = (data: DocumentData[], docTypes: EntityNameTuple[], languages: EntityNameTuple[]): DocsTableItem[] => {
    const dataTableEntries: DocsTableItem[] = [];

    const getTypeName = (typeId: number) => {
      return docTypes.find(t => t[0] === typeId)?.[1] ?? 'unknown';
    };

    const getLanguageName = (langId: number) => {
      return languages.find(l => l[0] === langId)?.[1] ?? 'unknown';
    };

    for (const doc of data) {
      dataTableEntries.push({
        id: doc.docInfo.id,
        title: doc.docInfo.title,
        type: getTypeName(doc.docInfo.doc_type),
        lang: getLanguageName(doc.docInfo.lang),
        numPages: doc.numPages,
        numTranscribedPages: doc.numTranscribedPages,
        transcribers: doc.transcribers
      });
    }

    return dataTableEntries.sort((a, b) => a.title.localeCompare(b.title));
  };

  const getDocData = async () => {
    const data = await appContext.apiClient.documentAllDocuments();
    const docTypes = await appContext.apiClient.getAvailableDocumentTypes();
    const languages = await appContext.apiClient.getAvailableLanguages();
    return getDataForTable(data, docTypes, languages);
  };

  const queryResult = useQuery<DocsTableItem[]>({
    queryKey: ['docs'], queryFn: () => getDocData(),
  });

  useEffect( () => {
    if (queryResult.status === 'success') {

      if (varsAreEqual(data, queryResult.data)) {
        return;
      }
      console.log('Data changed, updating store');
      setData(queryResult.data);
    }
  }, [queryResult.status]);


  const columnHelper = createColumnHelper<DocsTableItem>();
  const columns = [

    columnHelper.accessor('title', {
      cell: info => {
        return (<EntityLink id={info.row.original.id} type="document" name={info.getValue()}/>);
      }, header: 'Title',
    }),

    columnHelper.accessor('lang', {
      cell: info => info.getValue(), header: 'Language', enableSorting: false
    }),

    columnHelper.accessor('type', {
      cell: info => info.getValue(), header: 'Type', enableSorting: false
    }),

    columnHelper.accessor('numPages', {
      cell: info => info.getValue(), header: 'Pages', enableGlobalFilter: false,
    }),

    columnHelper.accessor('numTranscribedPages', {
      cell: info => info.getValue(), header: 'Transcribed', enableGlobalFilter: false,
    }),

    columnHelper.accessor('transcribers', {
      cell: info => {
        const transcribers = info.getValue();
        const links = transcribers.map(t => (<EntityLink key={'transcriber-' + t} id={t}/>));
        let linksWithSeparator: any[] = [];
        for (let i = 0; i < links.length; i++) {
          linksWithSeparator.push(links[i]);
          if (i < links.length - 1) {
            linksWithSeparator.push(<span key={i}>, </span>);
          }
        }
        return (<>
          {linksWithSeparator}
        </>);
      }, header: 'Transcribers', enableSorting: false, enableGlobalFilter: true,
    })
  ];

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
    enableSortingRemoval: false,
    globalFilterFn: "includesString"
  });

  let content = null;
  let header = null;
  let queryStatusDiv = (<div></div>);

  if (data.length > 0) {
    header = (<div className="tableNavigationDiv"
                   style={{display: 'flex', justifyContent: 'space-between', alignItems: "center",}}>
      <div key="summary"><TableStateSummary table={table} rowNounPlural="documents"/></div>
      <div key="search"><Form.Control type="text" className="mb-3" placeholder="Filter title..."
                                      onChange={e => table.setGlobalFilter(e.target.value.trim())}/></div>
      <TablePaginationControls className="tableNavigationDiv" table={table} key="pagination"/>
    </div>);
    content = <GridTable table={table} tableId="docsTable" key="table"
                         style={{margin: '1em', overflow: 'auto'}}
                         gridColumnDef={'1fr max-content max-content max-content max-content 1fr'}/>;
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
          <h1>Documents</h1>
          {queryStatusDiv}
        </div>
        {header}
      </div>
      {content}

    </div>
  </NormalPageContainer>);
}


