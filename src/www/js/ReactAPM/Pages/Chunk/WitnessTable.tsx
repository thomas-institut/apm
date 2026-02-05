import {WitnessInfo} from "@/Api/DataSchema/WitnessInfo";
import {EntityNameTuple} from "@/Api/ApmApiClient";
import {JSX, useMemo, useState} from "react";
import {
  createColumnHelper, getCoreRowModel, getSortedRowModel, SortingState, useReactTable
} from "@tanstack/react-table";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import GridTable from "@/ReactAPM/Components/GridTable";

interface WitnessTableProps {
  witnessInfoData: WitnessInfo[];
  languages: EntityNameTuple[];
  docTypes: EntityNameTuple[];
}

interface WitnessTableItem {
  title: string;
  type: string;
  docId: number;
  docType: string;
  language: string;
  pages: string;
  info: JSX.Element;
  actions: JSX.Element;
}


export default function WitnessTable(props: WitnessTableProps) {

  console.log('Witnesses', props.witnessInfoData);
  const [sorting, setSorting] = useState<SortingState>([ { id: 'title', desc: false }])
  const columnHelper = createColumnHelper<WitnessTableItem>();
  const columns = useMemo( () => [

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
      cell: info => info.getValue(), header: 'Pages', enableGlobalFilter: false,enableSorting: false,
    }), columnHelper.accessor('info', {
      cell: info => info.getValue(), header: 'Info', enableGlobalFilter: false, enableSorting: false
    }), columnHelper.accessor('actions', {
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
      case 'fullTx': return 'Full Transcription ';
      case 'generic': return 'Generic';
      default: return 'unknown';
    }
  }

  const data = useMemo<WitnessTableItem[]>( () => props.witnessInfoData.map(w => {
    return {
      title: w.type === 'fullTx' ? w.typeSpecificInfo.docInfo.title : w.systemId,
      type: getWitnessTypeName(w.type),
      docId: w.type === 'fullTx' ? w.typeSpecificInfo.docInfo.id : -1,
      docType: w.type === 'fullTx' ? getDocTypeName(w.typeSpecificInfo.docInfo.type) : '',
      language: getLanguageName(w.language),
      pages: '',
      info: <div/>,
      actions: <div/>
    };
  }), [ props.witnessInfoData, props.languages, props.docTypes]);
  const table = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    state: {sorting},
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    // getFilteredRowModel: getFilteredRowModel(),
    rowCount: data?.length ?? 0,
    debugTable: true,
    enableSortingRemoval: false,
    // globalFilterFn: "includesString"
  });
  return (<div style={{marginTop: '2em', marginBottom: '2em'}}>
    <GridTable table={table} tableId={'witnessesTable'} key='table' gridColumnDef={'20em max-content max-content max-content max-content max-content 5em'}/>
  </div>);
}