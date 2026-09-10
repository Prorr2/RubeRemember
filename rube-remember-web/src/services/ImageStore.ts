const DB_NAME = 'rube_remember_images_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;
const IMG_PREFIX = 'img_';

let memoryCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function isImageId(ref: string | undefined | null): boolean {
  return typeof ref === 'string' && ref.startsWith(IMG_PREFIX);
}

export function generateImageId(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${IMG_PREFIX}${Date.now().toString(36)}_${rnd}`;
}

export const ImageStore = {
  isImageId,
  generateImageId,

  async saveImage(dataUrl: string, customId?: string): Promise<string> {
    const id = customId || generateImageId();
    memoryCache.set(id, dataUrl);
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(dataUrl, id);
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[ImageStore] Fallback to memory cache:', e);
      return id;
    }
  },

  async getImage(id: string): Promise<string | null> {
    if (memoryCache.has(id)) {
      return memoryCache.get(id) || null;
    }
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          const val = (req.result as string) || null;
          if (val) memoryCache.set(id, val);
          resolve(val);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  async getImageBundle(ids: string[]): Promise<Record<string, string>> {
    const bundle: Record<string, string> = {};
    for (const id of ids) {
      if (isImageId(id)) {
        const url = await this.getImage(id);
        if (url) {
          bundle[id] = url;
        }
      }
    }
    return bundle;
  },

  async saveImageBundle(bundle: Record<string, string>): Promise<void> {
    if (!bundle || Object.keys(bundle).length === 0) return;
    for (const [id, url] of Object.entries(bundle)) {
      memoryCache.set(id, url);
    }
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const [id, url] of Object.entries(bundle)) {
          store.put(url, id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[ImageStore] Fallback saveImageBundle:', e);
    }
  },

  getCached(id: string): string | null {
    return memoryCache.get(id) || null;
  }
};
