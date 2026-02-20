import {WitnessInfo} from "@/Api/DataSchema/WitnessInfo";
import {EntityNameTuple} from "@/Api/ApmApiClient";
import {JSX, useContext, useMemo, useState} from "react";
import {
  createColumnHelper, getCoreRowModel, getSortedRowModel, SortingState, useReactTable
} from "@tanstack/react-table";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import GridTable from "@/ReactAPM/Components/GridTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {ExclamationTriangle} from "react-bootstrap-icons";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {PageInfo} from "@/Api/DataSchema/ApiDocuments";

interface WitnessTableProps {
  witnessInfoData: WitnessInfo[];
  languages: EntityNameTuple[];
  docTypes: EntityNameTuple[];
}

interface WitnessTableItem {
  witnessInfo: WitnessInfo;
  title: string;
  type: string;
  docId: number;
  docType: string;
  language: string;
  pages: JSX.Element| JSX.Element[];
  lastChange: string;
  lastTranscriber: number,
  info: JSX.Element;
  actions: JSX.Element;
}


export default function WitnessTable(props: WitnessTableProps) {

  console.log('Witnesses', props.witnessInfoData);
  const context = useContext(AppContext);
  const [sorting, setSorting] = useState<SortingState>([{id: 'title', desc: false}]);

  const pageIds = useMemo( () => {
    const pageIds: number[] = [];
    function addPageId(pageId: number) {
      if (pageId === 0) {
        return;
      }
      if (pageIds.includes(pageId)) {
        return;
      }
      pageIds.push(pageId);
    }

    props.witnessInfoData.forEach(w => {
      if (w.type === 'fullTx') {
        Object.keys(w.typeSpecificInfo.segments).forEach((segmentIndex) => {
          const segment = w.typeSpecificInfo.segments[parseInt(segmentIndex)];
          addPageId(segment.start.pageId);
          addPageId(segment.end.pageId);
        });
      }
    });
    return pageIds;
  }, [props.witnessInfoData]);

  const getPageInfo = async () => {
    return await Promise.all(pageIds.map(async (pageId) => context.apiClient.getPageInfo(pageId)));
  };

  const pagesInfoQuery= useQuery({queryKey: ['pageInfoArray', props.witnessInfoData ], queryFn: getPageInfo});

  const getPagesCell = (w: WitnessInfo, pageInfoArray: PageInfo[]) => {

    function getPageInfoForPageId(pageId: number) {
      return pageInfoArray.find(p => p.pageId === pageId) ?? null;
    }

    if (w.type !== 'fullTx') {
      return <span>N/A</span>;
    }

    const segmentIndices = Object.keys(w.typeSpecificInfo.segments).map( k => parseInt(k)).sort( (a, b) => a-b);
    return segmentIndices.map(segmentIndex => {
      const segment = w.typeSpecificInfo.segments[segmentIndex];
      const startPageInfo = getPageInfoForPageId(segment.start.pageId);
      const endPageInfo = getPageInfoForPageId(segment.end.pageId);

      let startPage = '???'
      let endPage = '???'
      if (startPageInfo !== null){
        startPage = startPageInfo.foliation
      }
      if (endPageInfo !== null){
        endPage = endPageInfo.foliation
      }
      return <span key={segmentIndex}>{startPage}-{endPage} </span>;
    })
}

  const columnHelper = createColumnHelper<WitnessTableItem>();
  const columns = useMemo(() => [

    columnHelper.accessor('title', {
      cell: info => {
        return <EntityLink id={info.row.original.docId} type="document" name={info.getValue()}/>;
      }, header: 'Title', enableSorting: true
    }),

    columnHelper.accessor('type', {
      cell: info => info.getValue(), header: 'Witness Type', enableSorting: false
    }),

    columnHelper.accessor('docType', {
      cell: info => info.getValue(), header: 'Doc Type', enableSorting: true
    }),

    columnHelper.accessor('language', {
      cell: info => info.getValue(), header: 'Language', enableGlobalFilter: false,
    }),

    columnHelper.accessor('pages', {
      cell: info => info.getValue(), header: 'Pages', enableGlobalFilter: false, enableSorting: false,
    }),

    columnHelper.accessor('lastChange', {
      cell: info => {
        const lastChangeString = info.getValue();
        if (lastChangeString === '') {
          return '???';
        }
        return ApmFormats.timeString(info.getValue());
      }, header: 'Last Change', enableGlobalFilter: false, enableSorting: true
    }),

    columnHelper.accessor('lastTranscriber', {
      cell: info => {
        const id = info.getValue();
        if (id === -1) {
          return <span>???</span>;
        }
        return <EntityLink id={info.getValue()} type={'person'}/>;
      }, header: 'Last Transcriber', enableGlobalFilter: false, enableSorting: false
    }), columnHelper.accessor('info', {
      cell: info => info.getValue(), header: '', enableGlobalFilter: false, enableSorting: false
    }),

    columnHelper.accessor('actions', {
      cell: info => info.getValue(), header: '', enableGlobalFilter: false, enableSorting: false
    })], []);

  const getDocTypeName = (typeId: number) => {
    return props.docTypes.find(t => t[0] === typeId)?.[1] ?? 'unknown';
  };

  const getLanguageName = (langId: number) => {
    return props.languages.find(l => l[0] === langId)?.[1] ?? 'unknown';
  };

  const getWitnessTypeName = (type: string) => {
    switch (type) {
      case 'fullTx':
        return 'Full Transcription ';
      case 'generic':
        return 'Generic';
      default:
        return 'unknown';
    }
  };


  const data = useMemo<WitnessTableItem[]>(() => props.witnessInfoData.map(w => {

    return {
      witnessInfo: w,
      title: w.type === 'fullTx' ? w.typeSpecificInfo.docInfo.title : w.systemId,
      type: getWitnessTypeName(w.type),
      docId: w.type === 'fullTx' ? w.typeSpecificInfo.docInfo.id : -1,
      docType: w.type === 'fullTx' ? getDocTypeName(w.typeSpecificInfo.docInfo.type) : '',
      language: getLanguageName(w.language),
      pages: pagesInfoQuery.status !== 'success' ? <span>Loading...</span> : getPagesCell(w, pagesInfoQuery.data),
      lastChange: w.isValid ? w.type === 'fullTx' ? w.typeSpecificInfo.lastVersion.timeFrom : '' : '',
      lastTranscriber: w.isValid ? w.type === 'fullTx' ? w.typeSpecificInfo.lastVersion.authorTid : -1 : -1,
      info: w.isValid ? <div/> : <div className={'text-danger'}><ExclamationTriangle/> Invalid</div>,
      actions: <div/>
    };
  }), [props.witnessInfoData, props.languages, props.docTypes, pagesInfoQuery.status]);
  const table = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    state: {sorting},
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(), // getFilteredRowModel: getFilteredRowModel(),
    rowCount: data?.length ?? 0,
    enableSortingRemoval: false, // globalFilterFn: "includesString"
  });
  return (<div style={{marginTop: '2em', marginBottom: '2em'}}>
    <GridTable table={table} tableId={'witnessesTable'} key="table"
               gridColumnDef={'20em max-content max-content max-content max-content max-content max-content max-content 5em'}/>
  </div>);
}