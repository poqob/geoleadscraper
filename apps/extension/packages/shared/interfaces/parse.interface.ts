export interface IParsingResponseQuery {
  search: string | null;
  page: number;
  pages?: number;
  total?: number;
  next?: boolean;
  // ..
  offset: number;
  url: string;
  lat?: number;
  long?: number;
  alt?: number;
  // ..
  lang?: string;
  gl?: string;
  psi?: string;
}

export interface IParsingResponse<T = any> {
  data: T[];
  results: number;
  current?: number;
  query: IParsingResponseQuery;
}

export interface IParsingClientSideResponse<T = any> {
  data: T[];
  results: number;
  query: IParsingResponseQuery;
  end: boolean;
}
