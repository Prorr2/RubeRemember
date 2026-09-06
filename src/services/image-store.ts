import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import type { DatabaseV3 } from './migration-engine';
import type { Item } from '../models/Item';
import type { Session } from '../models/Session';
import type { Comment } from '../models/Comment';
import type { ReminderList } from '../models/ReminderList';

const IMG_PREFIX = 'img_';
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.6;

export function isImageId(ref: string): boolean {
  return ref.startsWith(IMG_PREFIX);
}

export function getImagesDir(): string | null {
  if (!FileSystem.documentDirectory) {
    return null;
  }
  return `${FileSystem.documentDirectory}images/`;
}

export function idToFileUri(id: string): string | null {
  if (!isImageId(id)) {
    return null;
  }
  const dir = getImagesDir();
  if (!dir) {
    return null;
  }
  return `${dir}${id}.jpg`;
}

export function resolveImageUri(ref: string | undefined | null): string | undefined {
  if (!ref) {
    return undefined;
  }
  if (isImageId(ref)) {
    return idToFileUri(ref) ?? ref;
  }
  return ref;
}

export function resolveImageUris(refs: string[] | undefined): string[] {
  if (!refs) {
    return [];
  }
  return refs.map((r) => resolveImageUri(r) || r);
}

async function ensureDir(): Promise<string | null> {
  const dir = getImagesDir();
  if (!dir) {
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch (e) {
    console.warn('[ImageStore] ensureDir error:', e);
    return null;
  }
  return dir;
}

function randomId(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${IMG_PREFIX}${Date.now().toString(36)}_${rnd}`;
}

export async function saveDataUrl(
  dataUrl: string,
  options?: { maxDimension?: number; quality?: number }
): Promise<string> {
  const dir = await ensureDir();
  if (!dir) {
    return dataUrl;
  }

  const run = async (source: string): Promise<string | null> => {
    let result;
    try {
      const context = ImageManipulator.manipulate(source);
      context.resize({ width: options?.maxDimension ?? MAX_DIMENSION });
      const image = await context.renderAsync();
      result = await image.saveAsync({
        compress: options?.quality ?? JPEG_QUALITY,
        format: SaveFormat.JPEG,
      });
    } catch (e) {
      console.warn('[ImageStore] manipulate failed, storing original:', e);
      return null;
    }

    const id = randomId();
    const target = `${dir}${id}.jpg`;
    try {
      await FileSystem.copyAsync({ from: result.uri, to: target });
      return id;
    } catch (e) {
      console.warn('[ImageStore] write failed:', e);
      return null;
    }
  };

  const id = await run(dataUrl);
  if (id) {
    return id;
  }
  return dataUrl;
}

export async function dataUrlToId(
  dataUrl: string,
  options?: { maxDimension?: number; quality?: number }
): Promise<string> {
  const dir = await ensureDir();
  if (!dir) {
    return dataUrl;
  }
  return saveDataUrl(dataUrl, options);
}

export async function getDataUrlForId(id: string): Promise<string | null> {
  const uri = idToFileUri(id);
  if (!uri) {
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return null;
    }
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  } catch (e) {
    console.warn('[ImageStore] read failed:', e);
    return null;
  }
}

export async function readImageBundle(ids: string[]): Promise<Record<string, string>> {
  const bundle: Record<string, string> = {};
  for (const id of ids) {
    const b64 = await getDataUrlForId(id);
    if (b64) {
      bundle[id] = `data:image/jpeg;base64,${b64}`;
    }
  }
  return bundle;
}

export async function writeImageBundle(bundle: Record<string, string>): Promise<void> {
  const dir = await ensureDir();
  if (!dir || !bundle) {
    return;
  }
  for (const id of Object.keys(bundle)) {
    const dataUrl = bundle[id];
    if (!isImageId(id) || !dataUrl) {
      continue;
    }
    const target = `${dir}${id}.jpg`;
    try {
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const info = await FileSystem.getInfoAsync(target);
      if (info.exists) {
        continue;
      }
      await FileSystem.writeAsStringAsync(target, base64, { encoding: 'base64' });
    } catch (e) {
      console.warn('[ImageStore] writeImageBundle failed for', id, e);
    }
  }
}

export async function deleteImageFiles(ids: string[]): Promise<void> {
  const dir = getImagesDir();
  if (!dir) {
    return;
  }
  for (const id of ids) {
    const uri = `${dir}${id}.jpg`;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (e) {
      console.warn('[ImageStore] delete failed for', id, e);
    }
  }
}

export async function deleteOrphanImages(db: DatabaseV3): Promise<void> {
  const referenced = new Set<string>();
  visitAllImageRefs(db, (ref) => {
    if (isImageId(ref)) {
      referenced.add(ref);
    }
  });
  const dir = getImagesDir();
  if (!dir) {
    return;
  }
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    const orphans = files
      .filter((f) => f.startsWith(IMG_PREFIX) && f.endsWith('.jpg'))
      .map((f) => f.slice(0, -4))
      .filter((id) => !referenced.has(id));
    if (orphans.length > 0) {
      await deleteImageFiles(orphans);
    }
  } catch (e) {
    console.warn('[ImageStore] deleteOrphanImages failed:', e);
  }
}

interface ImageArrays {
  images?: string[];
  imageUri?: string;
}

type WithImages = { images?: string[] };

const hasImages = (v: unknown): v is WithImages =>
  !!v && typeof v === 'object' && Array.isArray((v as WithImages).images);

function collectImageArrays(value: unknown, out: { refs: string[]; arrays: string[][] }): void {
  if (!value || typeof value !== 'object') {
    return;
  }
  const obj = value as Record<string, unknown>;

  if (Array.isArray(obj.images)) {
    const arr = obj.images as string[];
    out.arrays.push(arr);
    out.refs.push(...arr);
  }

  if (typeof obj.imageUri === 'string' && obj.imageUri) {
    out.refs.push(obj.imageUri);
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (key === 'comments' && Array.isArray(val)) {
      for (const c of val) {
        collectImageArrays(c, out);
      }
    } else if (key === 'items' && Array.isArray(val)) {
      for (const it of val) {
        collectImageArrays(it, out);
      }
    } else if (key === 'sessions' && Array.isArray(val)) {
      for (const s of val) {
        collectImageArrays(s, out);
      }
    } else if (key === 'nextStepImages' && Array.isArray(val)) {
      out.arrays.push(val as string[]);
      out.refs.push(...(val as string[]));
    } else if (key === 'notesImages' && Array.isArray(val)) {
      out.arrays.push(val as string[]);
      out.refs.push(...(val as string[]));
    }
  }
}

export function visitAllImageRefs(db: DatabaseV3, cb: (ref: string) => void): void {
  const out = { refs: [] as string[], arrays: [] as string[][] };
  for (const item of db.items || []) {
    collectImageArrays(item, out);
  }
  for (const list of db.lists || []) {
    for (const li of list.items || []) {
      collectImageArrays(li, out);
    }
  }
  for (const session of db.sessions || []) {
    collectImageArrays(session, out);
  }
  out.refs.forEach(cb);
}

export function replaceDataUrlsWithIds(db: DatabaseV3): { db: DatabaseV3; changed: boolean } {
  let changed = false;

  const processArray = (arr: string[] | undefined): string[] | undefined => {
    if (!arr) {
      return arr;
    }
    const next = arr.map((r) => {
      if (r && r.startsWith('data:image/')) {
        throw new Error('dataUrl images must be migrated via async saveDataUrl');
      }
      return r;
    });
    return next;
  };

  for (const item of db.items || []) {
    const im = item as unknown as WithImages;
    if (im.images && im.images.some((r) => r.startsWith('data:image/'))) {
      changed = true;
    }
  }
  for (const list of db.lists || []) {
    for (const li of list.items || []) {
      if (li.images && li.images.some((r) => r.startsWith('data:image/'))) {
        changed = true;
      }
    }
  }
  for (const session of db.sessions || []) {
    if (session.notesImages?.some((r) => r.startsWith('data:image/')) || session.nextStepImages?.some((r) => r.startsWith('data:image/'))) {
      changed = true;
    }
  }

  return { db, changed };
}

interface ImageMappable {
  images?: string[];
}

const im = (v: unknown): ImageMappable => (v as ImageMappable) || {};

export async function materializeDatabaseImages(
  db: DatabaseV3,
  options?: { maxDimension?: number; quality?: number }
): Promise<DatabaseV3> {
  const asyncMapArray = async (arr: string[] | undefined): Promise<string[] | undefined> => {
    if (!arr || arr.length === 0) {
      return arr;
    }
    const result: string[] = [];
    let changed = false;
    for (const ref of arr) {
      if (ref.startsWith('data:image/')) {
        const id = await saveDataUrl(ref, options);
        result.push(id);
        changed = true;
      } else {
        result.push(ref);
      }
    }
    return changed ? result : arr;
  };

  const mapImages = async (target: { images?: string[] }): Promise<boolean | null> => {
    if (!target.images) {
      return null;
    }
    const mapped = await asyncMapArray(target.images);
    if (mapped === target.images) {
      return null;
    }
    target.images = mapped;
    return true;
  };

  const nextDb: DatabaseV3 = { ...db, items: [...db.items], lists: [...db.lists] };

  await Promise.all(
    nextDb.items.map(async (item) => {
      await mapImages(im(item));
      const comments = (item as unknown as { comments?: Comment[] }).comments;
      if (comments) {
        await Promise.all(comments.map(async (c) => mapImages(im(c))));
      }
    })
  );

  await Promise.all(
    nextDb.lists.map(async (list) => {
      if (list.items) {
        await Promise.all(list.items.map(async (li) => mapImages(im(li))));
      }
    })
  );

  if (nextDb.sessions) {
    await Promise.all(
      nextDb.sessions.map(async (s, sIdx) => {
        const session = nextDb.sessions![sIdx];
        if (session.notesImages) {
          const mapped = await asyncMapArray(session.notesImages);
          if (mapped !== session.notesImages) {
            session.notesImages = mapped;
          }
        }
        if (session.nextStepImages) {
          const mapped = await asyncMapArray(session.nextStepImages);
          if (mapped !== session.nextStepImages) {
            session.nextStepImages = mapped;
          }
        }
      })
    );
  }

  return nextDb;
}

export async function safeToDataUrl(ref: string): Promise<string | null> {
  if (isImageId(ref)) {
    return getDataUrlForId(ref);
  }
  return ref;
}

export const ImageStore = {
  saveDataUrl,
  idToFileUri,
  resolveImageUri,
  resolveImageUris,
  getDataUrlForId,
  readImageBundle,
  writeImageBundle,
  deleteImageFiles,
  deleteOrphanImages,
  materializeDatabaseImages,
  replaceDataUrlsWithIds,
  safeToDataUrl,
  isImageId,
  visitAllImageRefs,
};

export function collectAllImageIds(db: DatabaseV3): string[] {
  const ids: string[] = [];
  visitAllImageRefs(db, (ref) => {
    if (isImageId(ref)) {
      ids.push(ref);
    }
  });
  return Array.from(new Set(ids));
}

export async function materializeDatabaseImagesForExport(
  db: DatabaseV3
): Promise<DatabaseV3> {
  const asyncMapArray = async (arr: string[] | undefined): Promise<string[] | undefined> => {
    if (!arr || arr.length === 0) {
      return arr;
    }
    let changed = false;
    const result: string[] = [];
    for (const ref of arr) {
      if (isImageId(ref)) {
        const dataUrl = await getDataUrlForId(ref);
        if (dataUrl) {
          result.push(`data:image/jpeg;base64,${dataUrl}`);
          changed = true;
        } else {
          result.push(ref);
        }
      } else {
        result.push(ref);
      }
    }
    return changed ? result : arr;
  };

  const mapImages = async (target: { images?: string[] }): Promise<boolean | null> => {
    if (!target.images) {
      return null;
    }
    const mapped = await asyncMapArray(target.images);
    if (mapped === target.images) {
      return null;
    }
    target.images = mapped;
    return true;
  };

  const nextDb: DatabaseV3 = { ...db, items: [...db.items], lists: [...db.lists] };

  await Promise.all(
    nextDb.items.map(async (item) => {
      await mapImages(im(item));
      const comments = (item as unknown as { comments?: Comment[] }).comments;
      if (comments) {
        await Promise.all(comments.map(async (c) => mapImages(im(c))));
      }
    })
  );

  await Promise.all(
    nextDb.lists.map(async (list) => {
      if (list.items) {
        await Promise.all(list.items.map(async (li) => mapImages(im(li))));
      }
    })
  );

  if (nextDb.sessions) {
    await Promise.all(
      nextDb.sessions.map(async (session, sIdx) => {
        const sess = nextDb.sessions![sIdx];
        if (sess.notesImages) {
          const mapped = await asyncMapArray(sess.notesImages);
          if (mapped !== sess.notesImages) {
            sess.notesImages = mapped;
          }
        }
        if (sess.nextStepImages) {
          const mapped = await asyncMapArray(sess.nextStepImages);
          if (mapped !== sess.nextStepImages) {
            sess.nextStepImages = mapped;
          }
        }
      })
    );
  }

  return nextDb;
}