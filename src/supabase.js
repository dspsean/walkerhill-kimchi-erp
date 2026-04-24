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
 * 테이블 전체 조회 (페이지네이션으로 1,000개 제한 우회)
 * Supabase 기본 limit가 1,000이므로 range()로 나눠서 모두 가져옴
 */
export async function fetchAll(tableName) {
  if (!supabase) return [];
  try {
    const PAGE_SIZE = 1000;
    let allData = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;  // 풀 페이지면 다음 페이지 있음
      } else {
        hasMore = false;
      }

      // 안전장치: 최대 20,000행 (20 페이지)
      if (from >= 20000) {
        console.warn(`⚠️ ${tableName}: 20,000건 초과, 페이지네이션 중단`);
        break;
      }
    }

    if (allData.length > PAGE_SIZE) {
      console.log(`✓ ${tableName}: 페이지네이션으로 ${allData.length}건 모두 로드`);
    }

    return allData;
  } catch (err) {
    console.error(`Error fetching ${tableName}:`, err);
    return [];
  }
}

/**
 * 실시간 구독 (테이블 변경 감지)
 */
// 🔧 fetchAll debounce + echo 방지 (무한 루프/스파이럴 차단)
const _fetchAllTimers = {};
const _recentFetches = {};
const _suppressFetchUntil = {}; // 저장 후 echo 무시용
const _saveBatchTimers = {};
const _lastSavedRows = {};  // 🔑 diff 비교용 (saveBatch와 subscribeToTable 공유)

// 저장 직후 호출하면 지정된 시간 동안 realtime echo 무시
export function suppressRealtimeEcho(tableName, durationMs = 3000) {
  _suppressFetchUntil[tableName] = Date.now() + durationMs;
}

export function subscribeToTable(tableName, onChange, onError) {
  if (!supabase) return () => {};

  // 스로틀된 fetch (1초에 최대 1번만 호출)
  const throttledFetch = async () => {
    const now = Date.now();
    const lastFetch = _recentFetches[tableName] || 0;
    const suppressUntil = _suppressFetchUntil[tableName] || 0;

    // 저장 직후 echo는 무시
    if (now < suppressUntil) {
      return;
    }

    // 1초 이내에 이미 fetch했으면 스킵
    if (now - lastFetch < 1000) {
      return;
    }

    // 기존 타이머 취소 (debounce 500ms)
    if (_fetchAllTimers[tableName]) {
      clearTimeout(_fetchAllTimers[tableName]);
    }

    _fetchAllTimers[tableName] = setTimeout(async () => {
      _recentFetches[tableName] = Date.now();
      try {
        const fresh = await fetchAll(tableName);
        onChange(fresh);
      } catch (err) {
        console.error(`Error in throttledFetch for ${tableName}:`, err);
      }
    }, 500);
  };

  // 초기 데이터 로드 + 이후 변경 감지
  const channel = supabase
    .channel(`${tableName}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      () => {
        throttledFetch();
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✓ ${tableName} 실시간 구독 시작`);
        _recentFetches[tableName] = Date.now();
        fetchAll(tableName).then(fresh => {
          // 🚀 초기 데이터로 lastSavedRows 초기화 (불필요한 전체 재업로드 방지)
          const map = {};
          fresh.forEach(row => {
            if (row.id) map[row.id] = JSON.stringify(row);
          });
          _lastSavedRows[tableName] = map;
          onChange(fresh);
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`${tableName} 구독 상태:`, status);
        if (onError) onError(err || new Error(status));
      }
    });

  return () => {
    if (_fetchAllTimers[tableName]) {
      clearTimeout(_fetchAllTimers[tableName]);
      delete _fetchAllTimers[tableName];
    }
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
export async function saveBatch(tableName, rows) {
  if (!supabase || !rows || rows.length === 0) return;

  // debounce 500ms로 연속 호출 묶기
  if (_saveBatchTimers[tableName]) {
    clearTimeout(_saveBatchTimers[tableName]);
  }

  return new Promise((resolve) => {
    _saveBatchTimers[tableName] = setTimeout(() => {
      // 🚀 UI 블로킹 방지: requestIdleCallback으로 백그라운드 실행
      const runInBackground = () => {
        _saveBatchInternal(tableName, rows).then(resolve).catch(err => {
          console.error(`Error in saveBatch ${tableName}:`, err);
          resolve();
        });
      };

      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(runInBackground, { timeout: 2000 });
      } else {
        setTimeout(runInBackground, 0);
      }
    }, 500);
  });
}

