import NormalPageContainer from "../../NormalPageContainer";
import {useContext, useEffect} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {DocumentData} from "@/Api/DataSchema/ApiDocuments";
import {
  createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table";
import './docs.css';
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {TablePaginationControls} from "@/ReactAPM/Components/TablePaginationControls";
import TableStateSummary from "@/ReactAPM/Components/TableStateSummary";
import GridTable from "@/ReactAPM/Components/GridTable";
import {Col, Form, Row} from "react-bootstrap";
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
  document.title = 'Documents';
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

  useEffect(() => {
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
      }, header: 'Title', filterFn: "includesString"
    }),

    columnHelper.accessor('lang', {
      cell: info => info.getValue(), header: 'Language', enableSorting: false, filterFn: "equalsString"
    }),

    columnHelper.accessor('type', {
      cell: info => info.getValue(), header: 'Type', enableSorting: false, filterFn: "equalsString"
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
    })];

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
                   style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: "center"}}>
      <div key="summary" style={{width: '30em'}}>
        <TableStateSummary table={table} rowNounPlural="documents"/>
      </div>
      <div key="searchTitle" style={{width: '50em'}}>
        <Form>
          <Row>
            <Col xl={6}>
              <Form.Control type="text" className="formControlNormalText" placeholder="Filter title..."
                            onChange={e => table.getColumn('title')?.setFilterValue(e.target.value.trim())}/>
            </Col>
            <Col>
              <Form.Select className="formControlNormalText" aria-label="Select Type"
                           onChange={e => table.getColumn('lang')?.setFilterValue(e.target.value)}>
                <option value="">Any Language</option>
                <option value="Arabic">Arabic</option>
                <option value="Hebrew">Hebrew</option>
                <option value="Latin">Latin</option>
                <option value="Judeo Arabic">Judeo Arabic</option>
              </Form.Select>
            </Col>
            <Col>
              <Form.Select className="formControlNormalText" aria-label="Select Type"
                           onChange={e => table.getColumn('type')?.setFilterValue(e.target.value)}>
                <option value="">Any Type</option>
                <option value="Manuscript">Manuscripts</option>
                <option value="Print">Prints</option>
              </Form.Select>
            </Col>
          </Row>
        </Form>
      </div>
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


