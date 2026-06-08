import {EditionPublicationData} from "@shared/ts";
import {SinglePageEditionViewer} from "@/ui/EditionViewer/SinglePageEditionViewer";

interface EditionViewerProps {
  editionData: EditionPublicationData;
  viewerType: 'singlePage' | 'multiPage';
}


export function EditionViewer({editionData, viewerType}: EditionViewerProps) {

  if (viewerType === 'singlePage') {
    return <SinglePageEditionViewer editionData={editionData}/>;
  }

  return <div>Viewer not implemented yet</div>;
}
