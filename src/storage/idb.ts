import { DB_NAME, DB_VERSION, KV_STORE } from './types'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('打开 IndexedDB 失败'))
  })
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readonly')
      const req = tx.objectStore(KV_STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error ?? new Error('读取失败'))
    })
  } finally {
    db.close()
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KV_STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('事务失败'))
      tx.onabort = () => reject(tx.error ?? new Error('事务中止'))
      tx.objectStore(KV_STORE).put(value, key)
    })
  } finally {
    db.close()
  }
}
