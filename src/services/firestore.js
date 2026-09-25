import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const cloudinaryCloudName = 'uhebmjrr';
const cloudinaryUploadPreset = 'cms_unsigned_upload';

function validateCollectionPath(collectionPath) {
  const path = Array.isArray(collectionPath) ? collectionPath.filter(Boolean) : [];
  if (path.length === 0 || path.length % 2 === 0) {
    throw new Error(`Invalid Firestore collection path: ${path.join('/') || '(empty)'} — collection paths must have an odd number of segments.`);
  }
  return path;
}

export async function listDocuments(collectionPath, pageSize = 10, cursor = null) {
  validateCollectionPath(collectionPath);
  const constraints = [orderBy('createdAt', 'asc'), limit(pageSize)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  const snapshot = await getDocs(query(collection(db, ...collectionPath), ...constraints));
  return {
    documents: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    cursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function listAllDocuments(collectionPath) {
  validateCollectionPath(collectionPath);
  const snapshot = await getDocs(query(collection(db, ...collectionPath), orderBy('createdAt', 'asc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function countDocuments(collectionPath) {
  validateCollectionPath(collectionPath);
  const countSnapshot = await getCountFromServer(collection(db, ...collectionPath));
  return countSnapshot.data().count;
}

export async function createDocument(collectionPath, values, idField) {
  validateCollectionPath(collectionPath);
  const reference = await addDoc(collection(db, ...collectionPath), { ...values, createdAt: new Date() });
  if (idField) await updateDoc(reference, { [idField]: reference.id });
  return reference;
}

export async function editDocument(collectionPath, documentId, values) {
  const path = Array.isArray(collectionPath) ? collectionPath.filter(Boolean) : [];
  if (path.length % 2 !== 1) {
    throw new Error(`Invalid Firestore document path: ${path.join('/')} — document paths must be collection + document ID pairs.`);
  }
  return updateDoc(doc(db, ...collectionPath, documentId), values);
}

export async function removeDocument(collectionPath, documentId) {
  const path = Array.isArray(collectionPath) ? collectionPath.filter(Boolean) : [];
  if (path.length % 2 !== 1) {
    throw new Error(`Invalid Firestore document path: ${path.join('/')} — document paths must be collection + document ID pairs.`);
  }
  return deleteDoc(doc(db, ...collectionPath, documentId));
}

export async function syncDialectLessonCount(dialectId) {
  const lessons = await listAllDocuments(['dialects', dialectId, 'lessons']);
  const totalLessons = lessons.filter((lesson) => lesson.status === true || lesson.status === 'true').length;
  await updateDoc(doc(db, 'dialects', dialectId), { totalLessons });
  return totalLessons;
}

export async function migrateDialectLessons(dialectId) {
  const legacyCategories = await listAllDocuments(['dialects', dialectId, 'categories']);
  const directLessons = await listAllDocuments(['dialects', dialectId, 'lessons']);
  const existingIds = new Set(directLessons.map((lesson) => lesson.id));
  let movedCount = 0;

  for (const category of legacyCategories) {
    const legacyLessons = await listAllDocuments(['dialects', dialectId, 'categories', category.id, 'lessons']);
    for (const lesson of legacyLessons) {
      if (!existingIds.has(lesson.id)) {
        const { id, ...lessonData } = lesson;
        await setDoc(doc(db, 'dialects', dialectId, 'lessons', id), lessonData);
        existingIds.add(id);
      }
      await deleteDoc(doc(db, 'dialects', dialectId, 'categories', category.id, 'lessons', lesson.id));
      movedCount += 1;
    }
  }

  return movedCount;
}

function toHexString(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getFileHash(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return toHexString(digest);
}

function getCloudinaryCache() {
  try {
    return JSON.parse(window.localStorage.getItem('nativora-cloudinary-cache') || '{}');
  } catch (error) {
    return {};
  }
}

export async function uploadFileToCloudinary(file, kind) {
  const resourceType = kind === 'image' ? 'image' : 'video';
  const folder = kind === 'image' ? 'images' : 'audio';
  const fileHash = await getFileHash(file);
  const cache = getCloudinaryCache();
  const cacheKey = `${kind}:${fileHash}`;

  if (cache[cacheKey]) {
    return { url: cache[cacheKey], reused: true };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryUploadPreset);
  formData.append('folder', folder);
  formData.append('public_id', `${kind}-${fileHash}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error?.message || 'Cloudinary upload failed.');
  }

  const result = await response.json();
  const secureUrl = result.secure_url;

  try {
    cache[cacheKey] = secureUrl;
    window.localStorage.setItem('nativora-cloudinary-cache', JSON.stringify(cache));
  } catch (error) {
    // ignore cache write failures
  }

  return { url: secureUrl, reused: false };
}

export async function listSubcollection(parentCollection, parentId, subcollectionName) {
  const snapshot = await getDocs(collection(db, parentCollection, parentId, subcollectionName));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function ensureAdminProfile(user) {
  const userReference = doc(db, 'adminUsers', user.uid);
  const snapshot = await getDoc(userReference);

  if (!snapshot.exists()) {
    await setDoc(userReference, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      status: false,
      createdAt: serverTimestamp(),
    });
    return false;
  }

  return snapshot.data().status === true;
}
