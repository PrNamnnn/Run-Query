export interface ColumnSchema {
  name: string;
  type: string;
}

export interface TableSchema {
  table_name: string;
  row_count: number;
  columns: ColumnSchema[];
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  total_count: number;
  execution_time_ms: number;
  error?: string | null;
  translated_query?: string | null;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  execution_time_ms: number;
  status: 'success' | 'error';
  row_count: number;
  error?: string | null;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  created_at: number;
  updated_at: number;
}

export interface StoredCSVDataset {
  id: string;
  table_name: string;
  original_filename: string;
  file_size: number;
  row_count: number;
  columns: ColumnSchema[];
  content: string; // Stored CSV text for offline / browser reload restoration
  uploaded_at: number;
}
