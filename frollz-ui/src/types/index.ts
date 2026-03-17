// Film Format Types
export enum FormFactor {
  ROLL = 'Roll',
  SHEET = 'Sheet',
  INSTANT = 'Instant',
  BULK_100FT = '100ft Bulk',
  BULK_400FT = '400ft Bulk',
}

export enum Format {
  MM35 = '35mm',
  MM110 = '110',
  MINI = 'Mini',
  WIDE = 'Wide',
  SQUARE = 'Square',
  MM120 = '120',
  MM220 = '220',
  FOURX5 = '4x5',
  EIGHTX10 = '8x10',
  I_TYPE = 'I-Type',
  SIX_HUNDRED = '600',
  SX_70 = 'SX-70',
  GO = 'GO',
}

export interface FilmFormat {
  _key?: string
  formFactor: string
  format: string
  createdAt?: Date
  updatedAt?: Date
}

// Stock Types
export enum Process {
  ECN_2 = 'ECN-2',
  E_6 = 'E-6',
  C_41 = 'C-41',
  BLACK_WHITE = 'Black & White',
  INSTANT = 'Instant',
}

export interface Stock {
  _key?: string
  format?: string
  formatKey?: string
  process: Process
  manufacturer: string
  brand: string
  baseStock?: string
  baseStockKey?: string
  speed: number
  boxImageUrl?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Tag {
  _key?: string
  value: string
  color: string
  createdAt?: Date
}

export interface StockTag {
  _key?: string
  tagKey: string
  stockKey: string
  createdAt?: Date
}

// Roll Types
export enum RollState {
  FROZEN = 'Frozen',
  REFRIGERATED = 'Refrigerated',
  SHELFED = 'Shelved',
  LOADED = 'Loaded',
  FINISHED = 'Finished',
  DEVELOPED = 'Developed',
}

export enum ObtainmentMethod {
  GIFT = 'Gift',
  PURCHASE = 'Purchase',
}

export interface Roll {
  _key?: string
  rollId: string
  stockKey: string
  state: RollState
  imagesUrl?: string
  dateObtained: Date
  obtainmentMethod: ObtainmentMethod
  obtainedFrom: string
  expirationDate?: Date
  timesExposedToXrays: number
  loadedInto?: string
  createdAt?: Date
  updatedAt?: Date
}