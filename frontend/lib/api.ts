import { getAccessToken } from './supabase';

// Normalize base URL once by trimming whitespace and stripping any trailing slashes
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
export const API_BASE = RAW_API_BASE.trim().replace(/\/+$/, '');

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function executeSqlQuery(query: string, limit = 1000, offset = 0) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, limit, offset }),
  });

  if (res.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Query execution failed (${res.status})`);
  }

  return await res.json();
}

export async function uploadCsvFiles(files: File[]) {
  const token = await getAccessToken();
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Upload failed (${res.status})`);
  }

  return await res.json();
}

export async function fetchSchema() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/schema`, { headers });
  if (res.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch schema' }));
    throw new Error(err.detail || 'Failed to fetch schema');
  }
  return await res.json();
}

export async function deleteTable(tableName: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/schema/${encodeURIComponent(tableName)}`, {
    method: 'DELETE',
    headers,
  });
  if (res.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Failed to delete table ${tableName}`);
  }
  return await res.json();
}

export async function renameTable(oldName: string, newName: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/schema/rename`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ old_name: oldName, new_name: newName }),
  });
  if (res.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Failed to rename table ${oldName}`);
  }
  return await res.json();
}

export async function fetchQueryHistory() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/history`, { headers });
  if (!res.ok) return [];
  return await res.json();
}

export async function clearQueryHistory() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/history`, { method: 'DELETE', headers });
  return res.ok;
}

export async function deleteQueryHistoryItem(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/history/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  return res.ok;
}

export async function fetchSavedQueries() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/saved-queries`, { headers });
  if (!res.ok) return [];
  return await res.json();
}

export async function createSavedQuery(name: string, query: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/saved-queries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save query' }));
    throw new Error(err.detail || 'Failed to save query');
  }
  return await res.json();
}

export async function deleteSavedQuery(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/saved-queries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });
  return res.ok;
}

export async function deleteAccount() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/account`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete account' }));
    throw new Error(err.detail || 'Failed to delete account');
  }
  return await res.json();
}

export async function fetchAccountProfile() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/account/me`, { headers });
  if (!res.ok) return null;
  return await res.json();
}
