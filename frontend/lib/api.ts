const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function executeSqlQuery(query: string, limit = 1000, offset = 0) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, offset }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Query execution failed (${res.status})`);
  }

  return await res.json();
}

export async function uploadCsvFiles(files: File[]) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Upload failed (${res.status})`);
  }

  return await res.json();
}

export async function fetchSchema() {
  const res = await fetch(`${API_BASE}/api/schema`);
  if (!res.ok) {
    throw new Error('Failed to fetch schema');
  }
  return await res.json();
}

export async function deleteTable(tableName: string) {
  const res = await fetch(`${API_BASE}/api/schema/${encodeURIComponent(tableName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete table ${tableName}`);
  }
  return await res.json();
}

export async function renameTable(oldName: string, newName: string) {
  const res = await fetch(`${API_BASE}/api/schema/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_name: oldName, new_name: newName }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Failed to rename table ${oldName}`);
  }
  return await res.json();
}
