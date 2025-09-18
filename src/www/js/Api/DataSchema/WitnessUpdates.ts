/**
 * Upstream / downstream data for checkWitnessUpdates API call
 */
export interface WitnessUpdateData {
  status: 'undefined' | 'NotChecked' | 'OK' | 'Error',
  message: string,
  timeStamp: string,
  witnesses: WitnessUpdateInfo[]
}

interface WitnessUpdateInfo {
  id: string,
  upToDate: boolean,
  justUpdated: boolean,
  lastUpdate: string,
}