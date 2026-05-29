import { PageInfo } from "@/Api/DataSchema/ApiDocuments";

export type RangeType = 'text' | 'front' | 'back';

export interface Range {
    id: number;
    from: number;
    to: number;
    type: RangeType;
    foliate: boolean;
    foliationType?: number;
    foliationStart?: number;
    foliationPrefix?: string;
    foliationSuffix?: string;
    foliationReverse?: boolean;
    numCols?: number;
}

export interface PageDefinition {
    docId: number;
    page: number;
    type?: number;
    foliation?: string;
    overwriteFoliation?: boolean;
    cols?: number;
}

export interface Thumbnail {
    initSize: number;
    sizeSmall: number;
    panel: boolean;
}

export interface PageListProps {
    pageInfoArray: PageInfo[];
    thumbnails?: Thumbnail;
    pageDefiner?: boolean;
    onPageClick?: (seq: number) => void;
    onDefineSuccess?: () => void;
}

export interface PageItemProps {
    page: PageInfo;
    withThumbnail: boolean;
    thumbnailSize: number;
    isSelected: boolean;
    backgroundColor?: string;
    liveFoliation?: string | null;
    liveNumCols?: number | null;
    onClick: (seq: number) => void;
}

export interface PageDefinerProps {
    docId: number;
    numPages: number;
    scrollToPage?: (pageNum: number) => void;
    onDefineSuccess?: () => void;
    onRangesChange?: (ranges: Range[]) => void;
    onColsInputChange?: (rangeId: number, value: string) => void;
}
