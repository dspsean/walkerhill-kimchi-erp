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

// ============================================================
// 🔧 개발 모드 로그 (프로덕션에서는 자동 비활성화)
// ============================================================
const DEBUG = false;
const log = DEBUG ? console.log : () => {};
const warn = DEBUG ? console.warn : () => {};

if (isSupabaseConfigured) {
  console.log('%c🟢 Supabase 연결 준비 완료!', 'background: #15803D; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
} else {
  console.error('%c❌ Supabase 설정되지 않음 - 로컬 모드로 동작', 'background: #B91C1C; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  console.error('⚠️ 다른 PC와 데이터 동기화 안 됩니다!');
  console.error('⚠️ 이 메시지가 보이면 supabase.js가 제대로 배포되지 않았거나 값이 비어있습니다.');
}

// ============================================================
// 📡 테이블 이름 상수
// ============================================================
export const TABLES = {
  customers: 'customers',
  items: 'items',
  orders: 'orders',
  drivers: 'drivers',
  auditLogs: 'audit_logs',  // 🆕 변경 이력 추적
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
        warn(`⚠️ ${tableName}: 20,000건 초과, 페이지네이션 중단`);
        break;
      }
    }

    if (allData.length > PAGE_SIZE) {
      log(`✓ ${tableName}: 페이지네이션으로 ${allData.length}건 모두 로드`);
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

  let realtimeWorking = false;  // Realtime이 작동하는지 추적
  let pollingInterval = null;
  let subscribeStartTime = Date.now();

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
        log(`Error in throttledFetch for ${tableName}:`, err);
      }
    }, 500);
  };

  // 💡 Fallback 폴링 (Realtime 안 될 때를 대비)
  // 30초마다 데이터 확인 - 다른 PC의 변경사항 반영
  const startPolling = () => {
    if (pollingInterval) return;
    log(`🔄 ${tableName} 폴링 모드 시작 (30초 주기)`);
    pollingInterval = setInterval(async () => {
      const now = Date.now();
      const suppressUntil = _suppressFetchUntil[tableName] || 0;
      if (now < suppressUntil) return;  // 방금 저장한 건 폴링하지 않음
      try {
        const fresh = await fetchAll(tableName);
        onChange(fresh);
      } catch (err) {
        log(`Error in polling ${tableName}:`, err);
      }
    }, 30000);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // 초기 데이터 로드 + 이후 변경 감지
  const channel = supabase
    .channel(`${tableName}-changes-${Date.now()}`)  // 고유 채널명으로 충돌 방지
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        log(`📨 ${tableName} 실시간 변경 감지:`, payload.eventType);
        realtimeWorking = true;
        stopPolling();  // Realtime 확인되면 폴링 중지
        throttledFetch();
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        log(`✓ ${tableName} 구독 시작`);
        _recentFetches[tableName] = Date.now();
        fetchAll(tableName).then(fresh => {
          const map = {};
          fresh.forEach(row => {
            if (row.id) map[row.id] = JSON.stringify(row);
          });
          _lastSavedRows[tableName] = map;
          onChange(fresh);
        });
        // Realtime 테스트: 10초 내 이벤트 안 오면 폴링 시작
        setTimeout(() => {
          if (!realtimeWorking) {
            warn(`⚠️ ${tableName} Realtime 이벤트 미확인 - 폴링 모드로 fallback`);
            startPolling();
          }
        }, 10000);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        warn(`❌ ${tableName} 구독 상태:`, status);
        startPolling();  // 실패 시 즉시 폴링 시작
        if (onError) onError(err || new Error(status));
      } else if (status === 'CLOSED') {
        log(`🔌 ${tableName} 채널 닫힘`);
      }
    });

  return () => {
    stopPolling();
    if (_fetchAllTimers[tableName]) {
      clearTimeout(_fetchAllTimers[tableName]);
      delete _fetchAllTimers[tableName];
    }
    supabase.removeChannel(channel);
  };
}

/**
 * 🆕 수동 새로고침 - 모든 테이블 최신 데이터 재조회
 * 실시간이 안 될 때 사용자가 수동으로 새로 불러올 수 있게
 */
