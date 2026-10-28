export interface ColumnSchema {
  name: string;
  type: string;
}

export interface TableSchema {
  table_name: string;
  row_count: number;
  columns: ColumnSchema[];
  display_name?: string;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  total_count: number;
  execution_time_ms: number;
  error?: string | null;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  created_at: string;
  execution_time_ms: number;
  status: 'success' | 'error';
  row_count: number;
  error?: string | null;
}

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  total_tables: number;
  total_queries: number;
}
