
export interface ApiCollationTableConvertToEdition {
  status: string;
  tableId: number;
  url: string;
}


export interface ApiCollationTable_convertToEdition_input {
  tableId: number;
  initStrategy: 'topWitness';  // only one strategy for now
}