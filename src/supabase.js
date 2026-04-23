// ============================================================
// 🟢 Supabase 설정
// ============================================================
// Supabase Dashboard → Settings → API 에서 복사한 정보 입력
// ============================================================

import { createClient } from '@supabase/supabase-js';

// 🔧 Supabase Config - Walkerhill-kimchi 프로젝트
const SUPABASE_URL = "https://ryszqdyygjvpooczifvf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5c3pxZHl5Z2p2cG9vY3ppZnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDA4MzMsImV4cCI6MjA5MjUxNjgzM30.fwhOdCWwObtNAUaDptCxON8SzIwxFPmCAmYGWAKw3SY";

// 설정 확인
export const isSupabaseConfigured =
  SUPABASE_URL !== "YOUR_SUPABASE_URL_HERE" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY_HERE";

// Supabase 클라이언트 생성
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log('🟢 Supabase 연결 준비 완료!');
} else {
  console.log('ℹ️ Supabase 미설정 - 로컬 모드로 동작');
}

// ============================================================
// 📡 테이블 이름 상수
// ============================================================
export const TABLES = {
  customers: 'customers',
  items: 'items',
  orders: 'orders',
  drivers: 'drivers',
};

// ============================================================
// 🔄 데이터 동기화 함수
// ============================================================

/**
 * 테이블 전체 조회
 */
export async function fetchAll(tableName) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`Error fetching ${tableName}:`, err);
    return [];
  }
}

/**
 * 실시간 구독 (테이블 변경 감지)
 * @param {string} tableName - 테이블 이름
 * @param {Function} onChange - 변경 시 호출 (전체 데이터 다시 조회 후 전달)
 * @param {Function} onError - 에러 콜백
 * @returns {Function} unsubscribe 함수
 */
export function subscribeToTable(tableName, onChange, onError) {
  if (!supabase) return () => {};

  // 초기 데이터 로드 + 이후 변경 감지
  const channel = supabase
    .channel(`${tableName}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      async (payload) => {
        // 변경 발생 시 전체 데이터 다시 조회
        const fresh = await fetchAll(tableName);
        onChange(fresh);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✓ ${tableName} 실시간 구독 시작`);
        // 초기 데이터 로드
        fetchAll(tableName).then(onChange);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`${tableName} 구독 에러:`, err);
        if (onError) onError(err || new Error(status));
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 단일 row upsert (있으면 업데이트, 없으면 삽입)
 */
export async function upsertRow(tableName, row) {
  if (!supabase || !row.id) return;
  try {
    const { error } = await supabase.from(tableName).upsert(row);
    if (error) throw error;
  } catch (err) {
    console.error(`Error upserting to ${tableName}:`, err);
  }
}

/**
 * 여러 row 일괄 upsert (Diff 기반 - 변경된 것만)
 */
const _saveBatchTimers = {};
const _lastSavedRows = {};

export async function saveBatch(tableName, rows) {
  if (!supabase || !rows || rows.length === 0) return;

  // debounce 500ms
  if (_saveBatchTimers[tableName]) {
    clearTimeout(_saveBatchTimers[tableName]);
  }

  return new Promise((resolve) => {
    _saveBatchTimers[tableName] = setTimeout(async () => {
      try {
        // 변경된 row만 필터
        const prevMap = _lastSavedRows[tableName] || {};
        const currentMap = {};
        const changedRows = [];

        rows.forEach(row => {
          if (!row.id) return;
          const rowJson = JSON.stringify(row);
          currentMap[row.id] = rowJson;
          if (prevMap[row.id] !== rowJson) {
            changedRows.push(row);
          }
        });

        if (changedRows.length === 0) {
          _lastSavedRows[tableName] = currentMap;
          resolve();
          return;
        }

        console.log(`📤 ${tableName}: ${changedRows.length}/${rows.length}건 변경됨, 업로드 중...`);

        // Supabase upsert는 한 번에 1000건까지 가능
        const chunks = [];
        for (let i = 0; i < changedRows.length; i += 500) {
          chunks.push(changedRows.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const { error } = await supabase.from(tableName).upsert(chunk);
          if (error) throw error;
        }

        _lastSavedRows[tableName] = currentMap;
        console.log(`✓ ${tableName} ${changedRows.length}건 업로드 완료`);
        resolve();
      } catch (err) {
        console.error(`Error batch saving ${tableName}:`, err);
        resolve();
      }
    }, 500);
  });
}

/**
 * Row 삭제
 */
export async function deleteRow(tableName, id) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error(`Error deleting ${tableName}/${id}:`, err);
  }
}
