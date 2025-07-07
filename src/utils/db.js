// src/utils/db.js
import { openDB } from 'idb';

const DB_NAME = 'upload-db';
const STORE_NAME = 'queue';

export const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
    }
});

export async function addToIndexedDB(item) {
    const db = await dbPromise;
    await db.put(STORE_NAME, item);
}

export async function getAllFromIndexedDB() {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
}

export async function deleteFromIndexedDB(id) {
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
}
