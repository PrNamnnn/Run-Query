import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { QueryHistoryItem, SavedQuery, StoredCSVDataset } from '@/types';

interface SQLWorkspaceDB extends DBSchema {
  datasets: {
    key: string;
    value: StoredCSVDataset;
  };
  history: {
    key: string;
    value: QueryHistoryItem;
    indexes: { 'by-timestamp': number };
  };
  saved_queries: {
    key: string;
    value: SavedQuery;
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'sql_workspace_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SQLWorkspaceDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<SQLWorkspaceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Datasets store
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'table_name' });
        }
        // Query history store
        if (!db.objectStoreNames.contains('history')) {
          const histStore = db.createObjectStore('history', { keyPath: 'id' });
          histStore.createIndex('by-timestamp', 'timestamp');
        }
        // Saved queries store
        if (!db.objectStoreNames.contains('saved_queries')) {
          const savedStore = db.createObjectStore('saved_queries', { keyPath: 'id' });
          savedStore.createIndex('by-updated', 'updated_at');
        }
      },
    });
  }
  return dbPromise;
}

// ================= DATASETS =================
export async function saveDatasetToIDB(dataset: StoredCSVDataset): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('datasets', dataset);
}

export async function getAllDatasetsFromIDB(): Promise<StoredCSVDataset[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('datasets');
}

export async function removeDatasetFromIDB(tableName: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  // Direct delete by primary key
  await db.delete('datasets', tableName);

  // Also query all datasets to delete any record whose table_name or id matches case-insensitively
  const targetLower = tableName.trim().toLowerCase();
  const all = await db.getAll('datasets');
  for (const item of all) {
    if (
      (item.table_name && item.table_name.toLowerCase() === targetLower) ||
      (item.id && item.id.toLowerCase() === targetLower)
    ) {
      await db.delete('datasets', item.table_name);
    }
  }
}

export async function renameDatasetInIDB(oldName: string, newName: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  
  const oldLower = oldName.trim().toLowerCase();
  const all = await db.getAll('datasets');
  const matched = all.find(item => 
    (item.table_name && item.table_name.toLowerCase() === oldLower) ||
    (item.id && item.id.toLowerCase() === oldLower)
  );

  if (matched) {
    // Delete old record
    await db.delete('datasets', matched.table_name);
    if (oldName !== matched.table_name) {
      await db.delete('datasets', oldName);
    }
    const updated: StoredCSVDataset = {
      ...matched,
      id: newName,
      table_name: newName,
    };
    await db.put('datasets', updated);
  } else {
    // Attempt direct get as fallback
    const direct = await db.get('datasets', oldName);
    if (direct) {
      await db.delete('datasets', oldName);
      const updated: StoredCSVDataset = {
        ...direct,
        id: newName,
        table_name: newName,
      };
      await db.put('datasets', updated);
    }
  }
}

// ================= HISTORY (30 Days Limit) =================
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function addQueryHistory(item: QueryHistoryItem): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('history', item);
  await pruneOldHistory();
}

export async function getAllHistory(): Promise<QueryHistoryItem[]> {
  const db = await getDB();
  if (!db) return [];
  const all = await db.getAllFromIndex('history', 'by-timestamp');
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  // Return descending and filter
  return all.filter(h => h.timestamp >= cutoff).reverse();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('history', id);
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.clear('history');
}

export async function pruneOldHistory(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const tx = db.transaction('history', 'readwrite');
  const index = tx.store.index('by-timestamp');
  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.timestamp < cutoff) {
      await cursor.delete();
      cursor = await cursor.continue();
    } else {
      break; // Sorted ascending, so once >= cutoff we are done
    }
  }
  await tx.done;
}

// ================= SAVED QUERIES =================
export async function saveQueryToIDB(saved: SavedQuery): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('saved_queries', saved);
}

export async function getAllSavedQueries(): Promise<SavedQuery[]> {
  const db = await getDB();
  if (!db) return [];
  const list = await db.getAllFromIndex('saved_queries', 'by-updated');
  return list.reverse();
}

export async function deleteSavedQuery(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('saved_queries', id);
}
