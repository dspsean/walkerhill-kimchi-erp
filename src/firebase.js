// ============================================================
// 🔥 Firebase 설정
// ============================================================
// ⚠️ 여기에 Firebase Console에서 복사한 config 정보를 붙여넣으세요
// 설정 방법: Firebase_설정_가이드.md 참고
// ============================================================

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

// 🔧 Firebase Config - Walkerhill-kimchi 프로젝트
const firebaseConfig = {
  apiKey: "AIzaSyAVSYF4edNwFQpXLhYA4SX3be-Zs2ASoz4",
  authDomain: "walkerhill-kimchi.firebaseapp.com",
  projectId: "walkerhill-kimchi",
  storageBucket: "walkerhill-kimchi.firebasestorage.app",
  messagingSenderId: "592761228264",
  appId: "1:592761228264:web:54807a040065a227fc725d"
};

// Firebase가 설정되었는지 확인
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

let app = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // 오프라인 지원 활성화
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, offline persistence disabled.');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser does not support offline persistence.');
      }
    });

    console.log('🔥 Firebase 연결 성공!');
  } catch (err) {
    console.error('Firebase 초기화 실패:', err);
  }
} else {
  console.log('ℹ️ Firebase 미설정 - 로컬 모드로 동작');
}

export { db, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch };

// ============================================================
// 📡 Firestore 컬렉션 이름 상수
// ============================================================
export const COLLECTIONS = {
  customers: 'customers',
  items: 'items',
  orders: 'orders',
  drivers: 'drivers',
};

// ============================================================
// 🔄 데이터 동기화 헬퍼 함수
// ============================================================

/**
 * Firestore 컬렉션 실시간 구독
 * @param {string} collectionName - 컬렉션 이름
 * @param {Function} callback - 데이터 변경 시 호출될 콜백 (data: Array)
 * @returns {Function} unsubscribe 함수
 */
export function subscribeToCollection(collectionName, callback) {
  if (!db) return () => {};

  const unsubscribe = onSnapshot(
    collection(db, collectionName),
    { includeMetadataChanges: true },  // 메타데이터 변경도 포함
    (snapshot) => {
      // 로컬 캐시에서 나온 변경(내가 방금 쓴 것)은 무시
      // 서버에서 확정된 데이터만 반영 (다른 기기의 변경 또는 내 변경의 최종 확정)
      if (snapshot.metadata.hasPendingWrites) {
        // 내가 방금 쓴 변경이 아직 서버에 반영 중 → 스킵
        return;
      }

      const data = snapshot.docs.map(d => d.data());
      callback(data);
    },
    (err) => {
      console.error(`Error subscribing to ${collectionName}:`, err);
    }
  );

  return unsubscribe;
}

/**
 * 단일 문서 저장 (id 필드 필수)
 */
export async function saveDocument(collectionName, data) {
  if (!db || !data.id) return;
  try {
    await setDoc(doc(db, collectionName, data.id), data, { merge: false });
  } catch (err) {
    console.error(`Error saving to ${collectionName}:`, err);
  }
}

/**
 * 여러 문서 일괄 저장 - debounced + deduplicated
 */
const _saveBatchTimers = {};
const _lastSavedData = {};

export async function saveBatch(collectionName, dataArray) {
  if (!db || !dataArray || dataArray.length === 0) return;

  // 이전과 동일한 데이터면 스킵 (중복 저장 방지)
  const dataHash = JSON.stringify(dataArray);
  if (_lastSavedData[collectionName] === dataHash) {
    return;
  }
  _lastSavedData[collectionName] = dataHash;

  // debounce 500ms
  if (_saveBatchTimers[collectionName]) {
    clearTimeout(_saveBatchTimers[collectionName]);
  }

  return new Promise((resolve) => {
    _saveBatchTimers[collectionName] = setTimeout(async () => {
      try {
        const chunks = [];
        for (let i = 0; i < dataArray.length; i += 400) {
          chunks.push(dataArray.slice(i, i + 400));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(data => {
            if (data.id) {
              batch.set(doc(db, collectionName, data.id), data);
            }
          });
          await batch.commit();
        }
        console.log(`✓ ${collectionName} ${dataArray.length}건 업로드 완료`);
        resolve();
      } catch (err) {
        console.error(`Error batch saving ${collectionName}:`, err);
        resolve();
      }
    }, 500);
  });
}

/**
 * 문서 삭제
 */
export async function deleteDocument(collectionName, id) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    console.error(`Error deleting ${collectionName}/${id}:`, err);
  }
}

/**
 * 배열 동기화 (현재 상태를 Firestore에 반영)
 * - 기존 문서를 모두 덮어쓰기
 * - 로컬에만 있는 것은 추가
 * - Firestore에만 있는 것은 삭제 (옵션)
 */
export async function syncArray(collectionName, dataArray) {
  if (!db || !dataArray) return;
  await saveBatch(collectionName, dataArray);
}