export async function refreshAllTables(tableNames, onUpdate) {
  if (!supabase) return;
  const results = {};
  for (const name of tableNames) {
    try {
      const data = await fetchAll(name);
      results[name] = data;
      if (onUpdate) onUpdate(name, data);
    } catch (err) {
      console.error(`Error refreshing ${name}:`, err);
    }
  }
  return results;
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
  if (!supabase || !rows || rows.length === 0) return { success: true, saved: 0 };

  // debounce 500ms로 연속 호출 묶기
  if (_saveBatchTimers[tableName]) {
    clearTimeout(_saveBatchTimers[tableName]);
  }

  return new Promise((resolve, reject) => {
    _saveBatchTimers[tableName] = setTimeout(() => {
      // 🚀 UI 블로킹 방지: requestIdleCallback으로 백그라운드 실행
      const runInBackground = () => {
        _saveBatchInternal(tableName, rows).then(resolve).catch(err => {
          console.error(`❌ saveBatch ${tableName} 에러:`, err);
          reject(err);  // 🔑 에러를 호출자에게 전파!
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
  // ⚠️ 30초는 너무 김 → 5초로 단축 (다른 PC의 변경이 너무 오래 차단되던 문제)
  _suppressFetchUntil[tableName] = Date.now() + 5000;

  // items 테이블의 경우 code를 id로 사용
  const normalizedRows = rows.map(row => {
    if (!row.id && row.code) {
      return { ...row, id: row.code };
    }
    return row;
  });

  // 🚀 Diff 체크 - 정확한 비교로 불필요한 업로드 방지
  // ⚠️ 대용량(4000+건)도 JSON.stringify 비교 필수
  const prevMap = _lastSavedRows[tableName] || {};
  const currentMap = {};
  const changedRows = [];
  const deletedIds = [];  // 🆕 삭제할 ID들

  // 🔑 첫 저장 여부 판단: 이전 맵이 비어있으면 초기 구독 전
  const isFirstSave = Object.keys(prevMap).length === 0;

  // 1. 추가/수정 감지
  for (const row of normalizedRows) {
    if (!row.id) continue;
    const rowJson = JSON.stringify(row);
    currentMap[row.id] = rowJson;
    if (isFirstSave || prevMap[row.id] !== rowJson) {
      changedRows.push(row);
    }
  }

  // 2. 🆕 삭제 감지: 이전엔 있었는데 지금은 없는 ID
  if (!isFirstSave) {
    for (const id of Object.keys(prevMap)) {
      if (!currentMap[id]) {
        deletedIds.push(id);
      }
    }
  }

  if (changedRows.length === 0 && deletedIds.length === 0) {
    _lastSavedRows[tableName] = currentMap;
    _suppressFetchUntil[tableName] = 0;  // 즉시 해제
    return { success: true, saved: 0, total: rows.length };
  }

  if (deletedIds.length > 0) {
    log(`🗑️ ${tableName}: ${deletedIds.length}건 삭제 + ${changedRows.length}건 업로드 중...`);
  } else {
    log(`📤 ${tableName}: ${changedRows.length}/${rows.length}건 변경됨, 업로드 중...`);
  }

  // 청크 업로드
  const CHUNK_SIZE = 50;
  const DELAY_MS = 300;
  const MAX_RETRIES = 3;

  // 🆕 1. 먼저 삭제 처리 (IN 연산자로 배치 삭제)
  if (deletedIds.length > 0) {
    const DELETE_CHUNK = 500;  // 삭제는 한 번에 많이 처리 가능
    for (let i = 0; i < deletedIds.length; i += DELETE_CHUNK) {
      const chunkIds = deletedIds.slice(i, i + DELETE_CHUNK);
      let retries = 0;
      let success = false;

      while (!success && retries < MAX_RETRIES) {
        try {
          const { error } = await supabase.from(tableName).delete().in('id', chunkIds);
          if (error) throw error;
          success = true;
          _suppressFetchUntil[tableName] = Date.now() + 5000;
          log(`  🗑️ ${tableName}: ${Math.min(i + DELETE_CHUNK, deletedIds.length)}/${deletedIds.length} 삭제 완료`);
        } catch (err) {
          retries++;
          if (retries < MAX_RETRIES) {
            warn(`  ⚠️ ${tableName} 삭제 청크 실패 (재시도 ${retries}/${MAX_RETRIES})`, err.message);
            await new Promise(r => setTimeout(r, 2000));
          } else {
            console.error(`  ❌ ${tableName} 삭제 청크 최종 실패:`, err);
            throw err;
          }
        }
      }
      if (i + DELETE_CHUNK < deletedIds.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }
    log(`✓ ${tableName}: ${deletedIds.length}건 삭제 완료`);
  }

  // 2. 추가/수정 upsert
  const chunks = [];
  for (let i = 0; i < changedRows.length; i += CHUNK_SIZE) {
    chunks.push(changedRows.slice(i, i + CHUNK_SIZE));
  }

  let uploadedCount = 0;
  let failedChunks = 0;

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    let retries = 0;
    let success = false;
    let lastError = null;

    while (!success && retries < MAX_RETRIES) {
      try {
        const { error } = await supabase.from(tableName).upsert(chunk);
        if (error) throw error;
        uploadedCount += chunk.length;
        success = true;
        _suppressFetchUntil[tableName] = Date.now() + 5000;

        if (chunks.length > 5 && idx % 5 === 0) {
          log(`  ⏳ ${tableName}: ${uploadedCount}/${changedRows.length} (${Math.round(uploadedCount / changedRows.length * 100)}%)`);
        }
      } catch (err) {
        lastError = err;
        retries++;
        if (retries < MAX_RETRIES) {
          warn(`  ⚠️ ${tableName} 청크 ${idx + 1} 실패 (재시도 ${retries}/${MAX_RETRIES})`, err.message);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.error(`  ❌ ${tableName} 청크 ${idx + 1} 최종 실패:`, err);
          failedChunks++;
          // 🔑 최종 실패는 throw로 전파
          throw err;
        }
      }
    }

    if (idx < chunks.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  _lastSavedRows[tableName] = currentMap;
  if (deletedIds.length > 0) {
    log(`✓ ${tableName} 업로드 ${uploadedCount}건 + 삭제 ${deletedIds.length}건 완료`);
  } else {
    log(`✓ ${tableName} ${uploadedCount}/${changedRows.length}건 업로드 완료`);
  }
  _suppressFetchUntil[tableName] = Date.now() + 3000;

  return { success: true, saved: uploadedCount, deleted: deletedIds.length, total: rows.length };
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

// ============================================================
// 📋 변경 이력 (Audit Log) 전용 함수
// ============================================================
// - saveBatch와 분리된 즉시 저장 (debounce 없음)
// - "누가 언제 뭘 바꿨나" 추적
// ============================================================

/**
 * 감사 로그 기록 (저장 실패해도 앱 동작에 영향 없음)
 */
export async function logAudit(entry) {
  if (!supabase) return;
  try {
    const logEntry = {
      id: entry.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_name: entry.userName || 'unknown',
      timestamp: entry.timestamp || new Date().toISOString(),
      action: entry.action || 'update',  // create/update/delete/bulk
      entity_type: entry.entityType || 'unknown',  // order/customer/item/driver/gift/batch
      entity_id: entry.entityId || null,
      entity_name: entry.entityName || null,
      description: entry.description || '',
      changes: entry.changes || null,  // JSONB
    };
    const { error } = await supabase.from(TABLES.auditLogs).insert(logEntry);
    if (error) throw error;
    log(`📋 이력 기록: ${logEntry.description}`);
  } catch (err) {
    // 감사 로그 실패는 조용히 (앱 동작 방해 X)
    console.error('Audit log error:', err.message);
  }
}

/**
 * 감사 로그 조회 (최근순)
 */
export async function fetchAuditLogs({ limit = 100, userName, entityType, fromDate } = {}) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from(TABLES.auditLogs)
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (userName) query = query.eq('user_name', userName);
    if (entityType) query = query.eq('entity_type', entityType);
    if (fromDate) query = query.gte('timestamp', fromDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    return [];
  }
}
