import {TranscriptionColumn, TranscriptionData, TranscriptionPage} from "@/Api/Schema/ApiPublication";


export type ViewerType = 'singlePageText' | 'textOnlyNavigator' | 'navigator';

interface TranscriptionViewerProps {
  viewerType: ViewerType;
  data: TranscriptionData;
  showThumbnails?: boolean;
}

export function TranscriptionViewer({viewerType, data, showThumbnails = true}: TranscriptionViewerProps) {

  const langClass = ` text-${data.languageCode}`;

  const columnText = (col: TranscriptionColumn) => {
    const lines = col.transcriptionText.split('\n');

    return lines.map(line => <div className={'txLine' + langClass}>{line}</div>);
  };

  const isTranscriptionEmpty = (page: TranscriptionPage) => {
    if (page.columns.length === 0) {
      return true;
    }
    return page.columns.every(col => col.transcriptionText.trim() === '');
  }


  return <div style={{ display: 'grid', gridTemplateColumns: '1fr', width: '80%'}}>
    {
      data.pages.filter(page => !isTranscriptionEmpty(page)).map(page => {
        const imageUrl = page.thumbnailUrl || page.imageUrl;
        return(
          <div key={page.pageNumber} className={'txPage'}>
            <h1 className={langClass}>{page.foliation}</h1>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              {showThumbnails && imageUrl &&
                <img width={500} src={imageUrl} alt={`Thumbnail for page ${page.pageNumber}`}
                     className="thumbnail"/>}
              {!showThumbnails || !imageUrl && <div/>}
              <div className={'txColumnContainer'}>
                {
                  page.columns.map(col => columnText(col))
                }
              </div>
            </div>
          </div>);
        }
      )
    }
  </div>;
}
