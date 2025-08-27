/**
 * Data returned by the collationTable versionInfo API call
 */
export interface ApiCollationTable_versionInfo {
  tableId: number;
  type: string;
  title: string;
  timeFrom: string;
  timeUntil: string;
  isLatestVersion: boolean;
  archived: boolean;
}