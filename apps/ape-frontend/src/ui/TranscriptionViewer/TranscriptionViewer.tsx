import {getTranscribedPages, TranscriptionColumn, TranscriptionData} from "@/Api/Schema/ApiPublication";


export type ViewerType = 'singlePageText' | 'textOnlyNavigator' | 'navigator';

interface TranscriptionViewerProps {
  viewerType: ViewerType;
  data: TranscriptionData;
  showThumbnails?: boolean;
  showAllPages?: boolean;
}

export function TranscriptionViewer({
                                      viewerType,
                                      data,
                                      showThumbnails = true,
                                      showAllPages = false
                                    }: TranscriptionViewerProps) {

  const langClass = ` text-${data.languageCode}`;

  const columnText = (col: TranscriptionColumn) => {
    const lines = col.transcriptionText.split('\n');

    return lines.map(line => <div className={'txLine' + langClass}>{line}</div>);
  };

  const pages = showAllPages ? data.pages : getTranscribedPages(data);


  return <div style={{display: 'grid', margin: 'auto', gridTemplateColumns: '1fr', width: 'clamp(600px, 80%, 1600px)'}}>
    {
      pages.map(page => {
          const imageUrl = page.thumbnailUrl || page.imageUrl;
          return (
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