// 실제 저장 로직 분리 (백그라운드 실행)
async function _saveBatchInternal(tableName, rows) {
  // 🛡️ 업로드 진행 중에는 echo suppress 유지 (덮어쓰기 방지)
  _suppressFetchUntil[tableName] = Date.now() + 30000; // 일단 30초로 확장

  try {
    // items 테이블의 경우 code를 id로 사용
    const normalizedRows = rows.map(row => {
      if (!row.id && row.code) {
        return { ...row, id: row.code };
      }
      return row;
    });

    // 🚀 Diff 체크 최적화: 큰 테이블은 JSON.stringify 대신 참조 비교
    const prevMap = _lastSavedRows[tableName] || {};
    const currentMap = {};
    const changedRows = [];

    // 작은 배치면 stringify diff, 큰 배치는 ID 기반 간이 diff
    const USE_DEEP_DIFF = normalizedRows.length < 500;

    for (const row of normalizedRows) {
      if (!row.id) continue;
      if (USE_DEEP_DIFF) {
        const rowJson = JSON.stringify(row);
        currentMap[row.id] = rowJson;
        if (prevMap[row.id] !== rowJson) {
          changedRows.push(row);
        }
      } else {
        // 대용량은 updatedAt만 비교 (약식)
        const prev = prevMap[row.id];
        const rowSig = `${row.updatedAt || ''}_${row.id}`;
        currentMap[row.id] = rowSig;
        if (prev !== rowSig) {
          changedRows.push(row);
        }
      }
    }

    if (changedRows.length === 0) {
      _lastSavedRows[tableName] = currentMap;
      // 저장할 것 없으면 suppress 즉시 해제
      _suppressFetchUntil[tableName] = 0;
      return;
    }

    console.log(`📤 ${tableName}: ${changedRows.length}/${rows.length}건 변경됨, 업로드 중...`);

    // 청크 업로드
    const CHUNK_SIZE = 50;
    const DELAY_MS = 300;
    const MAX_RETRIES = 3;
    const chunks = [];
    for (let i = 0; i < changedRows.length; i += CHUNK_SIZE) {
      chunks.push(changedRows.slice(i, i + CHUNK_SIZE));
    }

    let uploadedCount = 0;
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      let retries = 0;
      let success = false;

      while (!success && retries < MAX_RETRIES) {
        try {
          const { error } = await supabase.from(tableName).upsert(chunk);
          if (error) throw error;
          uploadedCount += chunk.length;
          success = true;
          // 🛡️ 업로드 중에도 suppress 갱신 (Realtime echo 방지)
          _suppressFetchUntil[tableName] = Date.now() + 5000;

          if (chunks.length > 5 && idx % 5 === 0) {
            console.log(`  ⏳ ${tableName}: ${uploadedCount}/${changedRows.length} (${Math.round(uploadedCount / changedRows.length * 100)}%)`);
          }
        } catch (err) {
          retries++;
          if (retries < MAX_RETRIES) {
            console.warn(`  ⚠️ ${tableName} 청크 ${idx + 1} 실패 (재시도 ${retries}/${MAX_RETRIES})`, err.message);
            await new Promise(r => setTimeout(r, 2000));
          } else {
            console.error(`  ❌ ${tableName} 청크 ${idx + 1} 최종 실패:`, err);
            break;
          }
        }
      }

      if (idx < chunks.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    _lastSavedRows[tableName] = currentMap;
    console.log(`✓ ${tableName} ${uploadedCount}/${changedRows.length}건 업로드 완료`);

    // 🛡️ 업로드 완료 후에도 echo가 돌아올 시간 확보 (Supabase Realtime 지연 고려)
    _suppressFetchUntil[tableName] = Date.now() + 5000;
  } catch (err) {
    console.error(`Error batch saving ${tableName}:`, err);
    // 에러 시에도 suppress는 유지 (부분 업로드된 데이터 보호)
  }
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
