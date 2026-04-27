import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
import { Search, Plus, Edit2, Trash2, Copy, Check, Package, Users, ShoppingCart, Truck, BarChart3, Download, X, Send, AlertTriangle, TrendingUp, Bell, FileDown, RotateCcw, History, LogOut, Cloud, CloudOff, Save, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  isSupabaseConfigured,
  subscribeToTable,
  saveBatch,
  suppressRealtimeEcho,
  refreshAllTables,
  fetchAll,
  logAudit,
  fetchAuditLogs,
  getSetting,
  setSetting,
  getAllSettings,
  subscribeToSettings,
  TABLES,
} from './supabase.js';

// ============================================================
// 📦 초기 데이터 - initialData.js에서 로드 (파일 분리로 성능 개선)
// ============================================================
import { INITIAL_CUSTOMERS, INITIAL_ITEMS, INITIAL_ORDERS } from './initialData.js';

// ============================================================
// 🔧 개발 모드 로그 (프로덕션에서는 자동 비활성화)
// ============================================================
const DEBUG = false;  // true로 변경하면 디버그 로그 표시
const log = DEBUG ? console.log : () => {};
const warn = DEBUG ? console.warn : () => {};
// console.error는 항상 유지 (에러는 반드시 봐야 함)


const STORAGE_KEYS = { customers: 'wh:v6:customers', items: 'wh:v6:items', orders: 'wh:v6:orders' };

// 크롬/공유링크에서는 localStorage 사용, Claude 환경에서는 window.storage 사용
async function loadData(key, fallback) {
  // 먼저 localStorage 시도 (크롬에서 잘 작동)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = window.localStorage.getItem(key);
      if (local) return JSON.parse(local);
    }
  } catch (e) { warn('localStorage read failed', e); }
  // Claude의 window.storage 시도
  try {
    if (typeof window !== 'undefined' && window.storage && window.storage.get) {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : fallback;
    }
  } catch (e) { warn('window.storage read failed', e); }
  return fallback;
}

async function saveData(key, data) {
  const jsonStr = JSON.stringify(data);
  // localStorage에 저장 (크롬에서 잘 작동)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, jsonStr);
    }
  } catch (e) { warn('localStorage write failed', e); }
  // window.storage에도 저장 (Claude 환경 호환)
  try {
    if (typeof window !== 'undefined' && window.storage && window.storage.set) {
      await window.storage.set(key, jsonStr);
    }
  } catch (e) { warn('window.storage write failed', e); }
}

async function deleteData(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) { warn('localStorage delete failed', e); }
  try {
    if (typeof window !== 'undefined' && window.storage && window.storage.delete) {
      await window.storage.delete(key);
    }
  } catch (e) { warn('window.storage delete failed', e); }
}

const formatWon = (n) => '$' + new Intl.NumberFormat('en-AU').format(n || 0);
const formatNum = (n) => new Intl.NumberFormat('ko-KR').format(n || 0);

// ============================================================
// 🚚 배송료 정책: 주문자 총 구매액 < $100 → $10 배송료 추가
// ============================================================
const SHIPPING_THRESHOLD = 100;
const SHIPPING_FEE = 10;

// 특정 고객의 해당 주문이 배송료 부과 대상인지 판단
// 기준: 같은 고객의 전체 주문 합계가 $100 미만
function getShippingFee(customerId, orders, items) {
  const priceMap = {};
  items.forEach(i => { priceMap[i.name] = i.price || 0; });
  const totalOrderAmount = orders
    .filter(o => o.customerId === customerId)
    .reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);
  return totalOrderAmount < SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
}

// ============================================================
// 🎁 사은품 이벤트 관리
// ============================================================
const GIFT_STORAGE_KEY = 'wh:v6:gifts';

// 이벤트별 사은품 데이터 구조
// { id, name, description, totalStock, remaining, tiers, active, startDate, endDate, createdAt }
const INITIAL_GIFTS = [];

// 기본 지급 기준 템플릿
const DEFAULT_GIFT_TIERS = [
  { minAmount: 100, qty: 1 },  // $100 이상 → 1개
];

// 현재 활성 사은품 이벤트 가져오기
function getActiveGift(gifts) {
  return gifts.find(g => g.active && g.remaining > 0) || null;
}

// 🎁 사은품 지급 현황 계산 (대시보드/사은품 페이지 공통)
// - giftId 매칭 우선 + 이름 fallback (과거 데이터 호환)
// - 취소 주문만 제외 (B2B/입고대기/서비스 모두 포함 - 재고 나감)
// - 🆕 입고대기 상태는 "예약", 그 외는 "지급완료"로 자동 분류
function calcGiftStats(gift, orders) {
  if (!gift) return {
    givenQty: 0, recipientCount: 0,
    reservedQty: 0, reservedCount: 0,
    totalUsed: 0, totalRecipients: 0,
    remaining: 0, linkedOrders: []
  };

  const linkedOrders = orders.filter(o => {
    if (o.shipStatus === '취소') return false;
    if (!o.giftQty || o.giftQty <= 0) return false;
    // ID 매칭 우선
    if (o.giftId && o.giftId === gift.id) return true;
    // ID 없으면 이름으로 매칭 (과거 데이터 안전망)
    if (!o.giftId && o.giftName && o.giftName === gift.name) return true;
    return false;
  });

  // 🆕 입고대기 = 예약, 그 외 = 지급완료 (자동 분류)
  const givenOrders = linkedOrders.filter(o => o.shipStatus !== '입고대기');
  const reservedOrders = linkedOrders.filter(o => o.shipStatus === '입고대기');

  const givenQty = givenOrders.reduce((s, o) => s + (o.giftQty || 0), 0);
  const recipientCount = new Set(givenOrders.map(o => o.customerId)).size;

  const reservedQty = reservedOrders.reduce((s, o) => s + (o.giftQty || 0), 0);
  const reservedCount = new Set(reservedOrders.map(o => o.customerId)).size;

  const totalUsed = givenQty + reservedQty;
  const totalRecipients = new Set(linkedOrders.map(o => o.customerId)).size;
  const remaining = Math.max(0, (gift.totalStock || 0) - totalUsed);

  return {
    givenQty, recipientCount,
    reservedQty, reservedCount,
    totalUsed, totalRecipients,
    remaining, linkedOrders,
  };
}

// 주문 합계 기반 사은품 자동 수량 계산
function calcGiftQtyByAmount(orderTotal, tiers) {
  if (!tiers || tiers.length === 0) return 0;
  // 금액 기준 내림차순 정렬
  const sorted = [...tiers].sort((a, b) => b.minAmount - a.minAmount);
  for (const tier of sorted) {
    if (orderTotal >= tier.minAmount) return tier.qty;
  }
  return 0;
}

// 주문의 사은품 수량 결정 (자동 + 수동 추가)
// autoQty: 주문액 기준 자동 계산
// manualExtra: 관리자가 수동으로 추가 (단골/VIP)
// 우선순위: 주문의 giftQty 필드 있으면 그대로, 없으면 자동 계산
function resolveGiftQty(order, activeGift, orderTotal) {
  if (!activeGift) return 0;
  // 명시적으로 설정된 값이 있으면 그대로 사용 (0 포함)
  if (order && typeof order.giftQty === 'number') return order.giftQty;
  // 아니면 자동 계산
  return calcGiftQtyByAmount(orderTotal, activeGift.tiers || DEFAULT_GIFT_TIERS);
}

// ============================================================
// 🏆 고객등급 자동 계산: VIP $2,000+ / 우수 $500+ / 일반
// 🆕 B2B 거래처는 자동 등급 계산 제외 (항상 '일반')
// ============================================================
const GRADE_VIP_THRESHOLD = 2000;
const GRADE_PREMIUM_THRESHOLD = 500;

function calcCustomerGrade(customerId, orders, items, customer) {
  // B2B는 자동 등급 계산 제외
  if (customer && customer.isB2B) return '일반';
  const priceMap = {};
  items.forEach(i => { priceMap[i.name] = i.price || 0; });
  const total = orders
    .filter(o => o.customerId === customerId)
    .reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);
  if (total >= GRADE_VIP_THRESHOLD) return 'VIP';
  if (total >= GRADE_PREMIUM_THRESHOLD) return '우수';
  return '일반';
}

// ============================================================
// 🏢 B2B 거래처 관련 설정
// ============================================================

// 결제 조건
const PAYMENT_TERMS = {
  IMMEDIATE: '즉시결제',
  MONTHLY: '월말정산',
  NET_7: '7일 이내',
  NET_14: '14일 이내',
  NET_30: '30일 이내',
};

// B2B 주문에 추가되는 배송 상태
const B2B_SHIP_STATUS = ['입고대기', '부분배송', '전량배송'];

// 거래처별 할인율 적용 단가 계산
function getB2BPrice(basePrice, discountRate) {
  if (!discountRate || discountRate <= 0) return basePrice;
  return Math.round(basePrice * (1 - discountRate / 100));
}

// 🎯 실제 판매 단가 계산 (B2C/B2B 자동 판단 + 상품별 오버라이드 우선)
// 우선순위: ① 거래처별 상품 오버라이드 > ② 상품 기본 B2B가 > ③ 거래처 할인율 적용가 > ④ B2C 정가
function getEffectivePrice(item, customer) {
  if (!item) return 0;
  const basePrice = item.price || 0;

  // B2B 고객
  if (customer?.isB2B) {
    // ① 거래처별 상품 오버라이드
    const override = customer.itemPriceOverrides?.[item.code];
    if (override !== undefined && override !== null && override > 0) {
      return override;
    }
    // ② 상품 기본 B2B 도매가
    if (item.b2bPrice && item.b2bPrice > 0) {
      return item.b2bPrice;
    }
    // ③ 거래처 전체 할인율
    if (customer.b2bDiscount > 0) {
      return getB2BPrice(basePrice, customer.b2bDiscount);
    }
  }

  // ④ B2C 정가 (기본)
  return basePrice;
}

// 주문이 B2B인지 확인 (customer 기반)
function isB2BOrder(order, customerMap) {
  const c = customerMap[order.customerId];
  return !!(c && c.isB2B);
}

// 거래처 미수금 계산
function calcB2BReceivable(customerId, orders, items) {
  const priceMap = {};
  items.forEach(i => { priceMap[i.name] = i.price || 0; });
  return orders
    .filter(o => o.customerId === customerId && !o.isService && o.shipStatus !== '취소')
    .reduce((sum, o) => {
      const total = (priceMap[o.itemName] || 0) * o.qty;
      const paid = o.cashReceived || 0;
      return sum + Math.max(0, total - paid);
    }, 0);
}

// ============================================================
// 🗺️ 배송 Zone 설정 (엑셀 Zone A~H 기준)
// ============================================================
const SHIPPING_ZONES = ['Zone1', 'Zone2', 'Zone3', 'Zone4', 'Zone5', 'Zone6', 'Zone7', 'Zone8'];
const ZONE_COLORS = {
  'Zone1': 'bg-red-100 text-red-700',
  'Zone2': 'bg-orange-100 text-orange-700',
  'Zone3': 'bg-amber-100 text-amber-700',
  'Zone4': 'bg-emerald-100 text-emerald-700',
  'Zone5': 'bg-blue-100 text-blue-700',
  'Zone6': 'bg-violet-100 text-violet-700',
  'Zone7': 'bg-pink-100 text-pink-700',
  'Zone8': 'bg-teal-100 text-teal-700',
};

// 차량 라벨 (Zone → 차량)
const ZONE_VEHICLE = {
  'Zone1': '차량A', 'Zone2': '차량B', 'Zone3': '차량C', 'Zone4': '차량D',
  'Zone5': '차량E', 'Zone6': '차량F', 'Zone7': '차량G', 'Zone8': '차량H',
};

// 지역 설명
const ZONE_REGIONS = {
  'Zone1': '차량1 · Day 1  │  서부 (Marsden Park 퇴근)',
  'Zone2': '차량1 · Day 2  │  서부 (Marsden Park 퇴근)',
  'Zone3': '차량1 · Day 3  │  서부 (Marsden Park 퇴근)',
  'Zone4': '차량2 · Day 1  │  동부 (Newington 퇴근)',
  'Zone5': '차량2 · Day 2  │  동부 (Newington 퇴근)',
  'Zone6': '차량2 · Day 3  │  동부 (Newington 퇴근)',
  'Zone7': '단시간 알바 배송구역',
  'Zone8': '(미사용)',
};

// 배송 출발지
const DEPARTURE_ADDRESS = '36 Middural Rd, Dural';

// Zone별 배송일 오프셋 (2그룹씩 4일간 배송)
// Day 1: Zone1, Zone2 / Day 2: Zone3, Zone4 / Day 3: Zone5, Zone6 / Day 4: Zone7, Zone8
const ZONE_DAY_OFFSET = {
  'Zone1': 0, 'Zone2': 0,  // Day 1
  'Zone3': 1, 'Zone4': 1,  // Day 2
  'Zone5': 2, 'Zone6': 2,  // Day 3
  'Zone7': 3, 'Zone8': 3,  // Day 4
};

const ZONE_DAY_LABEL = {
  'Zone1': 'Day 1', 'Zone2': 'Day 1',
  'Zone3': 'Day 2', 'Zone4': 'Day 2',
  'Zone5': 'Day 3', 'Zone6': 'Day 3',
  'Zone7': 'Day 4', 'Zone8': 'Day 4',
};

// 시작일 + Zone → 실제 출고일 계산
function calcShipDateByZone(startDate, zone) {
  if (!startDate || !zone) return startDate || '';
  const offset = ZONE_DAY_OFFSET[zone] || 0;
  const d = new Date(startDate);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// 요일 라벨
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function getDayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return DAY_LABELS[d.getDay()];
}

const koDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const days = ['일','월','화','수','목','금','토'];
  return `${date.getFullYear()}년 ${String(date.getMonth()+1).padStart(2,'0')}월 ${String(date.getDate()).padStart(2,'0')}일(${days[date.getDay()]})`;
};

function exportToExcel(customers, items, orders) {
  const wb = XLSX.utils.book_new();

  // 고객별 총 주문액 미리 계산 (배송료 판단용)
  const customerTotalMap = {};
  orders.forEach(o => {
    const it = items.find(i => i.name === o.itemName);
    customerTotalMap[o.customerId] = (customerTotalMap[o.customerId] || 0) + (it?.price || 0) * o.qty;
  });

  const orderData = orders.map(o => {
    const c = customers.find(x => x.id === o.customerId);
    const it = items.find(i => i.name === o.itemName);
    const total = (it?.price || 0) * o.qty;
    const isServ = !!o.isService;
    const isPick = !!o.isPickup;
    const customerTotal = customerTotalMap[o.customerId] || 0;
    // 픽업이면 배송료 없음
    const shippingFee = (!isServ && !isPick && customerTotal < SHIPPING_THRESHOLD) ? SHIPPING_FEE : 0;
    const actualSales = isServ ? 0 : total;
    return {
      '주문번호': o.id, '주문일': o.date, 'Zone': isPick ? '픽업' : (o.shippingGroup || ''), '고객ID': o.customerId,
      '성함': c?.name || '', '연락처': c?.phone || '', '주문내역': o.itemName,
      '수량': o.qty, '단가($)': it?.price || 0, '합계금액($)': actualSales,
      '서비스': isServ ? '🎁 서비스' : '', '서비스환산액($)': isServ ? total : 0,
      '픽업': isPick ? '📍 픽업' : '',
      '배송료($)': shippingFee, '총합계($)': actualSales + shippingFee,
      '배송상태': o.shipStatus || '', '배송방법': isPick ? '픽업' : (o.deliveryMethod || ''),
      '결제방식': isServ ? '' : (o.paymentType || ''), '결제상태': isServ ? '' : (o.paymentStatus || ''),
      '배송메모': o.deliveryMemo || '', '출고일': o.shipDate || '',
      '배송지': c?.address || '',
    };
  });
  const ws1 = XLSX.utils.json_to_sheet(orderData);
  ws1['!cols'] = [{wch:12},{wch:12},{wch:8},{wch:10},{wch:12},{wch:15},{wch:18},{wch:6},{wch:10},{wch:12},{wch:10},{wch:13},{wch:8},{wch:10},{wch:10},{wch:11},{wch:11},{wch:10},{wch:10},{wch:25},{wch:11},{wch:35}];
  XLSX.utils.book_append_sheet(wb, ws1, '주문관리');

  const customerData = customers.map(c => {
    const orderCount = orders.filter(o => o.customerId === c.id).length;
    const totalSpent = orders.filter(o => o.customerId === c.id).reduce((s, o) => {
      const it = items.find(i => i.name === o.itemName);
      return s + (it ? it.price * o.qty : 0);
    }, 0);
    // 자동등급 계산 (🆕 B2B 제외)
    const autoGrade = c.isB2B
      ? '일반'
      : (totalSpent >= GRADE_VIP_THRESHOLD ? 'VIP' : totalSpent >= GRADE_PREMIUM_THRESHOLD ? '우수' : '일반');
    return {
      '고객ID': c.id, '성함': c.name, '연락처': c.phone,
      'Aged Care': c.agedCare ? '✓' : '',
      '주소': c.address, '등급(자동)': autoGrade, '가입일': c.joinDate, '메모': c.memo,
      '총주문수': orderCount, '총구매액($)': totalSpent,
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(customerData);
  ws2['!cols'] = [{wch:10},{wch:12},{wch:15},{wch:10},{wch:38},{wch:10},{wch:12},{wch:20},{wch:10},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws2, '고객정보');

  const itemData = items.map(it => ({
    '품목코드': it.code, '품목명': it.name, '구성': it.spec, '단가($)': it.price,
    '실재고': it.isSet ? '세트' : it.realStock, '가용재고': it.availStock,
    '세트여부': it.isSet ? 'Y' : 'N', '배추구성수량': it.baechu,
    '총각구성수량': it.chonggak, '비고': it.memo,
  }));
  const ws3 = XLSX.utils.json_to_sheet(itemData);
  ws3['!cols'] = [{wch:10},{wch:15},{wch:25},{wch:12},{wch:10},{wch:10},{wch:10},{wch:12},{wch:12},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws3, '품목재고');

  const totalSales = orders.reduce((s, o) => {
    const it = items.find(i => i.name === o.itemName);
    return s + (it ? it.price * o.qty : 0);
  }, 0);
  const summaryData = [
    { '항목': '백업일시', '값': new Date().toLocaleString('ko-KR') },
    { '항목': '총 고객수', '값': customers.length + '명' },
    { '항목': 'VIP 고객수', '값': customers.filter(c => c.grade === 'VIP').length + '명' },
    { '항목': '우수 고객수', '값': customers.filter(c => c.grade === '우수').length + '명' },
    { '항목': '일반 고객수', '값': customers.filter(c => c.grade === '일반').length + '명' },
    { '항목': '신규 고객수', '값': customers.filter(c => c.grade === '신규').length + '명' },
    { '항목': '총 주문수', '값': orders.length + '건' },
    { '항목': '총 매출액', '값': '$' + totalSales.toLocaleString('en-AU') },
    { '항목': '평균 주문액', '값': '$' + (orders.length > 0 ? Math.round(totalSales / orders.length) : 0).toLocaleString('en-AU') },
    { '항목': '배송준비중', '값': orders.filter(o => o.shipStatus === '배송준비중').length + '건' },
    { '항목': '배송중', '값': orders.filter(o => o.shipStatus === '배송중').length + '건' },
    { '항목': '배송완료', '값': orders.filter(o => o.shipStatus === '배송완료').length + '건' },
  ];
  const ws4 = XLSX.utils.json_to_sheet(summaryData);
  ws4['!cols'] = [{wch:20},{wch:25}];
  XLSX.utils.book_append_sheet(wb, ws4, '요약');

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const filename = `워커힐김치_백업_${y}${m}${d}_${hh}${mm}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}

// ============================================================
// 📥 엑셀 백업 복원 - exportToExcel 양식을 역으로 파싱
// ============================================================
function importFromBackupExcel(wb) {
  const result = {
    customers: [],
    items: [],
    orders: [],
    valid: false,
    errors: [],
  };

  try {
    // 1. 고객정보 시트 파싱
    if (wb.Sheets['고객정보']) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['고객정보']);
      result.customers = rows.map(row => ({
        id: String(row['고객ID'] || ''),
        name: String(row['성함'] || ''),
        phone: String(row['연락처'] || ''),
        agedCare: row['Aged Care'] === '✓' || row['Aged Care'] === true,
        address: String(row['주소'] || ''),
        grade: String(row['등급(자동)'] || '일반'),
        joinDate: String(row['가입일'] || new Date().toISOString().slice(0, 10)),
        memo: String(row['메모'] || ''),
      })).filter(c => c.id && c.name);
    } else {
      result.errors.push('고객정보 시트를 찾을 수 없습니다');
    }

    // 2. 품목재고 시트 파싱
    if (wb.Sheets['품목재고']) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['품목재고']);
      result.items = rows.map(row => {
        const isSet = row['세트여부'] === 'Y' || row['세트여부'] === true;
        return {
          code: String(row['품목코드'] || ''),
          name: String(row['품목명'] || ''),
          spec: String(row['구성'] || ''),
          price: Number(row['단가($)']) || 0,
          realStock: isSet ? null : (Number(row['실재고']) || 0),
          baechu: Number(row['배추구성수량']) || 0,
          chonggak: Number(row['총각구성수량']) || 0,
          memo: String(row['비고'] || ''),
          isSet,
        };
      }).filter(i => i.code && i.name);
    } else {
      result.errors.push('품목재고 시트를 찾을 수 없습니다');
    }

    // 3. 주문관리 시트 파싱 (가장 복잡)
    if (wb.Sheets['주문관리']) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['주문관리']);
      result.orders = rows.map(row => {
        const isService = String(row['서비스'] || '').includes('서비스') || String(row['서비스'] || '').includes('🎁');
        const isPickup = String(row['픽업'] || '').includes('픽업') || String(row['픽업'] || '').includes('📍');
        const zone = String(row['Zone'] || '');
        return {
          id: String(row['주문번호'] || ''),
          date: String(row['주문일'] || ''),
          customerId: String(row['고객ID'] || ''),
          itemName: String(row['주문내역'] || ''),
          qty: Number(row['수량']) || 1,
          shipStatus: String(row['배송상태'] || '배송준비중'),
          deliveryMethod: String(row['배송방법'] || ''),
          paymentType: String(row['결제방식'] || ''),
          paymentStatus: String(row['결제상태'] || '미결제'),
          deliveryMemo: String(row['배송메모'] || ''),
          shipDate: String(row['출고일'] || ''),
          arriveDate: '',
          shippingGroup: zone === '픽업' ? '' : zone,
          isService,
          isPickup,
          cashReceived: 0,
        };
      }).filter(o => o.id && o.customerId);
    } else {
      result.errors.push('주문관리 시트를 찾을 수 없습니다');
    }

    // 유효성: 최소 하나의 시트가 성공적으로 파싱되어야 함
    result.valid = result.customers.length > 0 || result.items.length > 0 || result.orders.length > 0;

  } catch (e) {
    console.error('Backup parse error:', e);
    result.errors.push(e.message || '알 수 없는 오류가 발생했습니다');
  }

  return result;
}

function calcAvailStock(items, orders) {
  // 🔑 취소 주문은 재고 차감하지 않음 (서비스는 차감 = 실제 재고 나감)
  const activeOrders = orders.filter(o => o.shipStatus !== '취소');

  // 다품목 주문도 처리: items 배열이 있으면 그것을 사용, 없으면 단일 품목
  const calcItemQty = (itemName) => {
    let totalQty = 0;
    activeOrders.forEach(o => {
      if (o.items && Array.isArray(o.items) && o.items.length > 0) {
        // 다품목 주문
        o.items.forEach(subItem => {
          if (subItem.itemName === itemName) {
            totalQty += subItem.qty || 0;
          }
        });
      } else if (o.itemName === itemName) {
        totalQty += o.qty || 0;
      }
    });
    return totalQty;
  };

  const totalBaechu = activeOrders.reduce((s, o) => {
    // 다품목 주문: items 배열 순회
    if (o.items && Array.isArray(o.items) && o.items.length > 0) {
      return s + o.items.reduce((ss, si) => {
        const it = items.find(i => i.name === si.itemName);
        return ss + (it ? it.baechu * (si.qty || 0) : 0);
      }, 0);
    }
    // 단일 품목
    const it = items.find(i => i.name === o.itemName);
    return s + (it ? it.baechu * o.qty : 0);
  }, 0);

  const totalChonggak = activeOrders.reduce((s, o) => {
    if (o.items && Array.isArray(o.items) && o.items.length > 0) {
      return s + o.items.reduce((ss, si) => {
        const it = items.find(i => i.name === si.itemName);
        return ss + (it ? it.chonggak * (si.qty || 0) : 0);
      }, 0);
    }
    const it = items.find(i => i.name === o.itemName);
    return s + (it ? it.chonggak * o.qty : 0);
  }, 0);

  const baechuItem = items.find(i => i.code === 'P001');
  const chonggakItem = items.find(i => i.code === 'P002');
  const baechuAvail = (baechuItem?.realStock || 0) - totalBaechu;
  const chonggakAvail = (chonggakItem?.realStock || 0) - totalChonggak;

  return items.map(it => {
    if (!it.isSet) {
      const avail = it.code === 'P001' ? baechuAvail : it.code === 'P002' ? chonggakAvail : 0;
      return { ...it, availStock: avail };
    }
    let avail = Infinity;
    if (it.baechu > 0) avail = Math.min(avail, Math.floor(baechuAvail / it.baechu));
    if (it.chonggak > 0) avail = Math.min(avail, Math.floor(chonggakAvail / it.chonggak));
    return { ...it, availStock: avail === Infinity ? 0 : Math.max(0, avail) };
  });
}

function stockStatus(n) {
  if (n <= 0) return { label: '품절', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
  if (n <= 20) return { label: '부족', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  if (n <= 50) return { label: '적정', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  return { label: '충분', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' };
}

function gradeStyle(g) {
  return {
    'VIP': 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
    '우수': 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
    '일반': 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    '신규': 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
  }[g] || 'bg-slate-100 text-slate-700';
}

function shipStatusStyle(s) {
  return {
    '배송완료': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    '배송중': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    '배송준비중': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    '출고대기': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    '취소': 'bg-red-50 text-red-700 ring-1 ring-red-200',
    '반송': 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  }[s] || 'bg-slate-100 text-slate-700';
}

// ============================================================
// 🔐 보안 설정
// ============================================================
// ⚠️ 관리자 비밀번호 변경 방법:
//   1. 앱 사이드바 하단의 🔐 비밀번호 변경 버튼 사용 (권장)
//   2. 또는 아래 DEFAULT_PASSWORD 값을 수정 후 재배포
const DEFAULT_PASSWORD = 'admin1234';  // 초기/폴백 비밀번호
const SESSION_HOURS = 24; // 같은 탭 유지 시 24시간 (탭 닫으면 자동 만료)
const MAX_ATTEMPTS = 5; // 최대 시도 횟수
const LOCKOUT_MINUTES = 10; // 차단 시간

const AUTH_KEY = 'wh:auth:session';
const ATTEMPT_KEY = 'wh:auth:attempts';
const PASSWORD_KEY = 'wh:auth:password';  // 🆕 커스텀 비밀번호 저장
const DRIVERS_KEY = 'wh:v6:drivers';

// 🔐 현재 관리자 비밀번호 가져오기 (localStorage 우선)
function getAdminPassword() {
  try {
    const custom = localStorage.getItem(PASSWORD_KEY);
    return custom || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

// 🔐 관리자 비밀번호 변경 (localStorage + Supabase 동기화)
function setAdminPassword(newPassword) {
  try {
    if (newPassword === DEFAULT_PASSWORD) {
      // 기본값과 같으면 저장 안 하고 삭제 (깔끔하게)
      localStorage.removeItem(PASSWORD_KEY);
    } else {
      localStorage.setItem(PASSWORD_KEY, newPassword);
    }
    // 🚀 Supabase 동기화 (다른 PC와 공유)
    if (typeof setSetting === 'function') {
      setSetting('admin_password', newPassword, '관리자 공용 비밀번호').catch(err => {
        console.error('비밀번호 동기화 실패:', err);
      });
    }
    return true;
  } catch {
    return false;
  }
}

// 🚚 기본 배송기사 계정 (엑셀 기반 차량 A~F 배정)
const INITIAL_DRIVERS = [
  { id: 'D001', name: '기사', password: 'driverA', zones: [], phone: '', region: '' },
];

// 🔐 로그인 세션 관리 (sessionStorage 기반)
// - 같은 탭에서는 새로고침해도 로그인 유지 (24시간)
// - 탭/브라우저 닫으면 자동 로그아웃 (sessionStorage가 자동 삭제)
// - 다른 탭에서는 별도 로그인 필요 (보안)
// - 링크 전달받은 사람은 무조건 로그인 화면 (다른 탭/창)
function getAuthSession() {
  try {
    // sessionStorage 우선 확인 (탭 단위 - 가장 안전)
    const data = sessionStorage.getItem(AUTH_KEY);
    if (!data) return null;
    const session = JSON.parse(data);
    if (Date.now() > session.expires) {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function saveAuthSession(sessionData = {}) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  // sessionStorage: 탭이 닫히면 자동 삭제 (보안 ↑)
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({ expires, ...sessionData }));
}

function clearAuthSession() {
  sessionStorage.removeItem(AUTH_KEY);
  // 🛡️ 호환성: 기존 localStorage 세션도 같이 정리 (마이그레이션)
  try { localStorage.removeItem(AUTH_KEY); } catch {}
}

// ============================================================
// 🆕 사용자 관리 시스템 (Admin/User 권한 분리 + 개별 비밀번호)
// ============================================================
// 데이터 구조:
//   [
//     { name: 'Admin', role: 'admin', password: 'admin1234' },
//     { name: 'User1', role: 'user', password: 'user1234' },
//     { name: 'User2', role: 'user', password: 'user1234' },
//   ]
// 역할:
//   admin: 모든 권한 (변경 이력, 백업/복원, 사용자 관리, 모든 비밀번호 관리)
//   user:  일상 업무 (고객/주문/상품 추가/수정/삭제, 자기 비밀번호만 변경)
// ============================================================
const ADMIN_USERS_KEY = 'wh:adminUsers';

// 기본 사용자 목록: Admin + User1, User2 (3명 시작)
const DEFAULT_ADMIN_USERS = [
  { name: 'Admin', role: 'admin', password: 'admin1234' },
  { name: 'User1', role: 'user', password: 'admin1234' },
  { name: 'User2', role: 'user', password: 'admin1234' },
];

// 🔧 마이그레이션: 옛날 데이터 (string 배열) → 새 객체 배열
// 🛡️ 항상 3개 (Admin, User1, User2) 보장
function migrateUsers(data) {
  if (!Array.isArray(data) || data.length === 0) return DEFAULT_ADMIN_USERS;

  let users;

  // 첫 항목이 string이면 옛날 형식
  if (typeof data[0] === 'string') {
    // 첫 사용자를 admin, 나머지를 user로 변환
    users = data.map((name, idx) => ({
      name: idx === 0 ? 'Admin' : `User${idx}`,
      role: idx === 0 ? 'admin' : 'user',
      password: 'admin1234',
    }));
  } else {
    // 이미 객체 배열이면 그대로 (필드 누락 시 보충)
    users = data.map((u, idx) => ({
      name: u.name || `User${idx}`,
      role: u.role || (idx === 0 ? 'admin' : 'user'),
      password: u.password || 'admin1234',
    }));
  }

  // 🛡️ 3개 고정 보장: Admin 1개 + User 2개 = 3개
  // Admin이 없으면 첫 항목을 Admin으로
  if (!users.some(u => u.role === 'admin')) {
    if (users.length > 0) {
      users[0] = { ...users[0], role: 'admin', name: 'Admin' };
    } else {
      users.push({ name: 'Admin', role: 'admin', password: 'admin1234' });
    }
  }

  // User가 2개 미만이면 부족한 만큼 추가 (User1, User2 형식)
  const userCount = users.filter(u => u.role === 'user').length;
  let addedUsers = 0;
  while (users.filter(u => u.role === 'user').length < 2) {
    addedUsers++;
    let newUserName = `User${addedUsers}`;
    // 이름 충돌 방지
    let counter = addedUsers;
    while (users.some(u => u.name === newUserName)) {
      counter++;
      newUserName = `User${counter}`;
    }
    users.push({ name: newUserName, role: 'user', password: 'admin1234' });
  }

  // 4개 이상이면 처음 3개만 (Admin 1 + User 2)
  if (users.length > 3) {
    const admin = users.find(u => u.role === 'admin');
    const userList = users.filter(u => u.role === 'user').slice(0, 2);
    users = [admin, ...userList];
  }

  return users;
}

function getAdminUsers() {
  try {
    const data = localStorage.getItem(ADMIN_USERS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return migrateUsers(parsed);
    }
  } catch {}
  return DEFAULT_ADMIN_USERS;
}

function saveAdminUsers(users) {
  try {
    // 정리: 이름 trim + 빈 항목 제거 + 최소 1명의 admin 보장
    const cleaned = users
      .map(u => ({
        name: String(u.name || '').trim(),
        role: u.role === 'admin' ? 'admin' : 'user',
        password: u.password || 'admin1234',
      }))
      .filter(u => u.name.length > 0);

    // 🛡️ 안전장치: admin이 한 명도 없으면 첫 항목을 admin으로
    if (cleaned.length > 0 && !cleaned.some(u => u.role === 'admin')) {
      cleaned[0].role = 'admin';
    }

    localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(cleaned));
    // 🚀 Supabase 동기화 (다른 PC와 공유)
    if (typeof setSetting === 'function') {
      setSetting('admin_users', cleaned, '관리자 사용자 목록').catch(err => {
        console.error('관리자 사용자 동기화 실패:', err);
      });
    }
    return cleaned;
  } catch {
    return users;
  }
}

// 🔐 사용자 비밀번호 검증
function verifyUserPassword(userName, password) {
  const users = getAdminUsers();
  const user = users.find(u => u.name === userName);
  if (!user) return null;
  if (user.password !== password) return null;
  return { name: user.name, role: user.role };
}

// 🔐 특정 사용자의 비밀번호 변경 (이름으로 식별)
function setUserPassword(userName, newPassword) {
  try {
    const users = getAdminUsers();
    const updated = users.map(u =>
      u.name === userName ? { ...u, password: newPassword } : u
    );
    saveAdminUsers(updated);
    return true;
  } catch {
    return false;
  }
}

function getAttempts() {
  try {
    const data = localStorage.getItem(ATTEMPT_KEY);
    if (!data) return { count: 0, lockedUntil: 0 };
    return JSON.parse(data);
  } catch { return { count: 0, lockedUntil: 0 }; }
}

function saveAttempts(data) {
  localStorage.setItem(ATTEMPT_KEY, JSON.stringify(data));
}

// 배송기사 비밀번호 검증
function verifyDriver(password, drivers) {
  return drivers.find(d => d.password === password) || null;
}

// ============================================================
// 🔐 비밀번호 변경 모달 (현재 로그인한 사용자의 비밀번호만 변경)
// ============================================================
function ChangePasswordModal({ currentUser, onClose, showToast }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');

  // 비밀번호 강도 체크
  const getStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, label: '약함', color: 'bg-red-500', textColor: 'text-red-700' };
    if (score <= 4) return { level: 2, label: '보통', color: 'bg-amber-500', textColor: 'text-amber-700' };
    return { level: 3, label: '강함', color: 'bg-emerald-500', textColor: 'text-emerald-700' };
  };

  const strength = getStrength(newPwd);

  const handleSubmit = () => {
    setError('');

    if (!currentUser) {
      setError('로그인 정보를 확인할 수 없습니다');
      return;
    }

    // 1. 현재 비밀번호 확인 (현재 로그인한 사용자의 비밀번호)
    const verified = verifyUserPassword(currentUser, currentPwd);
    if (!verified) {
      setError('현재 비밀번호가 일치하지 않습니다');
      return;
    }

    // 2. 새 비밀번호 유효성
    if (!newPwd || newPwd.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    // 3. 확인 비밀번호 일치
    if (newPwd !== confirmPwd) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    // 4. 현재와 같으면 안 됨
    if (newPwd === currentPwd) {
      setError('현재 비밀번호와 다른 비밀번호를 사용하세요');
      return;
    }

    // 저장: 현재 사용자의 비밀번호만 변경
    if (setUserPassword(currentUser, newPwd)) {
      showToast(`🔐 ${currentUser}의 비밀번호가 변경되었습니다`);
      onClose();
    } else {
      setError('비밀번호 저장에 실패했습니다');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">🔐 비밀번호 변경</h2>
            <div className="text-xs text-stone-500 mt-0.5">관리자 로그인 비밀번호를 변경합니다</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* 현재 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">현재 비밀번호 *</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => { setCurrentPwd(e.target.value); setError(''); }}
                placeholder="현재 비밀번호 입력"
                className="w-full px-3 py-2.5 pr-10 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-700"
              >
                {showCurrent ? '🙈 숨기기' : '👁️ 보기'}
              </button>
            </div>
          </div>

          {/* 새 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">새 비밀번호 *</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setError(''); }}
                placeholder="6자 이상, 영문+숫자+특수문자 추천"
                className="w-full px-3 py-2.5 pr-10 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-700"
              >
                {showNew ? '🙈 숨기기' : '👁️ 보기'}
              </button>
            </div>

            {/* 비밀번호 강도 표시 */}
            {newPwd && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${strength.color}`} style={{width: `${(strength.level / 3) * 100}%`}} />
                  </div>
                  <span className={`text-[10px] font-bold ${strength.textColor}`}>{strength.label}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className={newPwd.length >= 8 ? 'text-emerald-700' : 'text-stone-400'}>
                    {newPwd.length >= 8 ? '✓' : '○'} 8자 이상
                  </span>
                  <span className={/[A-Z]/.test(newPwd) ? 'text-emerald-700' : 'text-stone-400'}>
                    {/[A-Z]/.test(newPwd) ? '✓' : '○'} 대문자
                  </span>
                  <span className={/[0-9]/.test(newPwd) ? 'text-emerald-700' : 'text-stone-400'}>
                    {/[0-9]/.test(newPwd) ? '✓' : '○'} 숫자
                  </span>
                  <span className={/[^a-zA-Z0-9]/.test(newPwd) ? 'text-emerald-700' : 'text-stone-400'}>
                    {/[^a-zA-Z0-9]/.test(newPwd) ? '✓' : '○'} 특수문자
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 새 비밀번호 확인 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">새 비밀번호 확인 *</label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPwd}
              onChange={e => { setConfirmPwd(e.target.value); setError(''); }}
              placeholder="새 비밀번호 다시 입력"
              className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                confirmPwd && confirmPwd === newPwd
                  ? 'border-emerald-500 focus:ring-emerald-100'
                  : confirmPwd && confirmPwd !== newPwd
                  ? 'border-red-500 focus:ring-red-100'
                  : 'border-stone-200 focus:border-red-700 focus:ring-red-100'
              }`}
            />
            {confirmPwd && confirmPwd !== newPwd && (
              <div className="text-[10px] text-red-600 mt-1">⚠️ 비밀번호가 일치하지 않습니다</div>
            )}
            {confirmPwd && confirmPwd === newPwd && newPwd && (
              <div className="text-[10px] text-emerald-600 mt-1">✓ 비밀번호가 일치합니다</div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* 경고 */}
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 space-y-1">
            <div className="font-bold">💡 주의사항</div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>비밀번호는 이 기기(브라우저)에만 저장됩니다</li>
              <li>다른 기기에서는 기본 비밀번호로 로그인 후 다시 설정하세요</li>
              <li>브라우저 데이터 삭제 시 기본 비밀번호로 돌아갑니다</li>
              <li>비밀번호를 잊어버리면 복구할 수 없으니 안전하게 보관하세요</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd || newPwd.length < 6}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            🔐 변경하기
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onSuccess, drivers = [] }) {
  const [adminUsers, setAdminUsers] = useState(() => getAdminUsers());
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState(adminUsers[0]?.name || 'Admin');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(getAttempts());
  const [timeLeft, setTimeLeft] = useState(0);
  // 🆕 로그인 모드: 'staff' (직원) | 'driver' (배송기사)
  const [loginMode, setLoginMode] = useState('staff');

  useEffect(() => {
    if (attempts.lockedUntil > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, attempts.lockedUntil - Date.now());
        setTimeLeft(remaining);
        if (remaining === 0) {
          const reset = { count: 0, lockedUntil: 0 };
          saveAttempts(reset);
          setAttempts(reset);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [attempts.lockedUntil]);

  const isLocked = attempts.lockedUntil > Date.now();

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isLocked) return;

    // 🆕 직원 모드: 선택된 사용자의 비밀번호 확인
    if (loginMode === 'staff') {
      if (userName) {
        const verified = verifyUserPassword(userName, input);
        if (verified) {
          saveAuthSession({ role: verified.role, userName: verified.name });
          saveAttempts({ count: 0, lockedUntil: 0 });
          onSuccess({ role: verified.role, userName: verified.name });
          return;
        }
      }
    }

    // 🆕 배송기사 모드: 기사 비밀번호 확인
    if (loginMode === 'driver') {
      const driver = verifyDriver(input, drivers);
      if (driver) {
        saveAuthSession({ role: 'driver', driverId: driver.id, driverName: driver.name });
        saveAttempts({ count: 0, lockedUntil: 0 });
        onSuccess({ role: 'driver', driver });
        return;
      }
    }

    // 실패 처리
    const newCount = attempts.count + 1;
    if (newCount >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      const newAttempts = { count: newCount, lockedUntil };
      saveAttempts(newAttempts);
      setAttempts(newAttempts);
      setError(`${MAX_ATTEMPTS}번 틀려 ${LOCKOUT_MINUTES}분간 접속이 차단됩니다.`);
    } else {
      const newAttempts = { count: newCount, lockedUntil: 0 };
      saveAttempts(newAttempts);
      setAttempts(newAttempts);
      setError(`비밀번호가 틀렸습니다. (${MAX_ATTEMPTS - newCount}회 남음)`);
    }
    setShake(true);
    setInput('');
    setTimeout(() => setShake(false), 500);
  };

  const formatTimeLeft = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4"
      style={{ fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, 'Malgun Gothic', sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .shake { animation: shake 0.5s; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <div className={`w-full max-w-[420px] ${shake ? 'shake' : ''}`}>
        {/* 로고 + 타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm border border-[#E4E4E7] mb-4 overflow-hidden p-1.5">
            <img
              src="/icon-192.png"
              alt="김치하우스"
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class=\"text-3xl\">🏠</span>'; }}
            />
          </div>
          <h1 className="text-[24px] font-bold text-[#09090B] tracking-tight mb-1">김치하우스</h1>
          <div className="text-[11px] tracking-[0.4em] text-[#71717A] font-medium uppercase pl-1">Kimchi House AU</div>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-[16px] shadow-sm border border-[#E4E4E7] overflow-hidden">
          {isLocked ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-[18px] font-semibold text-[#B91C1C] mb-2">접속 차단됨</h2>
              <p className="text-[13px] text-[#71717A] mb-4 leading-relaxed">
                비밀번호 5회 오류로 일시 차단되었습니다.<br/>
                잠시 후 다시 시도해주세요.
              </p>
              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px]">
                <div className="text-[11px] text-[#B91C1C] font-medium mb-1">차단 해제까지</div>
                <div className="text-[28px] font-bold text-[#991B1B] tabular-nums tracking-tight">
                  {formatTimeLeft(timeLeft)}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 모드 선택 탭 */}
              <div className="flex border-b border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => { setLoginMode('staff'); setInput(''); setError(''); }}
                  className={`flex-1 px-5 py-3.5 text-[13px] font-medium transition-all relative ${
                    loginMode === 'staff'
                      ? 'text-[#09090B] bg-white'
                      : 'text-[#71717A] bg-[#FAFAFA] hover:text-[#52525B]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Users size={15} />
                    <span>관리자 / 직원</span>
                  </div>
                  {loginMode === 'staff' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#09090B]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode('driver'); setInput(''); setError(''); }}
                  className={`flex-1 px-5 py-3.5 text-[13px] font-medium transition-all relative ${
                    loginMode === 'driver'
                      ? 'text-[#09090B] bg-white'
                      : 'text-[#71717A] bg-[#FAFAFA] hover:text-[#52525B]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Truck size={15} />
                    <span>배송기사</span>
                  </div>
                  {loginMode === 'driver' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#09090B]" />
                  )}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-7 fade-in" key={loginMode}>
                {loginMode === 'staff' ? (
                  <>
                    {/* 직원 모드 */}
                    <div className="mb-5">
                      <label className="block text-[12px] font-semibold text-[#52525B] mb-2">사용자 선택</label>
                      <div className={`grid gap-2 ${adminUsers.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {adminUsers.map(user => (
                          <button
                            key={user.name}
                            type="button"
                            onClick={() => setUserName(user.name)}
                            className={`relative px-3 py-3 rounded-[10px] text-[13px] font-medium border transition-all ${
                              userName === user.name
                                ? 'bg-[#09090B] text-white border-[#09090B] shadow-sm'
                                : 'bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA] hover:bg-[#FAFAFA]'
                            }`}
                          >
                            {user.role === 'admin' && (
                              <span className="absolute top-1 right-1.5 text-[10px]">👑</span>
                            )}
                            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                              {user.role === 'admin' ? 'Admin' : 'User'}
                            </div>
                            <div>{user.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-[12px] font-semibold text-[#52525B] mb-2">비밀번호</label>
                      <input
                        type="password"
                        value={input}
                        onChange={e => { setInput(e.target.value); setError(''); }}
                        autoFocus
                        placeholder="비밀번호 입력"
                        className={`w-full px-4 py-2.5 border rounded-[10px] text-[14px] focus:outline-none transition-colors ${
                          error
                            ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-2 focus:ring-[#FECACA]'
                            : 'border-[#E4E4E7] focus:border-[#09090B] focus:ring-2 focus:ring-[#09090B]/10'
                        }`}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* 배송기사 모드 */}
                    <div className="mb-5 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px]">
                      <div className="flex items-start gap-2">
                        <Truck size={16} className="text-[#1D4ED8] mt-0.5 flex-shrink-0" />
                        <div className="text-[12px] text-[#1E40AF] leading-relaxed">
                          <strong>배송기사 전용 로그인</strong><br/>
                          담당 Zone의 배송 정보만 확인 가능합니다
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-[12px] font-semibold text-[#52525B] mb-2">기사 비밀번호</label>
                      <input
                        type="password"
                        value={input}
                        onChange={e => { setInput(e.target.value); setError(''); }}
                        autoFocus
                        placeholder="기사 비밀번호 입력"
                        className={`w-full px-4 py-2.5 border rounded-[10px] text-[14px] focus:outline-none transition-colors ${
                          error
                            ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-2 focus:ring-[#FECACA]'
                            : 'border-[#E4E4E7] focus:border-[#09090B] focus:ring-2 focus:ring-[#09090B]/10'
                        }`}
                      />
                      {drivers.length > 0 && (
                        <div className="mt-2 text-[10px] text-[#A1A1AA]">
                          등록된 기사: {drivers.length}명
                        </div>
                      )}
                    </div>
                  </>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] text-[12px] text-[#B91C1C] flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!input}
                  className="w-full py-3 bg-[#09090B] hover:bg-black disabled:bg-[#D4D4D8] disabled:cursor-not-allowed text-white rounded-[10px] text-[14px] font-semibold shadow-sm transition-all"
                >
                  로그인
                </button>
              </form>

              {/* 하단 안내 */}
              <div className="px-7 py-3 bg-[#FAFAFA] border-t border-[#E4E4E7]">
                <div className="text-[10px] text-[#A1A1AA] text-center leading-relaxed">
                  🔐 24시간 자동로그인 · 5회 오류 시 10분 차단
                </div>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-6 text-[11px] text-[#A1A1AA]">
          © 2026 Kimchi House AU
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 👥 사용자 관리 모달 (고정 3계정: Admin/User1/User2)
// ═══════════════════════════════════════════════════════════
function EditUsersModal({ initialUsers, currentUser, onSave, onClose }) {
  // initialUsers는 [{name, role, password}] 형식 (고정 3개)
  const [users, setUsers] = useState(initialUsers || []);
  // 비밀번호 표시 토글
  const [showPwd, setShowPwd] = useState({});

  // 🔐 보안: 현재 로그인 사용자가 admin이 아니면 모달 자체를 막음
  const currentUserData = users.find(u => u.name === currentUser);
  const isAdmin = currentUserData?.role === 'admin';

  // 🛡️ admin이 아니면 즉시 모달 닫기 (이중 방어)
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-[16px] font-semibold text-[#09090B] mb-2">접근 권한이 없습니다</h2>
          <p className="text-[13px] text-[#71717A] mb-5">
            사용자 관리는 관리자(Admin)만 사용할 수 있습니다.<br/>
            본인 비밀번호 변경은 사이드바의 '🔐 비밀번호 변경'을 이용해주세요.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[13px] font-medium transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  const updateUserName = (idx, value) => {
    const target = users[idx];
    // Admin 이름은 변경 불가 (안전장치)
    if (target.role === 'admin' && target.name === 'Admin') {
      alert('Admin 계정의 이름은 변경할 수 없습니다');
      return;
    }
    const next = [...users];
    next[idx] = { ...next[idx], name: value };
    setUsers(next);
  };

  const updateUserPassword = (idx, value) => {
    const next = [...users];
    next[idx] = { ...next[idx], password: value };
    setUsers(next);
  };

  const togglePwdVisibility = (idx) => {
    setShowPwd({ ...showPwd, [idx]: !showPwd[idx] });
  };

  const handleSave = () => {
    const cleaned = users.map(u => ({
      name: String(u.name || '').trim(),
      role: u.role === 'admin' ? 'admin' : 'user',
      password: u.password || 'admin1234',
    })).filter(u => u.name.length > 0);

    if (cleaned.length === 0) {
      alert('최소 1명의 이름이 필요합니다');
      return;
    }
    // 중복 체크
    const uniqueNames = new Set(cleaned.map(u => u.name));
    if (uniqueNames.size !== cleaned.length) {
      alert('중복된 이름이 있습니다');
      return;
    }
    // admin 1명 이상 보장
    if (!cleaned.some(u => u.role === 'admin')) {
      alert('관리자(Admin)가 최소 1명 필요합니다');
      return;
    }
    // 비밀번호 최소 길이
    const tooShort = cleaned.find(u => !u.password || u.password.length < 4);
    if (tooShort) {
      alert(`'${tooShort.name}'의 비밀번호는 최소 4자 이상이어야 합니다`);
      return;
    }
    onSave(cleaned);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[#09090B] tracking-tight">사용자 관리</h2>
            <div className="text-[12px] text-[#71717A] mt-0.5">
              {isAdmin ? '이름과 비밀번호를 관리합니다 (계정 3개 고정)' : '⚠️ 본인 비밀번호만 변경 가능합니다'}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F4F4F5] rounded-[6px] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 안내 */}
          <div className="p-3 bg-[#F0F9FF] border border-[#BFDBFE] rounded-[8px] text-[11px] text-[#1E40AF] leading-relaxed space-y-1">
            <div>👑 <strong>Admin</strong>: 모든 권한 (사용자 관리, 백업 복원)</div>
            <div>👤 <strong>User1, User2</strong>: 일반 업무 + 백업 내보내기 + 변경 이력 조회</div>
            <div>🔄 모든 PC에 자동 동기화됩니다</div>
          </div>

          {/* 고정 3계정 */}
          <div>
            <label className="block text-[12px] font-semibold text-[#52525B] mb-2">
              계정 ({users.length}개 고정)
            </label>
            <div className="space-y-2">
              {users.map((user, idx) => {
                const isCurrentLogin = user.name === currentUser;
                // Admin이 아니면 이름 변경 가능 (User1, User2 이름은 자유롭게)
                const canEditName = !(user.role === 'admin' && user.name === 'Admin');
                return (
                  <div key={idx} className={`border rounded-[10px] p-3 ${
                    isCurrentLogin
                      ? 'border-[#09090B] bg-[#F4F4F5]'
                      : 'border-[#E4E4E7] bg-[#FAFAFA]'
                  }`}>
                    {/* 역할 + 이름 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold whitespace-nowrap ${
                        user.role === 'admin'
                          ? 'bg-[#09090B] text-white'
                          : 'bg-[#E4E4E7] text-[#52525B]'
                      }`}>
                        {user.role === 'admin' ? '👑 ADMIN' : '👤 USER'}
                      </span>
                      <input
                        type="text"
                        value={user.name}
                        onChange={(e) => updateUserName(idx, e.target.value)}
                        disabled={!canEditName}
                        className="flex-1 px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[6px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#09090B]/20 disabled:bg-[#F4F4F5] disabled:cursor-not-allowed disabled:text-[#71717A]"
                        placeholder="사용자명"
                        maxLength={20}
                      />
                      {isCurrentLogin && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#22C55E] text-white rounded font-bold whitespace-nowrap">
                          현재 로그인
                        </span>
                      )}
                    </div>

                    {/* 비밀번호 (Admin은 모두 수정 가능) */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#71717A] font-medium w-12">비번:</span>
                      <input
                        type={showPwd[idx] ? 'text' : 'password'}
                        value={user.password}
                        onChange={(e) => updateUserPassword(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[6px] text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-[#09090B]/20"
                        placeholder="비밀번호 (최소 4자)"
                        maxLength={50}
                      />
                      <button
                        onClick={() => togglePwdVisibility(idx)}
                        className="p-1.5 text-[#71717A] hover:bg-[#F4F4F5] rounded-[6px] transition-colors"
                        title={showPwd[idx] ? '숨기기' : '표시'}
                      >
                        {showPwd[idx] ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-2 leading-relaxed">
              💡 계정은 3개로 고정되어 있습니다. User1, User2의 이름과 비밀번호만 변경 가능합니다.
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E4E4E7] flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] rounded-[8px] text-[13px] font-medium transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[13px] font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'driver'
  const [currentUser, setCurrentUser] = useState(null); // 🆕 관리자 이름 (사장님/와이프/알바생)
  const [currentDriver, setCurrentDriver] = useState(null);
  const [view, setView] = useState('dashboard');
  const [customers, _setCustomersInternal] = useState(INITIAL_CUSTOMERS);
  const [items, _setItemsInternal] = useState(INITIAL_ITEMS);
  const [orders, _setOrdersInternal] = useState(INITIAL_ORDERS);
  const [drivers, _setDriversInternal] = useState(INITIAL_DRIVERS);
  const [gifts, setGifts] = useState(INITIAL_GIFTS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditUsers, setShowEditUsers] = useState(false);  // 🆕 사용자 관리 모달
  const [adminUsers, setAdminUsers] = useState(() => getAdminUsers());  // 🆕 사용자 목록
  const [sidebarOpen, setSidebarOpen] = useState(false);  // 📱 모바일/태블릿 사이드바

  // 로그인 체크 (앱 시작 시)
  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setIsAuthed(true);
      setUserRole(session.role || 'admin');
      setCurrentUser(session.userName || null);  // 🆕 사용자 이름 복원
      if (session.role === 'driver' && session.driverId) {
        setCurrentDriver({ id: session.driverId, name: session.driverName });
      }
    }
    setAuthChecked(true);
  }, []);

  // ⌨️ 키보드 단축키 (Alt + 숫자) - Hooks 규칙 준수 위해 early return 이전에 선언
  useEffect(() => {
    const navIds = ['dashboard', 'orders', 'customers', 'items', 'gifts', 'shipping', 'drivers', 'audit'];
    const handleKeyDown = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= navIds.length) {
          e.preventDefault();
          setView(navIds[num - 1]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 🔥 Firebase 연결 상태
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'connecting' : 'local');
  const initialSyncDoneRef = useRef(false);
  // Firebase에서 받은 데이터로 업데이트 중인지 여부 (무한루프 방지)
  const isReceivingFromFirebaseRef = useRef(false);

  // 💾 저장 상태 추적 (Notion/Linear 스타일)
  // 'saved' = 저장됨 / 'saving' = 저장 중 / 'dirty' = 미저장 변경있음 / 'error' = 실패
  const [saveState, setSaveState] = useState('saved');
  const [lastSaveTime, setLastSaveTime] = useState(Date.now());
  const saveTimerRef = useRef(null);

  // ⚡ 데이터 로드 - Firebase 연결된 경우 실시간 구독, 아니면 localStorage
  useEffect(() => {
    let unsubCustomers = null;
    let unsubItems = null;
    let unsubOrders = null;
    let unsubDrivers = null;
    let unsubGifts = null;
    let unsubSettings = null;

    if (isSupabaseConfigured) {
      // 🔥 Firebase 실시간 구독 모드
      (async () => {
        try {
          // 먼저 로컬 데이터 로드 (빠른 첫 렌더링)
          const [localC, localI, localO, localD, localG] = await Promise.all([
            loadData(STORAGE_KEYS.customers, INITIAL_CUSTOMERS),
            loadData(STORAGE_KEYS.items, INITIAL_ITEMS),
            loadData(STORAGE_KEYS.orders, INITIAL_ORDERS),
            loadData(DRIVERS_KEY, INITIAL_DRIVERS),
            loadData(GIFT_STORAGE_KEY, INITIAL_GIFTS),
          ]);
          _setCustomersInternal(localC);
          _setItemsInternal(localI);
          _setOrdersInternal(localO);
          _setDriversInternal(localD);
          setGifts(localG);
          setLoaded(true);

          // Firestore 실시간 구독 - 다른 기기의 변경사항만 반영
          // 내용이 실제로 다를 때만 setState 호출 (무한루프 방지)
          const arraysEqual = (a, b) => {
            if (a === b) return true;
            if (a.length !== b.length) return false;
            // ID로 맵핑 후 JSON 비교
            const aMap = {};
            a.forEach(x => { if (x.id) aMap[x.id] = JSON.stringify(x); });
            for (const x of b) {
              if (!x.id || aMap[x.id] !== JSON.stringify(x)) return false;
            }
            return true;
          };

          // Firebase 에러 핸들러 (Quota 초과, 권한 오류 등)
          const handleFirebaseError = (err) => {
            const errCode = err?.code || '';
            if (errCode.includes('resource-exhausted') || errCode.includes('permission-denied') || errCode.includes('unavailable')) {
              warn('⚠️ Firebase 오류 - 로컬 모드로 전환:', errCode);
              setSyncStatus('error');
            }
          };

          // 5초 내 연결 확인 안 되면 오프라인 처리
          const connectionTimeout = setTimeout(() => {
            setSyncStatus(current => current === 'connecting' ? 'error' : current);
          }, 5000);

          unsubCustomers = subscribeToTable(TABLES.customers, (data) => {
            clearTimeout(connectionTimeout);
            // 🔑 핵심 원칙: Supabase 데이터가 항상 "진실"
            // - 데이터가 있으면 그대로 반영
            // - 데이터가 없어도 함부로 덮어쓰지 않음 (다른 PC의 데이터가 증발할 수 있음!)
            // - 초기 마이그레이션은 수동 버튼으로만 (자동 금지)
            if (data.length > 0) {
              isReceivingFromFirebaseRef.current = true;
              _setCustomersInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(STORAGE_KEYS.customers, data);
                return data;
              });
              setTimeout(() => { isReceivingFromFirebaseRef.current = false; }, 100);
              initialSyncDoneRef.current = true;
            } else {
              // 🆕 Supabase가 비어있을 때는 "마이그레이션 필요" 플래그만 설정
              // 실제 업로드는 사용자 확인 후 수동으로만
              if (!initialSyncDoneRef.current) {
                warn('⚠️ Supabase가 비어있습니다. 초기 데이터를 업로드하려면 "즉시 저장" 버튼을 클릭하세요.');
                initialSyncDoneRef.current = true;  // 한 번만 경고
              }
            }
            setSyncStatus('synced');
          }, handleFirebaseError);

          unsubItems = subscribeToTable(TABLES.items, (data) => {
            if (data.length > 0) {
              isReceivingFromFirebaseRef.current = true;
              _setItemsInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(STORAGE_KEYS.items, data);
                return data;
              });
              setTimeout(() => { isReceivingFromFirebaseRef.current = false; }, 100);
              initialSyncDoneRef.current = true;  // 🔑 동기화 완료 플래그
            }
          }, handleFirebaseError);

          unsubOrders = subscribeToTable(TABLES.orders, (data) => {
            if (data.length > 0) {
              isReceivingFromFirebaseRef.current = true;
              _setOrdersInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(STORAGE_KEYS.orders, data);
                return data;
              });
              setTimeout(() => { isReceivingFromFirebaseRef.current = false; }, 100);
              initialSyncDoneRef.current = true;  // 🔑 동기화 완료 플래그
            }
          }, handleFirebaseError);

          unsubDrivers = subscribeToTable(TABLES.drivers, (data) => {
            if (data.length > 0) {
              isReceivingFromFirebaseRef.current = true;
              _setDriversInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(DRIVERS_KEY, data);
                return data;
              });
              setTimeout(() => { isReceivingFromFirebaseRef.current = false; }, 100);
              initialSyncDoneRef.current = true;  // 🔑 동기화 완료 플래그
            }
          }, handleFirebaseError);

          // 🎁 gifts subscription (다른 PC와 사은품 이벤트 공유)
          unsubGifts = subscribeToTable(TABLES.gifts, (data) => {
            if (data.length > 0) {
              isReceivingFromFirebaseRef.current = true;
              setGifts(current => {
                if (arraysEqual(current, data)) return current;
                saveData(GIFT_STORAGE_KEY, data);
                return data;
              });
              setTimeout(() => { isReceivingFromFirebaseRef.current = false; }, 100);
              initialSyncDoneRef.current = true;  // 🔑 동기화 완료 플래그
            }
          }, handleFirebaseError);

          // ⚙️ 앱 설정 초기 로드 (비밀번호, 사용자 이름, 박스 수량 기억)
          getAllSettings().then(settings => {
            if (settings.admin_password !== undefined && settings.admin_password !== null) {
              // 비밀번호: localStorage 동기화
              const pwd = settings.admin_password;
              if (pwd === DEFAULT_PASSWORD) {
                localStorage.removeItem(PASSWORD_KEY);
              } else if (pwd) {
                localStorage.setItem(PASSWORD_KEY, pwd);
              }
            }
            if (Array.isArray(settings.admin_users) && settings.admin_users.length > 0) {
              // 사용자 이름 목록: localStorage 동기화
              localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(settings.admin_users));
            }
            // 🧠 박스 수량 기억 동기화
            if (settings.per_box_memory && typeof settings.per_box_memory === 'object') {
              localStorage.setItem('wh:perBoxMemory', JSON.stringify(settings.per_box_memory));
              log(`✓ 박스 수량 기억 ${Object.keys(settings.per_box_memory).length}건 로드`);
            }
          }).catch(err => {
            warn('초기 설정 로드 실패:', err);
          });

          // ⚙️ 앱 설정 실시간 구독 (다른 PC에서 변경 시 즉시 반영)
          unsubSettings = subscribeToSettings((key, value) => {
            if (key === 'admin_password') {
              if (value === DEFAULT_PASSWORD || value === null) {
                localStorage.removeItem(PASSWORD_KEY);
              } else if (value) {
                localStorage.setItem(PASSWORD_KEY, value);
              }
              log(`✓ 비밀번호 동기화됨 (다른 PC에서 변경)`);
            } else if (key === 'admin_users' && Array.isArray(value)) {
              localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(value));
              log(`✓ 관리자 이름 목록 동기화됨 (${value.length}명)`);
            } else if (key === 'per_box_memory' && value && typeof value === 'object') {
              localStorage.setItem('wh:perBoxMemory', JSON.stringify(value));
              log(`✓ 박스 수량 기억 동기화됨 (${Object.keys(value).length}건)`);
            }
          });

          // 🛡️ 안전망: 5초 후 강제로 initialSyncDone 활성화 (subscribe 응답 없어도 저장은 가능하게)
          setTimeout(() => {
            if (!initialSyncDoneRef.current) {
              warn('⚠️ Supabase 응답 없음 - 5초 후 강제 동기화 활성화');
              initialSyncDoneRef.current = true;
            }
          }, 5000);
        } catch (err) {
          console.error('Firebase 연결 실패, 로컬 모드로 전환:', err);
          setSyncStatus('error');
        }
      })();
    } else {
      // 💾 로컬 모드 (Firebase 미설정)
      (async () => {
        const [c, i, o, d] = await Promise.all([
          loadData(STORAGE_KEYS.customers, INITIAL_CUSTOMERS),
          loadData(STORAGE_KEYS.items, INITIAL_ITEMS),
          loadData(STORAGE_KEYS.orders, INITIAL_ORDERS),
          loadData(DRIVERS_KEY, INITIAL_DRIVERS),
        ]);
        _setCustomersInternal(c);
        _setItemsInternal(i);
        _setOrdersInternal(o);
        _setDriversInternal(d);
        setLoaded(true);
      })();
    }

    // Cleanup
    return () => {
      if (unsubCustomers) unsubCustomers();
      if (unsubItems) unsubItems();
      if (unsubOrders) unsubOrders();
      if (unsubDrivers) unsubDrivers();
      if (unsubGifts) unsubGifts();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // 🔧 저장 상태 마킹 헬퍼
  // - Firebase에서 받은 업데이트는 제외 (이미 저장된 것)
  // - saveBatch는 debounce 500ms → 즉시 'saving' 표시
  const markDirtyAndSave = () => {
    if (isReceivingFromFirebaseRef.current) return;  // 외부 변경은 무시
    if (!isSupabaseConfigured || !initialSyncDoneRef.current) return;
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // saveBatch는 debounce 500ms 후 실행 → 1초 후 saved 표시
    saveTimerRef.current = setTimeout(() => {
      setSaveState('saved');
      setLastSaveTime(Date.now());
    }, 1000);
  };

  // 📋 감사 로그 기록 헬퍼 (diff 감지)
  // prev와 next 배열 비교 → 추가/삭제/수정 로그 기록
  const recordAuditDiff = (entityType, prev, next, getEntityName) => {
    if (!currentUser) return;  // 로그인 안 한 상태면 기록 안 함
    if (!isSupabaseConfigured) return;
    if (isReceivingFromFirebaseRef.current) return;  // 외부 변경은 기록 안 함

    const prevMap = {};
    prev.forEach(r => { if (r.id) prevMap[r.id] = r; });
    const nextMap = {};
    next.forEach(r => { if (r.id) nextMap[r.id] = r; });

    const added = [];
    const removed = [];
    const updated = [];

    for (const r of next) {
      if (!r.id) continue;
      if (!prevMap[r.id]) added.push(r);
      else if (JSON.stringify(prevMap[r.id]) !== JSON.stringify(r)) updated.push(r);
    }
    for (const r of prev) {
      if (!r.id) continue;
      if (!nextMap[r.id]) removed.push(r);
    }

    // 대량 변경은 요약 로그 하나로
    const totalChanges = added.length + removed.length + updated.length;
    if (totalChanges === 0) return;

    if (totalChanges > 10) {
      // 대량 변경 (배차 업로드 등)
      logAudit({
        userName: currentUser,
        action: 'bulk',
        entityType,
        description: `${entityType} 대량 변경: 신규 ${added.length} · 수정 ${updated.length} · 삭제 ${removed.length}`,
      });
      return;
    }

    // 개별 변경 로그
    added.forEach(r => {
      logAudit({
        userName: currentUser,
        action: 'create',
        entityType,
        entityId: r.id,
        entityName: getEntityName ? getEntityName(r) : r.id,
        description: `${entityType} 생성: ${getEntityName ? getEntityName(r) : r.id}`,
      });
    });
    updated.forEach(r => {
      const prevR = prevMap[r.id];
      // 어떤 필드가 바뀌었는지 diff 계산 (간단 버전)
      const changedFields = [];
      Object.keys(r).forEach(key => {
        if (JSON.stringify(prevR[key]) !== JSON.stringify(r[key])) {
          changedFields.push(key);
        }
      });
      logAudit({
        userName: currentUser,
        action: 'update',
        entityType,
        entityId: r.id,
        entityName: getEntityName ? getEntityName(r) : r.id,
        description: `${entityType} 수정: ${getEntityName ? getEntityName(r) : r.id}${changedFields.length > 0 ? ` (${changedFields.join(', ')})` : ''}`,
        changes: { fields: changedFields },
      });
    });
    removed.forEach(r => {
      logAudit({
        userName: currentUser,
        action: 'delete',
        entityType,
        entityId: r.id,
        entityName: getEntityName ? getEntityName(r) : r.id,
        description: `${entityType} 삭제: ${getEntityName ? getEntityName(r) : r.id}`,
      });
    });
  };

  // 🔧 공개 setter들 - 로컬 저장 + Firebase 저장
  // (Firestore onSnapshot은 내용 비교로 무한루프 방지)
  const setCustomers = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(customers) : newValue;
    const prevCustomers = customers;  // 📋 이전 상태 기억 (log용)
    _setCustomersInternal(resolved);
    saveData(STORAGE_KEYS.customers, resolved);
    // 🛡️ Firebase에서 받은 데이터이면 다시 업로드 안 함 (에코 방지)
    if (isReceivingFromFirebaseRef.current) return;
    // 📋 변경 이력 기록
    recordAuditDiff('customer', prevCustomers, resolved, c => c.name);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      suppressRealtimeEcho(TABLES.customers, 3000);
      setSaveState('saving');
      saveBatch(TABLES.customers, resolved)
        .then(result => {
          const saved = result?.saved || 0;
          const deleted = result?.deleted || 0;
          if (saved > 0 || deleted > 0) {
            log(`✓ customers 저장됨: ${saved}건 업로드${deleted > 0 ? ` + ${deleted}건 삭제` : ''}`);
          }
          setSaveState('saved');
          setLastSaveTime(Date.now());
        })
        .catch(err => {
          console.error('❌ customers 저장 실패:', err);
          setSaveState('error');
          showToast('고객 저장 실패: ' + (err.message || '알 수 없는 오류'), 'error');
        });
    }
  };

  const setItems = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(items) : newValue;
    const prevItems = items;  // 📋
    // availStock은 계산된 값이므로 저장 시 제거 (Supabase 스키마에 없음)
    const cleaned = resolved.map(item => {
      const { availStock, ...clean } = item;
      return clean;
    });
    _setItemsInternal(cleaned);
    saveData(STORAGE_KEYS.items, cleaned);
    if (isReceivingFromFirebaseRef.current) return;
    // 📋 변경 이력 기록
    recordAuditDiff('item', prevItems, cleaned, i => i.name);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      suppressRealtimeEcho(TABLES.items, 3000);
      setSaveState('saving');
      saveBatch(TABLES.items, cleaned)
        .then(result => {
          log(`✓ items 저장됨: ${result?.saved || 0}건`);
          setSaveState('saved');
          setLastSaveTime(Date.now());
        })
        .catch(err => {
          console.error('❌ items 저장 실패:', err);
          setSaveState('error');
          showToast('품목 저장 실패: ' + (err.message || '알 수 없는 오류'), 'error');
        });
    }
  };

  const setOrders = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(orders) : newValue;
    const prevOrders = orders;  // 📋
    _setOrdersInternal(resolved);
    saveData(STORAGE_KEYS.orders, resolved);
    if (isReceivingFromFirebaseRef.current) return;
    // 📋 변경 이력 기록
    recordAuditDiff('order', prevOrders, resolved, o => `${o.id} (${o.itemName} × ${o.qty})`);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      suppressRealtimeEcho(TABLES.orders, 3000);
      setSaveState('saving');
      saveBatch(TABLES.orders, resolved)
        .then(result => {
          log(`✓ orders 저장됨: ${result?.saved || 0}건`);
          setSaveState('saved');
          setLastSaveTime(Date.now());
        })
        .catch(err => {
          console.error('❌ orders 저장 실패:', err);
          setSaveState('error');
          showToast('주문 저장 실패: ' + (err.message || '알 수 없는 오류'), 'error');
        });
    }
  };

  const setDrivers = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(drivers) : newValue;
    const prevDrivers = drivers;  // 📋
    _setDriversInternal(resolved);
    saveData(DRIVERS_KEY, resolved);
    if (isReceivingFromFirebaseRef.current) return;
    // 📋 변경 이력 기록
    recordAuditDiff('driver', prevDrivers, resolved, d => d.name);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      suppressRealtimeEcho(TABLES.drivers, 3000);
      setSaveState('saving');
      saveBatch(TABLES.drivers, resolved)
        .then(result => {
          log(`✓ drivers 저장됨: ${result?.saved || 0}건`);
          setSaveState('saved');
          setLastSaveTime(Date.now());
        })
        .catch(err => {
          console.error('❌ drivers 저장 실패:', err);
          setSaveState('error');
          showToast('기사 저장 실패: ' + (err.message || '알 수 없는 오류'), 'error');
        });
    }
  };

  // 💾 즉시 저장 (수동 트리거 - 데이터 다시 저장)
  const handleSaveNow = async () => {
    if (!isSupabaseConfigured || !initialSyncDoneRef.current) {
      showToast('클라우드 연결이 필요합니다', 'error');
      return;
    }
    if (saveState === 'saving') return;  // 이미 저장 중

    setSaveState('saving');
    try {
      // 모든 데이터 강제 재저장
      suppressRealtimeEcho(TABLES.customers, 3000);
      suppressRealtimeEcho(TABLES.items, 3000);
      suppressRealtimeEcho(TABLES.orders, 3000);
      suppressRealtimeEcho(TABLES.drivers, 3000);
      saveBatch(TABLES.customers, customers);
      saveBatch(TABLES.items, items.map(({ availStock, ...rest }) => rest));
      saveBatch(TABLES.orders, orders);
      saveBatch(TABLES.drivers, drivers);

      // saveBatch는 debounce 500ms + 실제 저장 시간 필요
      setTimeout(() => {
        setSaveState('saved');
        setLastSaveTime(Date.now());
        showToast('✓ 저장 완료');
      }, 1200);
    } catch (err) {
      console.error('저장 실패:', err);
      setSaveState('error');
      showToast('저장 실패. 다시 시도해주세요.', 'error');
    }
  };

  // 💡 페이지 이탈 시 미저장 경고
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveState === 'saving' || saveState === 'dirty') {
        e.preventDefault();
        e.returnValue = '저장 중인 변경사항이 있습니다. 정말 나가시겠습니까?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState]);

  // 🔄 수동 새로고침 - 다른 기기에서의 변경사항 강제 불러오기
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (!isSupabaseConfigured) {
      showToast('클라우드 연결이 필요합니다', 'error');
      return;
    }
    if (refreshing) return;

    setRefreshing(true);
    try {
      log('🔄 ========== 수동 새로고침 시작 ==========');
      log(`현재 로컬 상태: 고객 ${customers.length}명, 주문 ${orders.length}건`);

      const [customers2, items2, orders2, drivers2] = await Promise.all([
        fetchAll(TABLES.customers),
        fetchAll(TABLES.items),
        fetchAll(TABLES.orders),
        fetchAll(TABLES.drivers),
      ]);

      log(`Supabase 데이터: 고객 ${customers2.length}명, 주문 ${orders2.length}건`);

      // 🔍 주문 diff 상세 분석
      const localOrderIds = new Set(orders.map(o => o.id));
      const cloudOrderIds = new Set(orders2.map(o => o.id));
      const onlyLocal = [...localOrderIds].filter(id => !cloudOrderIds.has(id));
      const onlyCloud = [...cloudOrderIds].filter(id => !localOrderIds.has(id));

      if (onlyLocal.length > 0) {
        warn(`⚠️ 로컬에만 있는 주문 ${onlyLocal.length}건:`, onlyLocal.slice(0, 5));
      }
      if (onlyCloud.length > 0) {
        log(`🆕 클라우드에만 있는 주문 ${onlyCloud.length}건:`, onlyCloud.slice(0, 5));
      }

      // 같은 ID인데 내용이 다른 주문 찾기
      const localMap = {};
      orders.forEach(o => { localMap[o.id] = JSON.stringify(o); });
      const diffOrders = orders2.filter(o => {
        return localMap[o.id] && localMap[o.id] !== JSON.stringify(o);
      });
      if (diffOrders.length > 0) {
        log(`🔄 내용이 다른 주문 ${diffOrders.length}건`);
      }

      // Firebase 에코 방지 플래그 설정
      isReceivingFromFirebaseRef.current = true;

      _setCustomersInternal(customers2);
      _setItemsInternal(items2);
      _setOrdersInternal(orders2);
      _setDriversInternal(drivers2);

      saveData(STORAGE_KEYS.customers, customers2);
      saveData(STORAGE_KEYS.items, items2);
      saveData(STORAGE_KEYS.orders, orders2);
      saveData(DRIVERS_KEY, drivers2);

      setTimeout(() => { isReceivingFromFirebaseRef.current = false; }, 100);

      log('🔄 ========== 새로고침 완료 ==========');
      showToast(
        `✓ 새로고침 완료: 주문 ${orders2.length}건` +
        (onlyCloud.length > 0 ? ` (신규 ${onlyCloud.length}건)` : '') +
        (diffOrders.length > 0 ? ` (변경 ${diffOrders.length}건)` : '')
      );
    } catch (err) {
      console.error('❌ 새로고침 실패:', err);
      showToast('새로고침 실패: ' + (err.message || '알 수 없는 오류'), 'error');
    }
    setRefreshing(false);
  };

  // 🎁 사은품 저장 래퍼 (localStorage + Supabase 동기화)
  const saveGifts = (newGifts) => {
    const resolved = typeof newGifts === 'function' ? newGifts(gifts) : newGifts;
    const prevGifts = gifts;  // 📋

    // 🛡️ 계산 필드 제거 (Supabase 스키마와 충돌 방지)
    // givenQty, recipientCount 등은 calcGiftStats로 계산되는 값이므로 저장 안 함
    const cleaned = resolved.map(g => {
      const { givenQty, recipientCount, reservedQty, reservedCount, totalUsed, totalRecipients, remaining, ...giftBase } = g;
      return giftBase;
    });

    setGifts(cleaned);
    saveData(GIFT_STORAGE_KEY, cleaned);

    // 🛡️ Firebase에서 받은 데이터이면 다시 업로드 안 함 (에코 방지)
    if (isReceivingFromFirebaseRef.current) return;

    // 📋 변경 이력 기록
    recordAuditDiff('gift', prevGifts, cleaned, g => g.name || g.id);

    // 🚀 Supabase 동기화 (다른 PC와 공유)
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      suppressRealtimeEcho(TABLES.gifts, 3000);
      setSaveState('saving');
      saveBatch(TABLES.gifts, cleaned)
        .then(result => {
          const saved = result?.saved || 0;
          const deleted = result?.deleted || 0;
          if (saved > 0 || deleted > 0) {
            log(`✓ gifts 저장됨: ${saved}건 업로드${deleted > 0 ? ` + ${deleted}건 삭제` : ''}`);
          }
          setSaveState('saved');
          setLastSaveTime(Date.now());
        })
        .catch(err => {
          console.error('❌ gifts 저장 실패:', err);
          setSaveState('error');
          showToast('사은품 저장 실패: ' + (err.message || '알 수 없는 오류'), 'error');
        });
    }
  };

  const itemsWithStock = useMemo(() => calcAvailStock(items, orders), [items, orders]);

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthed(false);
    setUserRole(null);
    setCurrentUser(null);  // 🆕
    setCurrentDriver(null);
  };

  const handleLoginSuccess = (result) => {
    setIsAuthed(true);
    setUserRole(result.role);
    setCurrentUser(result.userName || null);  // 🆕 관리자 이름
    if (result.role === 'driver') {
      setCurrentDriver(result.driver);
    } else {
      setCurrentDriver(null);
    }
  };

  // 로그인 체크 중에는 빈 화면
  if (!authChecked) {
    return <div className="min-h-screen bg-[#FAF7F2]"></div>;
  }

  // 로그인 안 됐으면 로그인 화면
  if (!isAuthed) {
    return <LoginScreen onSuccess={handleLoginSuccess} drivers={drivers} />;
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  // 🚚 배송기사 뷰 (모바일 최적화)
  if (userRole === 'driver') {
    return (
      <DriverApp
        driver={drivers.find(d => d.id === currentDriver?.id) || currentDriver}
        customers={customers}
        items={items}
        orders={orders}
        setOrders={setOrders}
        onLogout={handleLogout}
        showToast={showToast}
        toast={toast}
      />
    );
  }

  const nav = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3, shortcut: '1' },
    { id: 'orders', label: '주문관리', icon: ShoppingCart, shortcut: '2' },
    { id: 'customers', label: '고객관리', icon: Users, shortcut: '3' },
    { id: 'items', label: '품목/재고', icon: Package, shortcut: '4' },
    { id: 'gifts', label: '사은품', icon: Package, shortcut: '5' },
    { id: 'shipping', label: '배송관리', icon: Truck, shortcut: '6' },
    { id: 'drivers', label: '기사관리', icon: Truck, shortcut: '7' },
    { id: 'audit', label: '변경 이력', icon: History, shortcut: '8' },  // 모두 접근 가능 (User는 읽기 전용)
  ];

  const lowStockCount = itemsWithStock.filter(i => i.availStock <= 20).length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        /* 🎨 디자인 토큰 (Modern SaaS Trend)    */
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        :root {
          /* 🎨 컬러 - 단일 accent + 무채색 */
          --accent: #1A1A1A;
          --accent-hover: #000000;
          --accent-soft: #F4F4F5;

          /* 텍스트 */
          --text-primary: #09090B;
          --text-secondary: #52525B;
          --text-tertiary: #A1A1AA;
          --text-disabled: #D4D4D8;

          /* 배경 */
          --bg-base: #FFFFFF;
          --bg-subtle: #FAFAFA;
          --bg-muted: #F4F4F5;

          /* 보더 */
          --border-subtle: #E4E4E7;
          --border-default: #D4D4D8;
          --border-strong: #A1A1AA;

          /* 시맨틱 (최소화) */
          --success: #15803D;
          --success-soft: #F0FDF4;
          --warning: #B45309;
          --warning-soft: #FFFBEB;
          --danger: #B91C1C;
          --danger-soft: #FEF2F2;
          --info: #1D4ED8;
          --info-soft: #EFF6FF;

          /* 그림자 (미니멀) */
          --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
          --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04);

          /* 반경 */
          --radius-sm: 6px;
          --radius: 8px;
          --radius-md: 10px;
          --radius-lg: 12px;
          --radius-xl: 16px;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        /* 🔡 타이포그래피 시스템                */
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        html, body, #root, button, input, textarea, select, div {
          font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        body {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-primary);
          letter-spacing: -0.011em;
        }

        /* 제목 시스템 - 명확한 위계 */
        h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.3; color: var(--text-primary); }
        h2 { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.4; color: var(--text-primary); }
        h3 { font-size: 15px; font-weight: 600; letter-spacing: -0.015em; line-height: 1.5; color: var(--text-primary); }

        /* 한글 장식 제거 - Pretendard 통일 */
        .font-serif-ko {
          font-family: 'Pretendard Variable', 'Pretendard', system-ui, sans-serif;
          font-weight: 600;
          letter-spacing: -0.025em;
        }

        /* 📝 입력 폼 (가독성 우선) */
        input, select, textarea {
          font-feature-settings: "tnum" 1, "cv11" 1;
          font-variant-numeric: tabular-nums;
        }
        input[type="text"], input[type="number"], input[type="date"], input[type="tel"], input[type="password"], select, textarea {
          font-size: 14px;
          line-height: 1.5;
          letter-spacing: -0.011em;
          color: var(--text-primary);
        }
        input::placeholder, textarea::placeholder {
          color: var(--text-tertiary);
        }

        /* 📱 버튼 */
        button {
          -webkit-tap-highlight-color: transparent;
          letter-spacing: -0.011em;
          font-feature-settings: "cv11" 1;
        }

        /* 🎯 숫자 표시 - SF Pro 느낌 */
        .tabular-nums {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum" 1, "cv11" 1;
          letter-spacing: -0.02em;
        }

        /* 📋 모달 내부 폰트 통일 */
        .fixed input, .fixed select, .fixed textarea, .fixed button, .fixed div, .fixed span, .fixed label {
          font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        /* 🖼️ 스크롤바 (미니멀)                  */
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .scrollbar-slim::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-slim::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-slim::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
        .scrollbar-slim::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }

        /* 📱 스크롤바 숨김 (모바일/태블릿) */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* 📱 터치 디바이스 최적화 */
        @media (hover: none) and (pointer: coarse) {
          /* 터치 시 호버 효과 제거 */
          button, a, input, select, textarea {
            -webkit-tap-highlight-color: transparent;
          }
          /* 부드러운 스크롤 */
          * {
            -webkit-overflow-scrolling: touch;
          }
          /* 터치 타겟 최소 사이즈 보장 */
          button, a {
            min-height: 36px;
          }
          /* 작은 아이콘 버튼은 예외 (최소 32px) */
          button.p-1,
          button.p-1\.5 {
            min-height: 32px;
            min-width: 32px;
          }
        }

        /* 📱 iOS Safari 입력 필드 자동 줌 방지 */
        @media (max-width: 1024px) {
          input[type="text"],
          input[type="number"],
          input[type="password"],
          input[type="email"],
          input[type="tel"],
          input[type="search"],
          input[type="date"],
          textarea,
          select {
            font-size: 16px !important;
          }
        }

        /* 📱 모달 - 작은 화면에서 더 큰 영역 사용 */
        @media (max-width: 640px) {
          .modal-mobile-full {
            max-width: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
        }

        /* 📱 테이블 - 모바일/태블릿에서 가로 스크롤 강제 */
        @media (max-width: 1024px) {
          .table-scroll-mobile {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .table-scroll-mobile table {
            min-width: 600px;
          }
        }

        /* 📱 가로/세로 모드 안전 */
        @media (orientation: portrait) {
          .landscape-only { display: none !important; }
        }
        @media (orientation: landscape) {
          .portrait-only { display: none !important; }
        }

        ::-webkit-scrollbar { width: 12px; height: 12px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 6px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        ::-webkit-scrollbar-thumb:hover { background: var(--border-strong); background-clip: padding-box; border: 3px solid transparent; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        /* ✨ 애니메이션                         */
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.2s ease-out; }

        /* 🖱️ 부드러운 전환 */
        button, a {
          transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
        }

        /* 🎯 포커스 - 깔끔한 ring */
        button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: var(--radius-sm);
        }

        /* 📐 선택 */
        ::selection {
          background: var(--accent);
          color: white;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        /* 🎨 유틸리티 클래스                    */
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .card-modern {
          background: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }
        .card-modern:hover {
          border-color: var(--border-default);
        }

        .btn-primary {
          background: var(--accent);
          color: white;
          font-weight: 500;
        }
        .btn-primary:hover { background: var(--accent-hover); }

        .btn-secondary {
          background: var(--bg-base);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          font-weight: 500;
        }
        .btn-secondary:hover { background: var(--bg-muted); border-color: var(--border-default); }
      `}</style>

      {/* 📱 모바일/태블릿 오버레이 */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-full w-[260px] bg-white border-r border-[#E4E4E7] flex flex-col z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* 📱 모바일 닫기 버튼 */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-3 right-3 p-2 hover:bg-[#F4F4F5] rounded-lg"
        >
          <X size={18} />
        </button>
        {/* 로고 섹션 - 미니멀 */}
        <button
          onClick={() => {
            setView('dashboard');
            setSidebarOpen(false);
            setTimeout(() => window.location.reload(), 50);
          }}
          className="px-5 pt-6 pb-5 border-b border-[#E4E4E7] hover:bg-[#FAFAFA] transition-colors text-left w-full"
          title="대시보드로 이동"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E4E4E7] flex items-center justify-center overflow-hidden p-1">
              <img
                src="/icon-192.png"
                alt="김치하우스"
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class=\"text-[14px] font-semibold text-[#09090B]\">K</span>'; }}
              />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[#09090B] leading-tight">김치하우스</div>
              <div className="text-[11px] text-[#71717A] mt-0.5 font-medium">Kimchi House AU</div>
            </div>
          </div>
        </button>

        {/* 메뉴 섹션 */}
        <div className="px-3 py-4 flex-1 overflow-y-auto scrollbar-slim">
          <div className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider px-3 mb-2">메뉴</div>
          <nav className="space-y-0.5">
            {nav.map(({ id, label, icon: Icon, shortcut }) => (
              <button
                key={id}
                onClick={() => { setView(id); setSidebarOpen(false); }}
                className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[14px] transition-colors ${
                  view === id
                    ? 'bg-[#09090B] text-white'
                    : 'text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B]'
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="flex-1 text-left font-medium">{label}</span>
                {id === 'items' && lowStockCount > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold rounded-full ${
                    view === id ? 'bg-white/20 text-white' : 'bg-[#FEF2F2] text-[#B91C1C]'
                  }`}>{lowStockCount}</span>
                )}
                {shortcut && view !== id && (
                  <kbd className="hidden group-hover:inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-mono font-medium rounded bg-white border border-[#E4E4E7] text-[#71717A]">
                    {shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-3 py-3 border-t border-stone-100 space-y-3">
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 🗂️ 섹션 1: 전체 데이터 백업 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">💾 전체 데이터 백업</span>
            </div>
            {/* 백업 내보내기: 모두 가능 */}
            <button
              onClick={() => {
                try {
                  const filename = exportToExcel(customers, items, orders);
                  showToast(`${filename} 다운로드 완료!`);
                } catch (e) {
                  console.error(e);
                  showToast('백업 실패. 다시 시도해주세요.', 'error');
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              title="고객·주문·품목 전체를 엑셀로 저장"
            >
              <FileDown size={14} />
              <span className="flex-1 text-left">백업 내보내기</span>
              <span className="text-[9px] opacity-80">.xlsx</span>
            </button>
            {/* 백업 복원: Admin만 가능 */}
            {userRole === 'admin' ? (
              <BackupRestoreButton
                setCustomers={setCustomers}
                setItems={setItems}
                setOrders={setOrders}
                showToast={showToast}
              />
            ) : (
              <div className="w-full flex items-center gap-2 px-3 py-2.5 bg-stone-100 text-stone-400 rounded-lg text-xs font-medium cursor-not-allowed" title="복원은 관리자(Admin)만 가능합니다">
                <span className="text-sm">🔒</span>
                <span className="flex-1 text-left">백업 복원하기</span>
                <span className="text-[9px] px-1 bg-stone-200 rounded font-bold">ADMIN</span>
              </div>
            )}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 📦 섹션 2: 주문·배송 통합 업로드 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">주문·배송 통합</span>
            </div>
            <ExcelUploadButton
              customers={customers}
              items={items}
              orders={orders}
              setCustomers={setCustomers}
              setOrders={setOrders}
              showToast={showToast}
            />
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ⚙️ 섹션 3: 계정 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">⚙️ 계정</span>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-medium transition-all"
            >
              <span className="text-sm">🔐</span>
              <span className="flex-1 text-left">비밀번호 변경</span>
            </button>
            {/* 사용자 관리: Admin만 */}
            {userRole === 'admin' && (
              <button
                onClick={() => setShowEditUsers(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-medium transition-all"
              >
                <span className="text-sm">👥</span>
                <span className="flex-1 text-left">사용자 관리</span>
                <span className="text-[8px] px-1 bg-[#09090B] text-white rounded font-bold">ADMIN</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 bg-stone-50 hover:bg-red-50 hover:text-red-700 text-stone-500 rounded-lg text-xs font-medium transition-all"
            >
              <LogOut size={13} />
              <span className="flex-1 text-left">로그아웃</span>
            </button>
          </div>

          <div className="text-[9px] text-stone-400 leading-relaxed px-1 pt-2 border-t border-stone-100">
            💡 주 1회 '백업 내보내기' 권장
          </div>
        </div>
      </aside>

      <main className="lg:ml-[260px] min-h-screen bg-[#FAFAFA]">
        <header className="sticky top-0 z-10 bg-white border-b border-[#E4E4E7] px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between gap-3">
          {/* 📱 햄버거 메뉴 (모바일/태블릿만) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-[#F4F4F5] rounded-lg active:scale-95 transition-all"
            aria-label="메뉴 열기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] lg:text-[20px] font-semibold text-[#09090B] tracking-tight leading-tight truncate">
              {nav.find(n => n.id === view)?.label}
            </h1>
            <div className="text-[12px] lg:text-[13px] text-[#71717A] mt-0.5 truncate hidden sm:block">
              {view === 'dashboard' && '매출 · 주문 · 배송 현황을 한눈에 확인하세요'}
              {view === 'orders' && '주문을 등록하고 관리하세요'}
              {view === 'customers' && '고객 정보를 관리하세요'}
              {view === 'items' && '품목과 재고를 관리하세요'}
              {view === 'gifts' && '사은품 이벤트를 관리하세요'}
              {view === 'shipping' && '배송 상태를 업데이트하세요'}
              {view === 'drivers' && '배송기사 계정을 관리하세요'}
              {view === 'audit' && '누가 언제 무엇을 변경했는지 확인하세요'}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* 🔄 새로고침 버튼 (다른 PC 변경사항 즉시 반영) */}
            {isSupabaseConfigured && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#FAFAFA] hover:text-[#09090B] transition-colors disabled:opacity-50"
                title="다른 기기의 변경사항 즉시 불러오기"
              >
                <RotateCcw size={12} className={refreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{refreshing ? '불러오는 중' : '새로고침'}</span>
              </button>
            )}

            {/* 💾 저장 상태 버튼 (Notion/Linear 스타일) */}
            {isSupabaseConfigured && (
              <button
                onClick={handleSaveNow}
                disabled={saveState === 'saving'}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-colors ${
                  saveState === 'saved'
                    ? 'bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#FAFAFA] hover:text-[#09090B]'
                    : saveState === 'saving'
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] cursor-wait'
                    : saveState === 'error'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] hover:bg-[#FEE2E2]'
                    : 'bg-[#09090B] text-white border-[#09090B] hover:bg-black'
                }`}
                title={
                  saveState === 'saved' ? '모든 변경사항 저장됨 (클릭하여 다시 저장)' :
                  saveState === 'saving' ? '저장 중...' :
                  saveState === 'error' ? '저장 실패 - 클릭하여 재시도' :
                  '미저장 변경사항 있음 - 클릭하여 저장'
                }
              >
                {saveState === 'saved' ? (
                  <>
                    <Check size={12} strokeWidth={2.5} />
                    <span className="hidden md:inline">저장됨</span>
                  </>
                ) : saveState === 'saving' ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span className="hidden md:inline">저장 중</span>
                  </>
                ) : saveState === 'error' ? (
                  <>
                    <AlertCircle size={12} />
                    <span className="hidden md:inline">재시도</span>
                  </>
                ) : (
                  <>
                    <Save size={12} />
                    <span className="hidden md:inline">저장</span>
                  </>
                )}
              </button>
            )}

            {/* 실시간 동기화 상태 - 모바일에서 텍스트 숨김 */}
            {isSupabaseConfigured ? (
              <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border ${
                syncStatus === 'synced' ? 'bg-white text-[#15803D] border-[#BBF7D0]' :
                syncStatus === 'connecting' ? 'bg-white text-[#B45309] border-[#FEF3C7]' :
                'bg-white text-[#B91C1C] border-[#FECACA]'
              }`}>
                {syncStatus === 'synced' ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16A34A]"></span>
                    </span>
                    <span className="hidden md:inline">실시간 연결</span>
                  </>
                ) : syncStatus === 'connecting' ? (
                  <>
                    <Cloud size={12} className="animate-pulse" />
                    <span className="hidden md:inline">연결 중</span>
                  </>
                ) : (
                  <>
                    <CloudOff size={12} />
                    <span className="hidden md:inline">오프라인</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] font-medium bg-white text-[#71717A] border border-[#E4E4E7]">
                <CloudOff size={12} />
                <span className="hidden md:inline">로컬 모드</span>
              </div>
            )}

            {lowStockCount > 0 && (
              <button
                onClick={() => setView('items')}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#B45309] rounded-[8px] text-[12px] font-medium border border-[#FDE68A] hover:bg-[#FFFBEB] transition-colors"
              >
                <Bell size={12} />
                <span className="hidden md:inline">재고 경보</span>
                <span>{lowStockCount}</span>
              </button>
            )}

            {/* 오늘 날짜 - 태블릿 가로 이상에서만 */}
            <div className="hidden md:block flex-shrink-0 px-3 py-1.5 bg-white rounded-[8px] border border-[#E4E4E7]">
              <div className="text-[12px] font-medium text-[#09090B] tabular-nums">
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
            </div>

            {/* 🆕 현재 사용자 + 역할 표시 */}
            {currentUser && (
              <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium ${
                userRole === 'admin'
                  ? 'bg-[#09090B] text-white'
                  : 'bg-[#52525B] text-white'
              }`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                {userRole === 'admin' ? '👑' : '👤'} {currentUser}
              </div>
            )}
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-[1600px]">
          {view === 'dashboard' && <Dashboard customers={customers} items={itemsWithStock} orders={orders} gifts={gifts} setView={setView} />}
          {view === 'orders' && <Orders customers={customers} items={itemsWithStock} orders={orders} setOrders={setOrders} gifts={gifts} setGifts={saveGifts} showToast={showToast} />}
          {view === 'customers' && <Customers customers={customers} setCustomers={setCustomers} items={itemsWithStock} orders={orders} setOrders={setOrders} showToast={showToast} />}
          {view === 'items' && <Items items={itemsWithStock} setItems={setItems} showToast={showToast} />}
          {view === 'gifts' && <Gifts gifts={gifts} setGifts={saveGifts} orders={orders} setOrders={setOrders} customers={customers} items={itemsWithStock} showToast={showToast} setView={setView} />}
          {view === 'shipping' && <Shipping customers={customers} orders={orders} setOrders={setOrders} showToast={showToast} />}
          {view === 'drivers' && <DriversManagement drivers={drivers} setDrivers={setDrivers} orders={orders} showToast={showToast} />}
          {view === 'audit' && <AuditLog currentUser={currentUser} userRole={userRole} />}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-[10px] shadow-lg text-[13px] font-medium z-50 animate-slide-up ${
          toast.type === 'success' ? 'bg-[#09090B] text-white' : 'bg-[#B91C1C] text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {showChangePassword && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setShowChangePassword(false)}
          showToast={showToast}
        />
      )}

      {/* 🆕 사용자 관리 모달 (Admin만) */}
      {showEditUsers && userRole === 'admin' && (
        <EditUsersModal
          initialUsers={adminUsers}
          currentUser={currentUser}
          onSave={(newUsers) => {
            const saved = saveAdminUsers(newUsers);
            setAdminUsers(saved);
            showToast('✓ 사용자 정보가 변경되었습니다');
            setShowEditUsers(false);
          }}
          onClose={() => setShowEditUsers(false)}
        />
      )}
    </div>
  );
}

function Dashboard({ customers, items, orders, gifts = [], setView }) {
  const stats = useMemo(() => {
    const priceMap = {};
    items.forEach(i => { priceMap[i.name] = i.price || 0; });

    // 실매출 = 서비스 제외 + 취소 제외
    const paidOrders = orders.filter(o => !o.isService && o.shipStatus !== '취소');
    const serviceOrders = orders.filter(o => o.isService && o.shipStatus !== '취소');

    const totalSales = paidOrders.reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);
    const serviceSales = serviceOrders.reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);

    // 배송료 집계 (주문 단위, 픽업 제외)
    // 같은 고객이어도 픽업 주문은 배송료 없음, 배송 주문만 배송료 대상
    const customerTotalMap = {};
    paidOrders.forEach(o => {
      customerTotalMap[o.customerId] = (customerTotalMap[o.customerId] || 0) + (priceMap[o.itemName] || 0) * o.qty;
    });
    let shippingFeeTotal = 0;
    let shippingFeeCount = 0;
    // 고객별로 배송료 적용 여부 판단 (총 구매액 < $100)
    const shippingEligibleCustomers = new Set();
    Object.entries(customerTotalMap).forEach(([cid, total]) => {
      if (total < SHIPPING_THRESHOLD && total > 0) {
        shippingEligibleCustomers.add(cid);
      }
    });
    // 실제 부과되는 건수 = 배송료 대상 고객의 '배송' 주문만 카운트 (픽업 제외)
    // 단, 고객당 1회만 부과 (같은 고객이 여러 주문해도 $10 1번)
    const shippingChargedCustomers = new Set();
    paidOrders.forEach(o => {
      if (shippingEligibleCustomers.has(o.customerId) && !o.isPickup && !shippingChargedCustomers.has(o.customerId)) {
        shippingChargedCustomers.add(o.customerId);
        shippingFeeTotal += SHIPPING_FEE;
        shippingFeeCount += 1;
      }
    });
    const pickupCount = paidOrders.filter(o => o.isPickup).length;

    const deliveredCount = orders.filter(o => o.shipStatus === '배송완료').length;
    // 취소를 제외한 실제 배송 대상 주문 기준으로 완료율 계산
    const activeOrders = orders.filter(o => o.shipStatus !== '취소').length;
    // 자동등급 계산 (🆕 B2B 제외)
    const customerGrades = {};
    customers.forEach(c => {
      if (c.isB2B) {
        customerGrades[c.id] = '일반';  // B2B는 등급 계산 안 함
      } else {
        const total = customerTotalMap[c.id] || 0;
        customerGrades[c.id] = total >= GRADE_VIP_THRESHOLD ? 'VIP' : total >= GRADE_PREMIUM_THRESHOLD ? '우수' : '일반';
      }
    });
    const vipCount = Object.values(customerGrades).filter(g => g === 'VIP').length;

    return {
      totalOrders: paidOrders.length,
      totalSales,
      avgOrder: paidOrders.length > 0 ? Math.round(totalSales / paidOrders.length) : 0,
      vipCount,
      deliveryRate: activeOrders > 0 ? (deliveredCount / activeOrders) * 100 : 0,
      lowStock: items.filter(i => i.availStock <= 20).length,
      // 신규 통계
      serviceCount: serviceOrders.length,
      serviceSales,
      shippingFeeTotal,
      shippingFeeCount,
      pickupCount,
      customerGrades,
    };
  }, [customers, items, orders]);

  const itemStats = useMemo(() => {
    return items.map(it => {
      // 해당 품목의 주문 (취소 제외, 서비스 포함)
      const nonCancelled = orders.filter(o => o.itemName === it.name && o.shipStatus !== '취소');
      // 수량: 서비스 포함 (실제 재고 나간 것 기준)
      const qty = nonCancelled.reduce((s, o) => s + o.qty, 0);
      // 주문 건수: 서비스 포함
      const count = nonCancelled.length;
      // 매출: 서비스 제외 (무료이므로 매출 아님)
      const paidOnly = nonCancelled.filter(o => !o.isService);
      const paidQty = paidOnly.reduce((s, o) => s + o.qty, 0);
      const sales = paidQty * it.price;
      return { ...it, count, qty, sales };
    });
  }, [items, orders]);

  const totalItemSales = itemStats.reduce((s, i) => s + i.sales, 0);
  const gradeStats = ['VIP','우수','일반'].map(g => ({
    grade: g,
    count: Object.values(stats.customerGrades).filter(cg => cg === g).length
  }));

  const shipStats = ['배송준비중','출고대기','배송중','배송완료'].map(s => ({
    status: s,
    count: orders.filter(o => o.shipStatus === s).length
  }));
  const cancelCount = orders.filter(o => o.shipStatus === '취소').length;
  const waitingStockCount = orders.filter(o => o.shipStatus === '입고대기').length;

  const recent = [...orders].slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════ */}
      {/* 📊 오늘의 핵심 지표                            */}
      {/* ═══════════════════════════════════════════════ */}
      {(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const priceMap = {};
        items.forEach(i => { priceMap[i.name] = i.price || 0; });
        const todayOrders = orders.filter(o => o.date === todayStr);
        const todayRevenue = todayOrders.reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);
        const todayDelivered = orders.filter(o => o.shipStatus === '배송완료' && (o.shipDate === todayStr || o.arriveDate === todayStr)).length;

        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">오늘 매출</div>
              <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
                ${formatNum(todayRevenue)}
              </div>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">오늘 주문</div>
              <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
                {todayOrders.length}<span className="text-[16px] text-[#71717A] ml-1 font-normal">건</span>
              </div>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">오늘 배송</div>
              <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
                {todayDelivered}<span className="text-[16px] text-[#71717A] ml-1 font-normal">건</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════ */}
      {/* 🔔 알림 (조용한 디자인)                        */}
      {/* ═══════════════════════════════════════════════ */}
      {(() => {
        const unpaidCount = orders.filter(o => o.paymentStatus === '미결제' && o.shipStatus !== '취소' && !o.isService).length;
        const waitingCount = waitingStockCount;
        const lowStockCount = stats.lowStock;
        const prepareCount = orders.filter(o => o.shipStatus === '배송준비중').length;
        const alerts = [
          prepareCount > 0 && { label: '배송 대기', value: prepareCount, unit: '건', view: 'shipping' },
          unpaidCount > 0 && { label: '미결제', value: unpaidCount, unit: '건', view: 'orders' },
          waitingCount > 0 && { label: '입고 대기', value: waitingCount, unit: '건', view: 'orders' },
          lowStockCount > 0 && { label: '재고 부족', value: lowStockCount, unit: '종', view: 'items' },
        ].filter(Boolean);

        if (alerts.length === 0) {
          return (
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <div className="text-[14px] font-medium text-[#09090B]">모든 항목이 정상입니다</div>
              <div className="text-[13px] text-[#71717A]">현재 확인할 긴급 사항이 없어요</div>
            </div>
          );
        }

        return (
          <div className="bg-white border border-[#E4E4E7] rounded-[12px] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E4E4E7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <div className="text-[14px] font-semibold text-[#09090B]">확인이 필요한 항목</div>
              </div>
              <div className="text-[12px] text-[#71717A]">{alerts.length}개 항목</div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-[#E4E4E7]">
              {alerts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setView(a.view)}
                  className="p-5 text-left hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="text-[12px] font-medium text-[#71717A] mb-2">{a.label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">{a.value}</span>
                    <span className="text-[13px] text-[#71717A]">{a.unit}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════ */}
      {/* 📊 핵심 KPI (미니멀 카드)                     */}
      {/* ═══════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-[#09090B]">핵심 실적</h3>
          <div className="text-[12px] text-[#71717A]">전체 누적 · 서비스/취소 제외</div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
            <div className="text-[12px] font-medium text-[#71717A] mb-2">총 매출</div>
            <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
              ${formatNum(stats.totalSales)}
            </div>
            <div className="text-[12px] text-[#71717A] mt-1">주문 {stats.totalOrders}건 · 평균 ${formatNum(stats.avgOrder)}</div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
            <div className="text-[12px] font-medium text-[#71717A] mb-2">배송 완료율</div>
            <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
              {stats.deliveryRate.toFixed(1)}<span className="text-[16px] text-[#71717A] ml-0.5">%</span>
            </div>
            <div className="mt-3 h-1 bg-[#F4F4F5] rounded-full overflow-hidden">
              <div className="h-full bg-[#09090B] rounded-full" style={{ width: `${stats.deliveryRate}%` }} />
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
            <div className="text-[12px] font-medium text-[#71717A] mb-2">총 고객</div>
            <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
              {customers.length.toLocaleString()}
            </div>
            <div className="text-[12px] text-[#71717A] mt-1">VIP {stats.vipCount} · B2B {customers.filter(c => c.isB2B).length}</div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
            <div className="text-[12px] font-medium text-[#71717A] mb-2">배송료 수익</div>
            <div className="text-[28px] font-semibold text-[#09090B] tabular-nums tracking-tight">
              ${formatNum(stats.shippingFeeTotal)}
            </div>
            <div className="text-[12px] text-[#71717A] mt-1">{stats.shippingFeeCount}건 부과</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* 🚚 배송 현황 + Zone별                          */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 bg-white border border-[#E4E4E7] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[#09090B]">배송 현황</h3>
              {cancelCount > 0 && <div className="text-[12px] text-[#71717A] mt-0.5">취소 {cancelCount}건 제외</div>}
            </div>
            <button onClick={() => setView('shipping')} className="text-[12px] text-[#52525B] hover:text-[#09090B] font-medium">
              자세히 →
            </button>
          </div>

          <div className="grid grid-cols-4 divide-x divide-[#E4E4E7]">
            {shipStats.map(s => {
              const activeTotal = orders.filter(o => o.shipStatus !== '취소').length;
              const pct = activeTotal > 0 ? (s.count / activeTotal) * 100 : 0;
              return (
                <div key={s.status} className="p-5">
                  <div className="text-[12px] font-medium text-[#71717A] mb-2">{s.status}</div>
                  <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">{s.count}</div>
                  <div className="text-[11px] text-[#71717A] mt-1 tabular-nums">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>

          {/* Zone별 배송 */}
          <div className="px-5 py-4 border-t border-[#E4E4E7]">
            <div className="text-[12px] font-medium text-[#71717A] mb-3">Zone별 배송 (취소 제외)</div>
            <div className="grid grid-cols-8 gap-2">
              {SHIPPING_ZONES.map(z => {
                const count = orders.filter(o => o.shippingGroup === z && o.shipStatus !== '취소').length;
                return (
                  <div key={z} className="bg-[#FAFAFA] rounded-[8px] p-2.5 text-center border border-[#E4E4E7]">
                    <div className="text-[10px] font-medium text-[#71717A]">Z{z.replace('Zone', '')}</div>
                    <div className="text-[18px] font-semibold text-[#09090B] tabular-nums mt-1">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* B2B 거래처 */}
        <div className="bg-white border border-[#E4E4E7] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#09090B]">B2B 거래처</h3>
            <button onClick={() => setView('customers')} className="text-[12px] text-[#52525B] hover:text-[#09090B] font-medium">
              관리 →
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className="text-[12px] font-medium text-[#71717A] mb-1">거래처 수</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">
                {customers.filter(c => c.isB2B).length}
                <span className="text-[14px] text-[#71717A] ml-1">곳</span>
              </div>
            </div>

            <div className="h-px bg-[#E4E4E7]" />

            <div>
              <div className="text-[12px] font-medium text-[#71717A] mb-1">미수금 합계</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">
                ${formatNum((() => {
                  const b2bIds = new Set(customers.filter(c => c.isB2B).map(c => c.id));
                  return orders
                    .filter(o => b2bIds.has(o.customerId) && o.paymentStatus === '미결제' && o.shipStatus !== '취소')
                    .reduce((s, o) => s + (items.find(i => i.name === o.itemName)?.price || 0) * o.qty, 0);
                })())}
              </div>
            </div>

            <div className="h-px bg-[#E4E4E7]" />

            <div>
              <div className="text-[12px] font-medium text-[#71717A] mb-1">B2B 주문</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">
                {orders.filter(o => customers.find(c => c.id === o.customerId)?.isB2B && o.shipStatus !== '취소').length}
                <span className="text-[14px] text-[#71717A] ml-1">건</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 🎁 섹션 3.5: 진행 중 사은품 이벤트 */}
      {/* ══════════════════════════════════════════════════ */}
      {(() => {
        const activeGift = gifts.find(g => g.active);
        if (!activeGift) return null;

        // 🎁 공통 계산 함수 사용 (사은품 페이지와 동일 로직)
        const { givenQty, recipientCount, reservedQty, reservedCount, totalUsed, remaining } = calcGiftStats(activeGift, orders);
        const pct = activeGift.totalStock > 0 ? (totalUsed / activeGift.totalStock) * 100 : 0;

        return (
          <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 border-2 border-pink-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <div>
                  <h2 className="font-bold text-pink-900 text-sm flex items-center gap-2">
                    <span>진행 중 사은품 이벤트</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500 text-white rounded-full font-bold animate-pulse">LIVE</span>
                  </h2>
                  <p className="text-[11px] text-pink-700 mt-0.5">{activeGift.name}</p>
                </div>
              </div>
              <button onClick={() => setView('gifts')} className="text-[11px] text-pink-700 hover:text-pink-900 font-medium bg-white hover:bg-pink-100 px-3 py-1.5 rounded-lg">
                관리 →
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* 재고 사용 현황 (지급 + 예약) */}
              <div className="bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1">재고 사용 현황</div>
                <div className="text-2xl font-bold tabular-nums">
                  <span className="text-red-700">{totalUsed}</span>
                  <span className="text-xs font-normal text-stone-400 ml-0.5">/{activeGift.totalStock}개</span>
                </div>
                <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 90 ? 'bg-red-500' :
                      pct >= 70 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className={`text-[10px] mt-1.5 font-semibold tabular-nums ${
                  remaining === 0 ? 'text-red-700' :
                  remaining <= 50 ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {remaining}개 남음 · {pct.toFixed(0)}% 사용
                </div>
                {reservedQty > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-stone-100 text-[10px] text-stone-600 tabular-nums">
                    <div className="flex justify-between">
                      <span>지급</span>
                      <span className="font-semibold">{givenQty}개</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>예약</span>
                      <span className="font-semibold">{reservedQty}개</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 지급 완료 (명) */}
              <div className="bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1">지급 완료</div>
                <div className="text-2xl font-bold text-stone-800 tabular-nums">
                  {recipientCount}<span className="text-xs font-normal text-stone-400 ml-0.5">명</span>
                </div>
                {reservedCount > 0 ? (
                  <div className="text-[10px] text-stone-500 mt-1">+ 예약 <span className="text-amber-700 font-semibold">{reservedCount}명</span></div>
                ) : (
                  <div className="text-[10px] text-stone-500 mt-1">실제 배송됨</div>
                )}
              </div>

              {/* 지급 + 예약 (개) */}
              <div className="bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1">지급 + 예약</div>
                <div className="text-2xl font-bold text-stone-800 tabular-nums">
                  {totalUsed}<span className="text-xs font-normal text-stone-400 ml-0.5">개</span>
                </div>
                {reservedQty > 0 ? (
                  <div className="text-[10px] text-stone-500 mt-1 tabular-nums">
                    지급 {givenQty} + 예약 <span className="text-amber-700 font-semibold">{reservedQty}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-500 mt-1">지급됨 {givenQty}개</div>
                )}
              </div>

              {/* 지급 기준 */}
              <div className="bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1.5">📋 자동 지급 기준</div>
                <div className="space-y-1">
                  {(activeGift.tiers || DEFAULT_GIFT_TIERS).sort((a, b) => a.minAmount - b.minAmount).map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-700">${tier.minAmount} 이상</span>
                      <span className="font-bold text-pink-700">{tier.qty}개 지급</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 경보 */}
            {remaining <= 50 && remaining > 0 && (
              <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded-lg text-xs text-amber-900 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>사은품 재고가 얼마 남지 않았습니다 ({remaining}개)</span>
              </div>
            )}
            {remaining === 0 && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg text-xs text-red-900 font-semibold flex items-center gap-2">
                <span>🚨</span>
                <span>사은품 재고가 모두 소진되었습니다!</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════ */}
      {/* 📦 섹션 4: 품목별 판매 분석 */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
              <span>📦</span>
              <span>품목별 판매 현황</span>
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">매출 기준 정렬 · 🥇🥈🥉 순위 표시</p>
          </div>
          <button onClick={() => setView('items')} className="text-[11px] text-stone-500 hover:text-stone-800 font-medium">자세히 →</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...itemStats].sort((a, b) => b.sales - a.sales).map((it, idx) => {
            const pct = totalItemSales > 0 ? (it.sales / totalItemSales) * 100 : 0;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            const icon = it.name.includes('배추') && !it.name.includes('총각') && !it.name.includes('혼합') ? '🥬' :
                         it.name.includes('총각') && !it.name.includes('배추') && !it.name.includes('혼합') ? '🥕' :
                         it.name.includes('혼합') ? '🎁' : '📦';

            return (
              <div
                key={it.code}
                className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-sm ${
                  idx === 0 ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white' :
                  it.isSet ? 'border-stone-200 bg-gradient-to-br from-orange-50/30 to-white' :
                  'border-stone-200 bg-gradient-to-br from-red-50/30 to-white'
                }`}
              >
                {medal && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-lg">
                    {medal}
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl">{icon}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    it.isSet ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {it.isSet ? '세트' : '기본'}
                  </span>
                </div>

                <div className="font-semibold text-sm text-stone-800 leading-tight mb-2 min-h-[36px]">
                  {it.name}
                </div>

                <div className="mb-2">
                  <div className="text-[10px] text-stone-500">매출</div>
                  <div className="text-lg font-bold text-red-800 tabular-nums">{formatWon(it.sales)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                  <div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider">주문</div>
                    <div className="text-xs font-bold text-stone-700 tabular-nums">{it.count}<span className="text-[10px] font-normal text-stone-400 ml-0.5">건</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wider">수량</div>
                    <div className="text-xs font-bold text-stone-700 tabular-nums">{it.qty}<span className="text-[10px] font-normal text-stone-400 ml-0.5">개</span></div>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-stone-500">비중</span>
                    <span className="text-[10px] font-semibold text-stone-700">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                        it.isSet ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                        'bg-gradient-to-r from-red-700 to-red-800'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 👥 섹션 5: 최근 주문 + 고객 등급 */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
              <span>🕐</span>
              <span>최근 주문</span>
            </h2>
            <button onClick={() => setView('orders')} className="text-[11px] text-stone-500 hover:text-stone-800 font-medium">전체 보기 →</button>
          </div>
          <div className="space-y-1.5">
            {recent.map(o => {
              const cust = customers.find(c => c.id === o.customerId);
              const it = items.find(i => i.name === o.itemName);
              return (
                <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 hover:bg-stone-100">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-[10px] font-mono text-stone-400 w-16 shrink-0">{o.id}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-stone-800 truncate">{cust?.name || '-'}</span>
                        {cust?.isB2B && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-600 text-white font-bold shrink-0">B2B</span>}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">{o.itemName} × {o.qty}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${shipStatusStyle(o.shipStatus)}`}>{o.shipStatus}</span>
                    <span className="text-xs font-bold text-stone-800 tabular-nums w-16 text-right">{formatWon((it?.price || 0) * o.qty)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2 mb-4">
            <span>🎖️</span>
            <span>고객 등급 분포</span>
          </h2>
          <div className="space-y-2.5">
            {gradeStats.map(g => {
              const pct = customers.length > 0 ? (g.count / customers.length) * 100 : 0;
              return (
                <div key={g.grade}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${gradeStyle(g.grade)}`}>{g.grade}</span>
                    <span className="text-xs font-bold text-stone-800 tabular-nums">{g.count}명</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-700 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-stone-500">전체 고객</div>
              <div className="text-lg font-bold text-stone-800 tabular-nums">{customers.length}<span className="text-[10px] text-stone-400 ml-0.5">명</span></div>
            </div>
            <div>
              <div className="text-[10px] text-indigo-700">B2B 거래처</div>
              <div className="text-lg font-bold text-indigo-900 tabular-nums">{customers.filter(c => c.isB2B).length}<span className="text-[10px] text-indigo-500 ml-0.5">곳</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 📎 섹션 6: 부가 지표 (맨 아래, 작게) */}
      {/* ══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-stone-500">📎 부가 지표</span>
          <span className="text-[10px] text-stone-400">참고용</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🎁</span>
              <div>
                <div className="text-[11px] font-semibold text-stone-700">서비스 증정</div>
                <div className="text-[10px] text-stone-400">매출 제외</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-stone-800 tabular-nums">{stats.serviceCount}<span className="text-[10px] font-normal text-stone-400 ml-0.5">건</span></div>
              <div className="text-[10px] text-stone-500">환산 {formatWon(stats.serviceSales)}</div>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🚚</span>
              <div>
                <div className="text-[11px] font-semibold text-stone-700">배송료 수입</div>
                <div className="text-[10px] text-stone-400">$100 미만 · $10/건</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-stone-800 tabular-nums">{formatWon(stats.shippingFeeTotal)}</div>
              <div className="text-[10px] text-stone-500">{stats.shippingFeeCount}건 부과</div>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <div>
                <div className="text-[11px] font-semibold text-stone-700">픽업 주문</div>
                <div className="text-[10px] text-stone-400">배송료 면제</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-stone-800 tabular-nums">{stats.pickupCount}<span className="text-[10px] font-normal text-stone-400 ml-0.5">건</span></div>
              <div className="text-[10px] text-stone-500">직접 픽업</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, accent, icon: Icon, big, warn }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 ${warn ? 'border-amber-300 ring-2 ring-amber-100' : 'border-stone-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-2 h-8 rounded-full ${accent}`} />
        {Icon && <Icon size={16} className="text-stone-400" />}
      </div>
      <div className="text-xs text-stone-500 font-medium mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-bold text-stone-800 tabular-nums ${big ? 'text-xl' : 'text-2xl'}`}>{value}</span>
        <span className="text-xs text-stone-400 font-medium">{unit}</span>
      </div>
    </div>
  );
}

function Orders({ customers, items, orders, setOrders, gifts, setGifts, showToast }) {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all' | 'b2c' | 'b2b' | 'waiting' | 'split'
  const [productFilter, setProductFilter] = useState(''); // 🆕 상품 필터 (itemName)
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [msgTarget, setMsgTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [showDupOrders, setShowDupOrders] = useState(false);  // 🆕 중복 주문 정리 모달

  // 🆕 체크박스 선택 상태
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // 🆕 체크박스 함수들
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (visibleIds) => {
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // 🆕 일괄 삭제
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건의 주문을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setOrders(orders.filter(o => !selectedIds.has(o.id)));
    showToast(`✅ ${selectedIds.size}건 삭제 완료`);
    clearSelection();
  };

  // 🆕 일괄 상태 변경
  const handleBulkStatus = (status) => {
    if (selectedIds.size === 0) return;
    setOrders(orders.map(o => selectedIds.has(o.id) ? { ...o, shipStatus: status } : o));
    showToast(`✅ ${selectedIds.size}건 → ${status}`);
    clearSelection();
  };

  // 🆕 일괄 결제 상태 변경
  const handleBulkPayment = (status) => {
    if (selectedIds.size === 0) return;
    setOrders(orders.map(o => selectedIds.has(o.id) ? { ...o, paymentStatus: status } : o));
    showToast(`✅ ${selectedIds.size}건 결제 → ${status}`);
    clearSelection();
  };

  // 성능 최적화: 고객ID → 고객 객체 맵
  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  // 성능 최적화: 품목명 → 가격 맵
  const priceMap = useMemo(() => {
    const map = {};
    items.forEach(i => { map[i.name] = i.price || 0; });
    return map;
  }, [items]);

  // 고객별 총 주문액 맵 (배송료 판단용)
  const customerTotalMap = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      map[o.customerId] = (map[o.customerId] || 0) + (priceMap[o.itemName] || 0) * o.qty;
    });
    return map;
  }, [orders, priceMap]);

  // 년/월 옵션 추출
  const availableYears = useMemo(() => {
    const years = new Set();
    orders.forEach(o => { if (o.date) years.add(o.date.slice(0, 4)); });
    return [...years].sort().reverse();
  }, [orders]);

  const filtered = useMemo(() => {
    let result = [...orders];
    if (yearFilter) result = result.filter(o => (o.date || '').startsWith(yearFilter));
    if (monthFilter) {
      result = result.filter(o => {
        if (!o.date) return false;
        const month = o.date.slice(5, 7);
        return month === monthFilter;
      });
    }
    if (zoneFilter) result = result.filter(o => o.shippingGroup === zoneFilter);
    // 🆕 상품 필터 (단일 품목 또는 items 배열 내 포함)
    if (productFilter) {
      result = result.filter(o => {
        // 취소만 제외 (서비스는 실제 재고 차감이라 포함)
        if (o.shipStatus === '취소') return false;
        // 다품목: items 배열 내 포함 여부
        if (o.items && Array.isArray(o.items) && o.items.length > 0) {
          return o.items.some(it => it.itemName === productFilter);
        }
        // 단일 품목
        return o.itemName === productFilter;
      });
    }
    // 주문 유형 필터
    if (orderTypeFilter === 'b2c') result = result.filter(o => !customerMap[o.customerId]?.isB2B);
    else if (orderTypeFilter === 'b2b') result = result.filter(o => customerMap[o.customerId]?.isB2B);
    else if (orderTypeFilter === 'waiting') result = result.filter(o => o.shipStatus === '입고대기');
    else if (orderTypeFilter === 'split') result = result.filter(o => o.splitDeliveries?.length > 0);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o => {
        const c = customerMap[o.customerId];
        return o.id.toLowerCase().includes(s) ||
          (c?.name || '').toLowerCase().includes(s) ||
          o.customerId.toLowerCase().includes(s) ||
          o.itemName.toLowerCase().includes(s);
      });
    }
    // 정렬
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let av, bv;
      if (sortKey === 'id') { av = a.id; bv = b.id; }
      else if (sortKey === 'date') { av = a.date || ''; bv = b.date || ''; }
      else if (sortKey === 'zone') { av = a.shippingGroup || ''; bv = b.shippingGroup || ''; }
      else if (sortKey === 'customer') {
        av = (customerMap[a.customerId]?.name || '').toLowerCase();
        bv = (customerMap[b.customerId]?.name || '').toLowerCase();
      }
      else if (sortKey === 'item') { av = a.itemName; bv = b.itemName; }
      else if (sortKey === 'qty') { av = a.qty; bv = b.qty; }
      else if (sortKey === 'amount') {
        av = (priceMap[a.itemName] || 0) * a.qty;
        bv = (priceMap[b.itemName] || 0) * b.qty;
      }
      else if (sortKey === 'status') { av = a.shipStatus; bv = b.shipStatus; }
      else { av = a.id; bv = b.id; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return result;
  }, [orders, search, yearFilter, monthFilter, zoneFilter, orderTypeFilter, productFilter, sortKey, sortDir, customerMap, priceMap]);

  // 🆕 상품별 판매 수량 집계 (productFilter 무시 · 다른 필터만 반영)
  // ✨ items 테이블 기반 동적 카운팅: 거래처 전용 상품도 자동 포함
  const productCounts = useMemo(() => {
    // ① items 테이블 기반 초기화 (모든 상품 0으로 시작)
    const counts = {};
    items.forEach(it => {
      counts[it.name] = 0;
    });

    // productFilter만 제외한 필터 세트로 orders 필터링
    let baseFiltered = [...orders];
    if (yearFilter) baseFiltered = baseFiltered.filter(o => (o.date || '').startsWith(yearFilter));
    if (monthFilter) {
      baseFiltered = baseFiltered.filter(o => {
        if (!o.date) return false;
        return o.date.slice(5, 7) === monthFilter;
      });
    }
    if (zoneFilter) baseFiltered = baseFiltered.filter(o => o.shippingGroup === zoneFilter);
    if (orderTypeFilter === 'b2c') baseFiltered = baseFiltered.filter(o => !customerMap[o.customerId]?.isB2B);
    else if (orderTypeFilter === 'b2b') baseFiltered = baseFiltered.filter(o => customerMap[o.customerId]?.isB2B);
    else if (orderTypeFilter === 'waiting') baseFiltered = baseFiltered.filter(o => o.shipStatus === '입고대기');
    else if (orderTypeFilter === 'split') baseFiltered = baseFiltered.filter(o => o.splitDeliveries?.length > 0);
    if (search) {
      const s = search.toLowerCase();
      baseFiltered = baseFiltered.filter(o => {
        const c = customerMap[o.customerId];
        return o.id.toLowerCase().includes(s) ||
          (c?.name || '').toLowerCase().includes(s) ||
          o.customerId.toLowerCase().includes(s) ||
          o.itemName.toLowerCase().includes(s);
      });
    }

    baseFiltered.forEach(o => {
      // 취소만 제외 (서비스/B2B/입고대기 등 모두 포함 - 실제 재고 영향)
      if (o.shipStatus === '취소') return;
      // 다품목 주문 처리 (items 배열)
      if (o.items && Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach(it => {
          // items 테이블에 없는 상품도 동적 추가
          if (counts[it.itemName] === undefined) {
            counts[it.itemName] = 0;
          }
          counts[it.itemName] += it.qty || 0;
        });
      } else {
        // 단일 품목
        if (counts[o.itemName] === undefined) {
          counts[o.itemName] = 0;
        }
        counts[o.itemName] += o.qty || 0;
      }
    });
    return counts;
  }, [orders, items, search, yearFilter, monthFilter, zoneFilter, orderTypeFilter, customerMap]);

  useEffect(() => { setDisplayLimit(50); }, [search, yearFilter, monthFilter, zoneFilter, orderTypeFilter, productFilter]);

  const nextOrderId = () => {
    const nums = orders.map(o => parseInt(o.id.replace('ORD-',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'ORD-' + String(max + 1).padStart(4, '0');
  };

  const handleSave = (order) => {
    // 🚀 모달 먼저 닫기 (UI 반응성)
    setShowForm(false);
    setEditTarget(null);

    // 🚀 백그라운드 저장 (함수형 setState로 stale 참조 방지)
    setTimeout(() => {
      if (editTarget) {
        // ⚠️ 함수형 업데이트: 최신 orders 상태를 받아 변경
        setOrders(prev => prev.map(o => o.id === editTarget.id ? { ...o, ...order, id: editTarget.id } : o));
        showToast('주문이 수정되었습니다');
      } else {
        // 최신 orders 기반으로 새 ID 생성 + 추가 (함수형 업데이트)
        setOrders(prev => {
          const allNums = prev.map(o => {
            const m = o.id?.match(/ORD-(\d+)/);
            return m ? parseInt(m[1]) : 0;
          });
          const maxNum = allNums.length > 0 ? Math.max(...allNums) : 0;
          const newId = `ORD-${String(maxNum + 1).padStart(4, '0')}`;
          const newOrder = {
            id: newId,
            shipStatus: '배송준비중',
            deliveryMethod: '',
            paymentType: '',
            paymentStatus: '미결제',
            deliveryMemo: '',
            shipDate: '',
            arriveDate: '',
            shippingGroup: '',
            isService: false,
            isPickup: false,
            cashReceived: 0,
            ...order,
          };
          return [...prev, newOrder];
        });
        const itemCount = Array.isArray(order.items) ? order.items.length : 1;
        showToast(itemCount > 1 ? `✅ 주문 등록 (${itemCount}개 품목)` : '주문이 등록되었습니다');
      }
    }, 50);
  };

  // ⏳ 입고대기 → 배송준비중 전환 (재고 입고 시)
  const handleStockIn = (orderId) => {
    const o = orders.find(x => x.id === orderId);
    if (!o) return;
    if (!confirm(`"${o.itemName}" ${o.qty}개를 입고 처리할까요?\n상태가 "배송준비중"으로 변경됩니다.`)) return;
    setOrders(orders.map(x => x.id === orderId ? { ...x, shipStatus: '배송준비중' } : x));
    showToast(`✅ 입고 완료! 배송준비중으로 전환되었습니다`);
  };

  const handleDelete = (id) => {
    if (confirm('이 주문을 삭제할까요?')) {
      setOrders(orders.filter(o => o.id !== id));
      showToast('삭제되었습니다');
    }
  };

  return (
    <div className="space-y-4">
      {/* 🆕 상품별 판매 수량 (필터 반영 · 클릭 시 필터링) */}
      <div className="bg-white rounded-[12px] border border-[#E4E4E7] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E4E4E7] flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[#09090B]">상품별 판매 수량</div>
            <div className="text-[11px] text-[#71717A] mt-0.5">
              {productFilter ? (
                <span className="inline-flex items-center gap-1 text-[#09090B] font-medium">
                  <span className="inline-block w-1 h-1 rounded-full bg-[#09090B]" />
                  {productFilter} 주문자만 표시 중
                </span>
              ) : (
                '서비스 포함 · 취소 제외 · 카드 클릭 시 해당 상품 주문자만 필터링'
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {productFilter && (
              <button
                onClick={() => setProductFilter('')}
                className="text-[11px] text-[#71717A] hover:text-[#09090B] transition-colors"
              >
                필터 해제
              </button>
            )}
            <div className="text-[11px] text-[#71717A]">
              총 <span className="font-semibold text-[#09090B] tabular-nums">
                {Object.values(productCounts).reduce((s, v) => s + v, 0)}
              </span>개
            </div>
          </div>
        </div>
        <div
          className="grid divide-x divide-[#E4E4E7]"
          style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
        >
          {items.map(p => {
            const isActive = productFilter === p.name;
            const count = productCounts[p.name] || 0;
            // 상품명 파싱: '배추김치 4KG - 2세트(할인)' → label='배추김치 4KG', short='2세트'
            let label = p.name;
            let short = '';
            const match = p.name.match(/^(.+?)\s*-\s*(.+?)(?:\(할인\))?$/);
            if (match) {
              label = match[1].trim();
              short = match[2].trim();
            } else if (p.name.includes('혼합세트')) {
              label = '혼합세트';
              short = '배추+총각';
            } else {
              // '배추김치 4KG' 같은 단일 상품: label은 그대로, short는 '1세트'
              short = '1세트';
            }
            return (
              <button
                key={p.code || p.name}
                onClick={() => setProductFilter(isActive ? '' : p.name)}
                disabled={count === 0}
                className={`px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'bg-[#09090B]'
                    : count === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-[#FAFAFA] cursor-pointer'
                }`}
                title={p.name}
              >
                <div className={`text-[11px] font-medium mb-0.5 truncate ${isActive ? 'text-white/70' : 'text-[#71717A]'}`}>
                  {label}
                </div>
                <div className={`text-[10px] mb-1.5 truncate ${isActive ? 'text-white/50' : 'text-[#A1A1AA]'}`}>
                  {short}
                </div>
                <div className={`text-[22px] font-semibold tabular-nums tracking-tight ${isActive ? 'text-white' : 'text-[#09090B]'}`}>
                  {count}
                  <span className={`text-[12px] ml-1 font-normal ${isActive ? 'text-white/70' : 'text-[#71717A]'}`}>개</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 검색 + 새 주문 버튼 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="주문번호, 고객명, 품목 검색"
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4E4E7] rounded-[8px] text-[14px] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#09090B] transition-colors"
          />
        </div>

        {/* 🆕 중복 주문 정리 버튼 - 항상 표시 (모달에서 기간 직접 설정 가능) */}
        {(() => {
          // 현재 필터링된 주문에서 고객별 중복 감지 (표시용 카운트)
          const customerOrderCount = {};
          filtered.forEach(o => {
            if (!o.customerId) return;
            if (!customerOrderCount[o.customerId]) customerOrderCount[o.customerId] = 0;
            customerOrderCount[o.customerId]++;
          });
          const dupCustomerCount = Object.values(customerOrderCount).filter(c => c > 1).length;

          return (
            <button
              onClick={() => setShowDupOrders(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                dupCustomerCount > 0
                  ? 'bg-white hover:bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]'
                  : 'bg-white hover:bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B]'
              }`}
              title="같은 고객의 중복 주문을 정리합니다 (기간 설정 가능)"
            >
              {dupCustomerCount > 0 ? <AlertTriangle size={14} /> : <Copy size={14} />}
              중복 주문 {dupCustomerCount > 0 && <span className="tabular-nums">{dupCustomerCount}명</span>}
            </button>
          );
        })()}

        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[14px] font-medium transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          새 주문
        </button>
      </div>

      {/* 선택 액션 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-white border border-[#E4E4E7] rounded-[10px]">
          <div className="flex items-center gap-2 pr-3 border-r border-[#E4E4E7]">
            <span className="text-[13px] font-medium text-[#09090B]">
              {selectedIds.size}개 선택됨
            </span>
            <button
              onClick={clearSelection}
              className="text-[12px] text-[#71717A] hover:text-[#09090B] transition-colors"
            >
              해제
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#71717A] mr-1">배송</span>
            <button onClick={() => handleBulkStatus('배송준비중')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">준비중</button>
            <button onClick={() => handleBulkStatus('출고대기')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">출고대기</button>
            <button onClick={() => handleBulkStatus('배송중')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">배송중</button>
            <button onClick={() => handleBulkStatus('배송완료')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">완료</button>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E4E4E7]">
            <span className="text-[11px] text-[#71717A] mr-1">결제</span>
            <button onClick={() => handleBulkPayment('미결제')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">미결제</button>
            <button onClick={() => handleBulkPayment('결제완료')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">완료</button>
          </div>

          <button
            onClick={handleBulkDelete}
            className="ml-auto px-3 py-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] rounded-[6px] text-[12px] font-medium transition-colors"
          >
            삭제
          </button>
        </div>
      )}

      {/* 주문 유형 탭 */}
      <div className="flex items-center gap-1 border-b border-[#E4E4E7]">
        {[
          { id: 'all', label: '전체', count: orders.length },
          { id: 'b2c', label: '개인', count: orders.filter(o => !customerMap[o.customerId]?.isB2B).length },
          { id: 'b2b', label: '거래처', count: orders.filter(o => customerMap[o.customerId]?.isB2B).length },
          { id: 'waiting', label: '입고대기', count: orders.filter(o => o.shipStatus === '입고대기').length },
          { id: 'split', label: '분할 배송', count: orders.filter(o => o.splitDeliveries?.length > 0).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setOrderTypeFilter(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              orderTypeFilter === tab.id
                ? 'text-[#09090B] border-[#09090B]'
                : 'text-[#71717A] hover:text-[#09090B] border-transparent'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-[12px] tabular-nums ${orderTypeFilter === tab.id ? 'text-[#52525B]' : 'text-[#A1A1AA]'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 기간 & Zone 필터 */}
      <div className="bg-white rounded-[10px] border border-[#E4E4E7] p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#71717A]">기간</span>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E4E4E7] rounded-[6px] text-[12px] bg-white text-[#09090B] focus:outline-none focus:border-[#09090B] cursor-pointer transition-colors"
          >
            <option value="">전체 년도</option>
            {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E4E4E7] rounded-[6px] text-[12px] bg-white text-[#09090B] focus:outline-none focus:border-[#09090B] cursor-pointer transition-colors"
          >
            <option value="">전체 월</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m =>
              <option key={m} value={m}>{parseInt(m)}월</option>
            )}
          </select>
        </div>

        <div className="w-px h-5 bg-[#E4E4E7]" />

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[12px] font-medium text-[#71717A] mr-1">Zone</span>
          <button
            onClick={() => setZoneFilter('')}
            className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
              zoneFilter === '' ? 'bg-[#09090B] text-white' : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
            }`}>
            전체
          </button>
          {SHIPPING_ZONES.map(z => (
            <button
              key={z}
              onClick={() => setZoneFilter(zoneFilter === z ? '' : z)}
              className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
                zoneFilter === z
                  ? 'bg-[#09090B] text-white'
                  : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
              }`}>
              Z{z.replace('Zone', '')}
            </button>
          ))}
        </div>

        {(yearFilter || monthFilter || zoneFilter) && (
          <button
            onClick={() => { setYearFilter(''); setMonthFilter(''); setZoneFilter(''); }}
            className="text-[12px] text-[#71717A] hover:text-[#09090B] transition-colors">
            초기화
          </button>
        )}

        <div className="ml-auto text-[12px] text-[#71717A]">
          <span className="font-medium text-[#09090B] tabular-nums">{filtered.length}</span>건
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-[13px]">
            <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#09090B] cursor-pointer"
                    checked={filtered.length > 0 && filtered.slice(0, displayLimit).every(o => selectedIds.has(o.id))}
                    onChange={() => toggleSelectAll(filtered.slice(0, displayLimit).map(o => o.id))}
                    title="전체 선택"
                  />
                </th>
                <SortHeader label="주문번호" field="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="주문일" field="date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="Zone" field="zone" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="고객" field="customer" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="품목" field="item" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="수량" field="qty" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="금액" field="amount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="상태" field="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(o => {
                const c = customerMap[o.customerId];
                const isB2B_o = !!c?.isB2B;
                const discount_o = c?.b2bDiscount || 0;

                // 🆕 다품목 주문 처리: items 배열이 있으면 합계 계산
                let total = 0;
                if (Array.isArray(o.items) && o.items.length > 0) {
                  o.items.forEach(it => {
                    const bp = priceMap[it.itemName] || 0;
                    const up = isB2B_o ? getB2BPrice(bp, discount_o) : bp;
                    total += up * it.qty;
                  });
                } else {
                  const basePrice = priceMap[o.itemName] || 0;
                  const unitPrice_o = isB2B_o ? getB2BPrice(basePrice, discount_o) : basePrice;
                  total = unitPrice_o * o.qty;
                }
                const basePrice = priceMap[o.itemName] || 0;
                const unitPrice_o = isB2B_o ? getB2BPrice(basePrice, discount_o) : basePrice;

                // 서비스면 배송료/금액 없음
                const isServ = !!o.isService;
                const isWaitingStock = o.shipStatus === '입고대기';
                const customerTotal = customerTotalMap[o.customerId] || 0;
                const needsShipping = !isServ && !o.isPickup && !isB2B_o && customerTotal < SHIPPING_THRESHOLD;
                const finalTotal = isServ ? 0 : total + (needsShipping ? SHIPPING_FEE : 0);
                return (
                  <tr key={o.id} className={`border-b border-stone-100 hover:bg-stone-50 ${
                    selectedIds.has(o.id) ? 'bg-red-50/50' :
                    isServ ? 'bg-amber-50/40' :
                    isWaitingStock ? 'bg-purple-50/40' :
                    isB2B_o ? 'bg-indigo-50/30' :
                    c?.agedCare ? 'bg-amber-50/20' : ''
                  }`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-red-700 cursor-pointer"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-red-800">{o.id}</span>
                        {isServ && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500 text-white font-bold">🎁 서비스</span>}
                        {o.isPickup && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500 text-white font-bold">📍 픽업</span>}
                        {isWaitingStock && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500 text-white font-bold">⏳ 입고대기</span>}
                        {o.splitDeliveries?.length > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-500 text-white font-bold">📦 분할{o.splitDeliveries.length}회</span>}
                        {o.giftQty > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-pink-500 text-white font-bold" title={o.giftName || '사은품'}>🎁 {o.giftQty}</span>}
                        {o.paymentStatus === 'paid' && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded bg-emerald-600 text-white font-bold"
                            title={`이미 결제됨 (${o.paymentMethod === 'cash' ? '현금' : '계좌이체'})`}
                          >
                            💰 {o.paymentMethod === 'cash' ? '현금' : '입금'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {o.date}
                      {o.expectedStockDate && (
                        <div className="text-[10px] text-purple-700 font-semibold mt-0.5">입고: {o.expectedStockDate}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.shippingGroup ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ZONE_COLORS[o.shippingGroup] || 'bg-stone-100 text-stone-600'}`}>
                          {o.shippingGroup.replace('Zone', 'Z')}
                        </span>
                      ) : <span className="text-stone-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium text-stone-800">{c?.name || '삭제된 고객'}</span>
                        {isB2B_o && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-600 text-white font-bold">🏢 B2B</span>}
                        {c?.agedCare && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">🏥</span>}
                      </div>
                      <div className="text-xs text-stone-400">{o.customerId}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {Array.isArray(o.items) && o.items.length > 1 ? (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-[10px] font-medium mb-0.5">
                            <Package size={9} strokeWidth={2.5} />
                            품목 {o.items.length}종
                          </div>
                          {o.items.map((it, i) => (
                            <div key={i} className="text-xs">
                              {it.itemName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        o.itemName
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700 tabular-nums">
                      {Array.isArray(o.items) && o.items.length > 1 ? (
                        <div className="space-y-0.5">
                          {o.items.map((it, i) => (
                            <div key={i} className="text-xs">
                              {it.qty}
                              {isB2B_o && it.perBox > 0 && it.qty >= it.perBox && (
                                <span className="ml-1 text-[9px] text-indigo-700 font-bold">
                                  ({Math.floor(it.qty / it.perBox)}박{(it.qty % it.perBox) > 0 && `+${it.qty % it.perBox}`})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div>{o.qty}</div>
                          {isB2B_o && o.perBox > 0 && o.qty >= o.perBox && (
                            <div className="text-[10px] text-indigo-700 font-bold">
                              {Math.floor(o.qty / o.perBox)}박스
                              {(o.qty % o.perBox) > 0 && `+${o.qty % o.perBox}`}
                            </div>
                          )}
                          {isB2B_o && !o.perBox && o.qty >= 10 && (
                            <div className="text-[10px] text-indigo-700 font-bold">{Math.ceil(o.qty / 10)}박스</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {isServ ? (
                        <div>
                          <div className="font-bold text-amber-700">무료</div>
                          <div className="text-[10px] text-stone-400 line-through">{formatWon(total)}</div>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-stone-800">{formatWon(finalTotal)}</div>
                          {needsShipping && (
                            <div className="text-[10px] text-orange-600 mt-0.5">
                              {formatWon(total)} + 배송료 {formatWon(SHIPPING_FEE)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${shipStatusStyle(o.shipStatus)}`}>{o.shipStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isWaitingStock && (
                          <button
                            onClick={() => handleStockIn(o.id)}
                            className="px-2 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700"
                            title="입고 완료 처리"
                          >
                            📥 입고
                          </button>
                        )}
                        <button onClick={() => setMsgTarget(o)} className="p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700 rounded" title="카톡 메시지">
                          <Send size={14} />
                        </button>
                        <button onClick={() => { setEditTarget(o); setShowForm(true); }} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded" title="수정">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(o.id)} className="p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700 rounded" title="삭제">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-stone-400 text-sm">검색 결과가 없습니다</div>
          )}
          {filtered.length > displayLimit && (
            <div className="px-4 py-4 text-center border-t border-stone-100 bg-stone-50">
              <div className="text-xs text-stone-500 mb-2">
                {displayLimit}건 / {filtered.length}건 표시 중
              </div>
              <button
                onClick={() => setDisplayLimit(displayLimit + 50)}
                className="px-5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-lg text-sm font-medium border border-stone-200"
              >
                다음 50건 더 보기 ↓
              </button>
              <button
                onClick={() => setDisplayLimit(filtered.length)}
                className="ml-2 px-5 py-2 bg-white hover:bg-stone-100 text-stone-600 rounded-lg text-sm font-medium border border-stone-200"
              >
                전체 보기 ({filtered.length}건)
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <OrderFormModal
          customers={customers} items={items}
          editTarget={editTarget}
          gifts={gifts}
          orders={orders}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {msgTarget && (
        <MessageModal
          order={msgTarget}
          customers={customers}
          items={items}
          orders={orders}
          onClose={() => setMsgTarget(null)}
        />
      )}

      {/* 🆕 중복 주문 정리 모달 */}
      {showDupOrders && (
        <DuplicateOrdersModal
          orders={filtered}
          allOrders={orders}
          customers={customers}
          setOrders={setOrders}
          filterLabel={(() => {
            const parts = [];
            if (yearFilter && monthFilter) parts.push(`${yearFilter}년 ${monthFilter}월`);
            else if (yearFilter) parts.push(`${yearFilter}년`);
            else if (monthFilter) parts.push(`${monthFilter}월`);
            if (zoneFilter) parts.push(zoneFilter);
            if (productFilter) parts.push(productFilter);
            return parts.length > 0 ? parts.join(' · ') : '현재 필터 기준';
          })()}
          showToast={showToast}
          onClose={() => setShowDupOrders(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔁 중복 주문 정리 모달
// ═══════════════════════════════════════════════════════════
function DuplicateOrdersModal({ orders, allOrders, customers, setOrders, filterLabel, showToast, onClose }) {
  // 🆕 사용자 직접 기간 설정 (기본: 최근 3개월)
  const getDefaultDates = () => {
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    return {
      from: threeMonthsAgo.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    };
  };
  const defaultDates = getDefaultDates();
  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);
  const [useCustomRange, setUseCustomRange] = useState(false);  // 직접 설정 / 현재 필터

  // 프리셋 날짜 버튼
  const setPreset = (preset) => {
    const today = new Date();
    const fromD = new Date(today);
    switch (preset) {
      case 'week':
        fromD.setDate(today.getDate() - 7);
        break;
      case 'month':
        fromD.setMonth(today.getMonth() - 1);
        break;
      case '3months':
        fromD.setMonth(today.getMonth() - 3);
        break;
      case '6months':
        fromD.setMonth(today.getMonth() - 6);
        break;
      case 'year':
        fromD.setFullYear(today.getFullYear() - 1);
        break;
      case 'all':
        fromD.setFullYear(2000);  // 아주 오래 전
        break;
      default:
        return;
    }
    setFromDate(fromD.toISOString().slice(0, 10));
    setToDate(today.toISOString().slice(0, 10));
    setUseCustomRange(true);
  };

  // 🆕 실제 검색 대상 주문: 직접 기간 설정이면 allOrders에서 필터, 아니면 현재 필터된 orders 사용
  const searchOrders = useMemo(() => {
    if (!useCustomRange) return orders;
    // 날짜 범위로 필터링
    return allOrders.filter(o => {
      if (!o.date) return false;
      return o.date >= fromDate && o.date <= toDate;
    });
  }, [useCustomRange, orders, allOrders, fromDate, toDate]);

  // 고객별 중복 주문 그룹
  const duplicateGroups = useMemo(() => {
    const byCustomer = {};
    searchOrders.forEach(o => {
      if (!o.customerId) return;
      if (!byCustomer[o.customerId]) byCustomer[o.customerId] = [];
      byCustomer[o.customerId].push(o);
    });

    // 2건 이상인 고객만 중복으로 간주
    return Object.entries(byCustomer)
      .filter(([_, ords]) => ords.length > 1)
      .map(([customerId, ords]) => {
        const customer = customers.find(c => c.id === customerId);
        // 최신순 정렬 (날짜+ID)
        const sortedOrders = [...ords].sort((a, b) => {
          if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
          return (b.id || '').localeCompare(a.id || '');
        });
        return {
          customerId,
          customerName: customer?.name || '(삭제된 고객)',
          customerPhone: customer?.phone || '',
          orders: sortedOrders,
          totalAmount: sortedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        };
      })
      .sort((a, b) => b.orders.length - a.orders.length);  // 중복 많은 순
  }, [searchOrders, customers]);

  // 각 주문의 체크 상태: 기본은 "가장 최신 주문만 유지"
  const [keepIds, setKeepIds] = useState(new Set());

  // 🆕 duplicateGroups 변경 시 자동으로 최신만 유지 (기간 바뀔 때마다)
  useEffect(() => {
    const keep = new Set();
    duplicateGroups.forEach(group => {
      if (group.orders[0]) keep.add(group.orders[0].id);
    });
    setKeepIds(keep);
  }, [duplicateGroups]);

  const toggleKeep = (orderId) => {
    setKeepIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // 전체 주문 중 삭제 대상
  const totalOrders = duplicateGroups.reduce((sum, g) => sum + g.orders.length, 0);
  const willKeep = duplicateGroups.reduce((sum, g) =>
    sum + g.orders.filter(o => keepIds.has(o.id)).length, 0
  );
  const willDelete = totalOrders - willKeep;

  const handleConfirmDelete = () => {
    if (willDelete === 0) {
      alert('삭제할 주문이 없습니다');
      return;
    }

    const rangeLabel = useCustomRange
      ? `${fromDate} ~ ${toDate}`
      : filterLabel;

    if (!confirm(
      `⚠️ ${willDelete}건의 주문을 영구 삭제합니다.\n\n` +
      `• 검색 범위: ${rangeLabel}\n` +
      `• 유지: ${willKeep}건\n` +
      `• 삭제: ${willDelete}건\n\n` +
      `복구할 수 없습니다. 계속할까요?`
    )) return;

    // 삭제할 주문 ID 목록
    const deleteIds = new Set();
    duplicateGroups.forEach(g => {
      g.orders.forEach(o => {
        if (!keepIds.has(o.id)) deleteIds.add(o.id);
      });
    });

    // 전체 주문에서 삭제 대상 제거
    const remaining = allOrders.filter(o => !deleteIds.has(o.id));
    setOrders(remaining);

    showToast(`✓ ${willDelete}건 삭제 완료 · ${duplicateGroups.length}명 정리`);
    onClose();
  };

  const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#09090B] tracking-tight">중복 주문 정리</h2>
            <div className="text-[13px] text-[#71717A] mt-0.5">
              같은 고객의 중복 주문을 확인하고 정리합니다
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F4F4F5] rounded-[6px] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 🆕 검색 범위 설정 */}
        <div className="px-6 pt-5 pb-1 space-y-3 shrink-0">
          <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-[10px] p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[12px] font-semibold text-[#52525B]">검색 범위</div>
              {/* 모드 토글 */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setUseCustomRange(false)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                    !useCustomRange ? 'bg-[#09090B] text-white' : 'bg-white text-[#71717A] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
                  }`}
                >
                  현재 필터 ({filterLabel})
                </button>
                <button
                  onClick={() => setUseCustomRange(true)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors ${
                    useCustomRange ? 'bg-[#09090B] text-white' : 'bg-white text-[#71717A] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
                  }`}
                >
                  직접 설정
                </button>
              </div>
            </div>

            {useCustomRange && (
              <>
                {/* 날짜 입력 */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[6px] text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#09090B]/20"
                  />
                  <span className="text-[12px] text-[#71717A]">~</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[6px] text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#09090B]/20"
                  />
                  <div className="text-[11px] text-[#A1A1AA] ml-auto tabular-nums">
                    검색 대상: <span className="font-semibold text-[#52525B]">{searchOrders.length}건</span>
                  </div>
                </div>

                {/* 프리셋 */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'week', label: '최근 7일' },
                    { id: 'month', label: '최근 1개월' },
                    { id: '3months', label: '최근 3개월' },
                    { id: '6months', label: '최근 6개월' },
                    { id: 'year', label: '최근 1년' },
                    { id: 'all', label: '전체 기간' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#71717A] hover:text-[#09090B] rounded-[6px] text-[11px] font-medium transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {!useCustomRange && (
              <div className="text-[11px] text-[#71717A]">
                주문관리에서 적용한 필터 기준으로 검색합니다 (<span className="font-semibold text-[#52525B]">{searchOrders.length}건</span>)
              </div>
            )}
          </div>
        </div>

        {/* 안내 + 통계 */}
        <div className="px-6 pt-2 space-y-3 shrink-0">
          <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[8px] text-[12px] text-[#92400E] leading-relaxed flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>체크한 주문만 유지</strong>되고, 체크 안 한 주문은 영구 삭제됩니다.
              기본값은 <strong>가장 최신 주문만 유지</strong>입니다. 필요에 따라 체크를 조정하세요.
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-[#E4E4E7] rounded-[10px] p-3">
              <div className="text-[11px] font-medium text-[#71717A]">중복 고객</div>
              <div className="text-[22px] font-semibold text-[#09090B] tabular-nums">{duplicateGroups.length}</div>
              <div className="text-[10px] text-[#A1A1AA]">명</div>
            </div>
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] p-3">
              <div className="text-[11px] font-medium text-[#15803D]">유지</div>
              <div className="text-[22px] font-semibold text-[#166534] tabular-nums">{willKeep}</div>
              <div className="text-[10px] text-[#15803D]">건</div>
            </div>
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-3">
              <div className="text-[11px] font-medium text-[#B91C1C]">삭제</div>
              <div className="text-[22px] font-semibold text-[#991B1B] tabular-nums">{willDelete}</div>
              <div className="text-[10px] text-[#B91C1C]">건</div>
            </div>
          </div>
        </div>

        {/* 리스트 */}
        <div className="flex-1 overflow-y-auto scrollbar-slim px-6 py-4">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12">
              <Check size={32} className="mx-auto text-[#22C55E] mb-2" />
              <div className="text-[13px] text-[#52525B]">중복 주문이 없습니다</div>
              <div className="text-[11px] text-[#A1A1AA] mt-1">현재 필터 기준으로 모든 고객이 1건씩만 주문했습니다</div>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicateGroups.map((group, gIdx) => {
                const groupKeep = group.orders.filter(o => keepIds.has(o.id)).length;
                const groupDelete = group.orders.length - groupKeep;
                return (
                  <div key={group.customerId} className="border border-[#E4E4E7] rounded-[10px] overflow-hidden">
                    {/* 고객 헤더 */}
                    <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E4E4E7] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#09090B]">{group.customerName}</span>
                        <span className="text-[11px] text-[#71717A] font-mono">{group.customerId}</span>
                        {group.customerPhone && (
                          <span className="text-[11px] text-[#A1A1AA]">· {group.customerPhone}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#71717A]">
                        총 <span className="font-semibold text-[#09090B] tabular-nums">{group.orders.length}건</span>
                        <span className="mx-1.5 text-[#D4D4D8]">/</span>
                        유지 <span className="font-semibold text-[#166534] tabular-nums">{groupKeep}</span>
                        <span className="mx-1.5 text-[#D4D4D8]">·</span>
                        삭제 <span className="font-semibold text-[#991B1B] tabular-nums">{groupDelete}</span>
                      </div>
                    </div>

                    {/* 주문 리스트 */}
                    <div className="divide-y divide-[#F4F4F5]">
                      {group.orders.map((o, idx) => {
                        const isKept = keepIds.has(o.id);
                        const isLatest = idx === 0;
                        return (
                          <label
                            key={o.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              isKept ? 'bg-white hover:bg-[#F0FDF4]' : 'bg-[#FAFAFA] hover:bg-[#FEF2F2]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isKept}
                              onChange={() => toggleKeep(o.id)}
                              className="w-4 h-4 rounded accent-[#09090B] cursor-pointer"
                            />
                            <span className="font-mono text-[12px] font-semibold text-[#09090B] w-20 tabular-nums">{o.id}</span>
                            <span className="text-[12px] text-[#52525B] w-16 tabular-nums">{formatDate(o.date)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-14 text-center flex-shrink-0 ${
                              o.shipStatus === '배송완료' ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]' :
                              o.shipStatus === '배송중' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]' :
                              o.shipStatus === '취소' ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' :
                              o.shipStatus === '서비스' ? 'bg-[#FDF4FF] text-[#9333EA] border border-[#E9D5FF]' :
                              'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                            }`}>
                              {o.shipStatus || '준비중'}
                            </span>
                            <span className="flex-1 text-[12px] text-[#52525B] truncate">
                              {o.itemName || '-'} × {o.qty || 0}
                            </span>
                            <span className="text-[12px] font-semibold text-[#09090B] tabular-nums w-20 text-right">
                              ${(o.total || 0).toLocaleString()}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#09090B] text-white font-semibold w-10 text-center">최신</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#E4E4E7] flex items-center justify-between shrink-0">
          <div className="text-[12px] text-[#71717A]">
            💡 {useCustomRange ? `${fromDate} ~ ${toDate}` : filterLabel} 기준 중복만 표시
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] rounded-[8px] text-[13px] font-medium transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={willDelete === 0}
              className="px-4 py-2 bg-[#09090B] hover:bg-black disabled:bg-[#D4D4D8] disabled:cursor-not-allowed text-white rounded-[8px] text-[13px] font-medium transition-colors"
            >
              체크한 것만 유지 · {willDelete}건 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderFormModal({ customers, items, editTarget, gifts = [], orders = [], onSave, onClose }) {
  const [date, setDate] = useState(editTarget?.date || new Date().toISOString().slice(0,10));
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState(editTarget?.customerId || '');

  // 🆕 다품목 지원: orderItems 배열로 관리
  // 각 아이템: { itemName, qty, perBox }
  const [orderItems, setOrderItems] = useState(() => {
    if (editTarget) {
      // items 배열이 있으면 그대로 사용 (다품목 주문)
      if (Array.isArray(editTarget.items) && editTarget.items.length > 0) {
        return editTarget.items.map(it => ({
          itemName: it.itemName || '',
          qty: it.qty || 1,
          perBox: it.perBox || 10,
        }));
      }
      // 단일 품목 주문
      return [{
        itemName: editTarget.itemName || '',
        qty: editTarget.qty || 1,
        perBox: editTarget.perBox || 10,
      }];
    }
    return [{ itemName: '', qty: 1, perBox: 10 }];
  });

  // 🧠 품목별 최근 사용한 박스당 수량 기억 (localStorage + Supabase 동기화)
  // 키 구조: { "C0023:배추김치 4KG": 5, "default:총각김치 2KG": 3, ... }
  const PER_BOX_KEY = 'wh:perBoxMemory';

  const recallPerBox = (itemName, customerId) => {
    try {
      const key = `${customerId || 'default'}:${itemName}`;
      const stored = localStorage.getItem(PER_BOX_KEY);
      if (stored) {
        const memory = JSON.parse(stored);
        if (memory[key]) return parseInt(memory[key]);
      }
      // 🔄 구버전 키도 fallback (기존 데이터 호환)
      const oldKey = `wh:perBox:${customerId || 'default'}:${itemName}`;
      const oldStored = localStorage.getItem(oldKey);
      return oldStored ? parseInt(oldStored) : null;
    } catch { return null; }
  };

  const rememberPerBox = (itemName, customerId, perBox) => {
    try {
      const key = `${customerId || 'default'}:${itemName}`;
      const stored = localStorage.getItem(PER_BOX_KEY);
      const memory = stored ? JSON.parse(stored) : {};
      memory[key] = perBox;
      // 메모리 크기 제한 (1000개 이상이면 오래된 것 제거)
      const keys = Object.keys(memory);
      if (keys.length > 1000) {
        const toKeep = keys.slice(-800);  // 최근 800개만 유지
        const trimmed = {};
        toKeep.forEach(k => { trimmed[k] = memory[k]; });
        localStorage.setItem(PER_BOX_KEY, JSON.stringify(trimmed));
        // Supabase 동기화
        if (typeof setSetting === 'function') {
          setSetting('per_box_memory', trimmed, '품목별 박스당 수량 기억').catch(() => {});
        }
      } else {
        localStorage.setItem(PER_BOX_KEY, JSON.stringify(memory));
        // Supabase 동기화 (디바운스 효과를 위해 약간 지연)
        if (typeof setSetting === 'function') {
          setSetting('per_box_memory', memory, '품목별 박스당 수량 기억').catch(() => {});
        }
      }
    } catch {}
  };

  const [isService, setIsService] = useState(editTarget?.isService || false);
  const [isPickup, setIsPickup] = useState(editTarget?.isPickup || false);
  // 🏢 B2B / 선주문 관련
  const [isPreOrder, setIsPreOrder] = useState(editTarget?.shipStatus === '입고대기' || false);
  const [expectedStockDate, setExpectedStockDate] = useState(editTarget?.expectedStockDate || '');
  const [splitDeliveries, setSplitDeliveries] = useState(editTarget?.splitDeliveries || []);
  const [showSplitUI, setShowSplitUI] = useState(!!editTarget?.splitDeliveries?.length);
  // 🎁 사은품 관련
  const activeGift = getActiveGift(gifts);
  const [giftQty, setGiftQty] = useState(
    editTarget?.giftQty !== undefined ? editTarget.giftQty : null
  );
  // 💰 결제 관련 (배송 전 선결제) - 단순 체크만
  // paymentStatus: 'unpaid' | 'paid'
  // paymentMethod: null | 'transfer' | 'cash'
  const [paymentStatus, setPaymentStatus] = useState(editTarget?.paymentStatus || 'unpaid');
  const [paymentMethod, setPaymentMethod] = useState(editTarget?.paymentMethod || null);

  // 🔍 고객 검색 - debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(customerSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const matchedCustomers = useMemo(() => {
    if (!debouncedSearch) return customers.slice(0, 8);
    if (debouncedSearch.length < 2) return [];
    const s = debouncedSearch.toLowerCase();
    const results = [];
    for (let i = 0; i < customers.length && results.length < 20; i++) {
      const c = customers[i];
      if (!c.name && !c.id && !c.phone) continue;
      if (
        (c.name && c.name.toLowerCase().includes(s)) ||
        (c.id && c.id.toLowerCase().includes(s)) ||
        (c.phone && c.phone.includes(s))
      ) {
        results.push(c);
      }
    }
    return results.slice(0, 8);
  }, [debouncedSearch, customers]);

  const selectedCustomer = customers.find(c => c.id === customerId);
  const isB2B = !!selectedCustomer?.isB2B;
  const discountRate = selectedCustomer?.b2bDiscount || 0;

  // 🚀 성능 최적화: items를 Map으로 캐싱 (find 반복 방지)
  const itemMap = useMemo(() => {
    const map = new Map();
    items.forEach(i => { map.set(i.name, i); });
    return map;
  }, [items]);

  // 품목 추가/제거/수정
  const addOrderItem = () => {
    setOrderItems([...orderItems, { itemName: '', qty: 1, perBox: 10 }]);
  };
  const removeOrderItem = (idx) => {
    if (orderItems.length <= 1) return; // 최소 1개 유지
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };
  const updateOrderItem = (idx, key, value) => {
    const next = [...orderItems];
    next[idx] = { ...next[idx], [key]: value };

    // 🧠 품목 변경 시 해당 품목의 마지막 박스당 수량 복원
    if (key === 'itemName' && value) {
      const remembered = recallPerBox(value, customerId);
      if (remembered) {
        next[idx].perBox = remembered;
      }
    }
    // 박스당 수량 변경 시 기억
    if (key === 'perBox' && next[idx].itemName) {
      rememberPerBox(next[idx].itemName, customerId, value);
    }

    setOrderItems(next);
  };

  // 각 품목별 계산 (itemMap 사용으로 O(1))
  const orderItemsWithCalc = useMemo(() => {
    return orderItems.map(oi => {
      const item = itemMap.get(oi.itemName);
      const basePrice = item?.price || 0;
      const unitPrice = item ? getEffectivePrice(item, selectedCustomer) : 0;
      const qty = Number(oi.qty) || 0;
      const perBox = Number(oi.perBox) || 1;
      const itemTotal = unitPrice * qty;
      const itemSaved = (basePrice - unitPrice) * qty;
      const boxCountFloor = perBox > 0 ? Math.floor(qty / perBox) : 0;
      const remainder = perBox > 0 ? qty % perBox : qty;
      return {
        ...oi,
        item,
        basePrice,
        unitPrice,
        qty,
        perBox,
        boxCountFloor,
        boxCountCeil: boxCountFloor + (remainder > 0 ? 1 : 0),
        isExactBox: remainder === 0 && qty > 0,
        remainder,
        itemTotal,
        itemSaved,
      };
    });
  }, [orderItems, itemMap, selectedCustomer]);

  // 전체 합계
  const { grandTotal, totalSaved, totalQty } = useMemo(() => {
    let gt = 0, ts = 0, tq = 0;
    orderItemsWithCalc.forEach(oi => {
      gt += oi.itemTotal;
      ts += oi.itemSaved;
      tq += oi.qty;
    });
    return { grandTotal: gt, totalSaved: ts, totalQty: tq };
  }, [orderItemsWithCalc]);

  // 박스 주문 여부
  const hasBulkOrder = isB2B && orderItemsWithCalc.some(oi => oi.qty >= oi.perBox && oi.perBox > 1);

  // 분할 배송 유효성
  const splitTotal = splitDeliveries.reduce((s, d) => s + (Number(d.qty) || 0), 0);
  const splitValid = !showSplitUI || splitTotal === totalQty;

  const hasValidItem = orderItemsWithCalc.some(oi => oi.itemName && oi.qty > 0);
  const canSubmit = customerId && hasValidItem && splitValid &&
    (!isPreOrder || !!expectedStockDate);

  // 🎁 사은품 자동 계산 - 고객ID 바뀔 때만 계산 (orderItems는 별도)
  const customerOtherOrdersTotal = useMemo(() => {
    if (!customerId) return 0;
    const editId = editTarget?.id;
    let total = 0;
    for (const o of orders) {
      if (o.customerId !== customerId) continue;
      if (o.isService || o.shipStatus === '취소') continue;
      if (editId && o.id === editId) continue;
      const it = itemMap.get(o.itemName);
      total += (it?.price || 0) * o.qty;
    }
    return total;
  }, [customerId, orders, itemMap, editTarget]);

  const currentOrderTotal = isService ? 0 : grandTotal;
  const totalForGift = customerOtherOrdersTotal + currentOrderTotal;
  const autoGiftQty = activeGift ? calcGiftQtyByAmount(totalForGift, activeGift.tiers) : 0;
  const effectiveGiftQty = giftQty === null ? autoGiftQty : giftQty;

  // 분할 배송
  const addSplit = () => setSplitDeliveries([...splitDeliveries, { date: '', qty: 0 }]);
  const removeSplit = (idx) => setSplitDeliveries(splitDeliveries.filter((_, i) => i !== idx));
  const updateSplit = (idx, key, value) => {
    const next = [...splitDeliveries];
    next[idx] = { ...next[idx], [key]: value };
    setSplitDeliveries(next);
  };

  const handleSave = () => {
    if (!canSubmit) return;
    const validItems = orderItemsWithCalc.filter(oi => oi.itemName && oi.qty > 0);

    // 🆕 하나의 주문 = 여러 품목 (items 배열)
    // items: [{ itemName, qty, perBox }]
    const orderItemsArr = validItems.map(oi => ({
      itemName: oi.itemName,
      qty: oi.qty,
      perBox: oi.perBox,
    }));

    // 대표 품목 (첫 번째 품목을 itemName으로 유지 - 호환성)
    const firstItem = orderItemsArr[0];

    const data = {
      date,
      customerId,
      // 호환성: 단일 품목은 기존 필드 유지
      itemName: firstItem.itemName,
      qty: firstItem.qty,
      perBox: firstItem.perBox,
      // 🆕 다품목 배열 (2개 이상일 때만 저장)
      items: orderItemsArr.length > 1 ? orderItemsArr : null,
      isService,
      isPickup,
    };

    if (isPreOrder) {
      data.shipStatus = '입고대기';
      data.expectedStockDate = expectedStockDate;
    }
    if (showSplitUI && splitDeliveries.length > 0) {
      data.splitDeliveries = splitDeliveries;
    }
    // 🎁 사은품
    if (activeGift && effectiveGiftQty > 0) {
      data.giftId = activeGift.id;
      data.giftName = activeGift.name;
      data.giftQty = effectiveGiftQty;
    } else if (giftQty !== null) {
      data.giftQty = 0;
    }

    // 💰 결제 정보 (배송 전 선결제) - 단순 체크
    data.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid') {
      data.paymentMethod = paymentMethod || 'transfer';  // 기본: 계좌이체
    } else {
      // 미결제: 결제 정보 초기화
      data.paymentMethod = null;
    }

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose} style={{ fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif" }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

        {/* 헤더 - 미니멀 */}
        <div className="px-6 pt-5 pb-4 border-b border-stone-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              {editTarget ? '주문 수정' : '새 주문'}
            </h2>
            {isB2B && <span className="text-[10px] px-2 py-0.5 bg-stone-900 text-white rounded-full font-semibold">B2B</span>}
            {orderItems.length > 1 && <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full font-semibold">{orderItems.length}개 품목</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={!canSubmit}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all disabled:bg-stone-200 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              저장
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl text-stone-500"><X size={18} /></button>
          </div>
        </div>

        {/* 본문 - 스크롤 */}
        <div className="flex-1 overflow-y-auto scrollbar-slim px-6 py-5 space-y-5">

          {/* 📅 주문일 + 👤 고객조회 (한 줄) */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">주문일</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-stone-300 transition-all tabular-nums" />
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
                고객
                {selectedCustomer && (
                  <span className="ml-1.5 text-stone-900 font-bold">{selectedCustomer.name}</span>
                )}
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder={selectedCustomer ? '다른 고객 찾기...' : '이름·ID·전화번호 (2글자↑)'}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-stone-300 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 👥 검색 결과 (검색어 있을 때만) */}
          {(customerSearch || !selectedCustomer) && (
            <div className="max-h-56 overflow-y-auto border border-stone-100 rounded-2xl scrollbar-slim bg-white">
              {matchedCustomers.length > 0 ? matchedCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCustomerId(c.id); setCustomerSearch(''); }}
                  className={`w-full text-left px-4 py-3 border-b border-stone-50 last:border-0 transition-colors ${customerId === c.id ? 'bg-stone-50' : 'hover:bg-stone-50/50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-stone-900 truncate">{c.name}</span>
                      {c.isB2B && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-900 text-white font-bold shrink-0">B2B</span>}
                      {c.isB2B && c.b2bDiscount > 0 && <span className="text-[9px] text-stone-500 shrink-0">-{c.b2bDiscount}%</span>}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono tabular-nums shrink-0">{c.id}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 truncate">{c.phone}{c.address ? ` · ${c.address}` : ''}</div>
                </button>
              )) : (
                <div className="text-center py-6 text-xs text-stone-400">
                  {debouncedSearch && debouncedSearch.length < 2 ? '2글자 이상 입력해주세요' : '검색 결과가 없습니다'}
                </div>
              )}
            </div>
          )}

          {/* 🏢 B2B 정보 (간결하게) */}
          {isB2B && selectedCustomer && (
            <div className="flex items-center gap-5 px-4 py-3 bg-stone-50 rounded-2xl text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-400">담당</span>
                <span className="font-semibold text-stone-800">{selectedCustomer.b2bContact || '-'}</span>
              </div>
              <div className="h-3 w-px bg-stone-200"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-400">할인</span>
                <span className="font-semibold text-stone-800 tabular-nums">{discountRate}%</span>
              </div>
              <div className="h-3 w-px bg-stone-200"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-400">결제</span>
                <span className="font-semibold text-stone-800">{selectedCustomer.b2bPaymentTerms || '즉시'}</span>
              </div>
              <div className="ml-auto">
                <span className="text-stone-400">미수금 </span>
                <span className="font-bold text-red-700 tabular-nums">${formatNum(calcB2BReceivable(selectedCustomer.id, [], items))}</span>
              </div>
            </div>
          )}

          {/* 📦 주문 품목 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[11px] font-semibold text-stone-500">주문 품목</h3>
              <button
                type="button"
                onClick={addOrderItem}
                className="flex items-center gap-1 px-2.5 py-1 text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-semibold active:scale-95 transition-all"
              >
                <Plus size={13} />
                품목 추가
              </button>
            </div>

            <div className="space-y-2">
              {orderItemsWithCalc.map((oi, idx) => (
                <div key={idx} className="group relative bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-stone-300 transition-colors">
                  {/* 상단 바 - 품목번호 + 삭제 */}
                  {orderItems.length > 1 && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50 border-b border-stone-100">
                      <span className="text-[10px] font-bold text-stone-500">품목 {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeOrderItem(idx)}
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="품목 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  <div className="p-3 grid grid-cols-12 gap-2 items-end">
                    {/* 품목 */}
                    <div className={isB2B ? 'col-span-6' : 'col-span-8'}>
                      <label className="block text-[10px] font-semibold text-stone-500 mb-1">품목</label>
                      <select
                        value={oi.itemName}
                        onChange={e => updateOrderItem(idx, 'itemName', e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-stone-300 transition-all cursor-pointer"
                      >
                        <option value="">선택하세요</option>
                        {items.map(i => (
                          <option key={i.code} value={i.name} disabled={i.availStock <= 0 && !isB2B}>
                            {i.name} · ${i.price} {i.availStock <= 0 ? '(품절)' : i.availStock <= 20 ? `(재고 ${i.availStock})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 수량 */}
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-1">수량</label>
                      <input
                        type="number"
                        min="1"
                        value={oi.qty}
                        onChange={e => updateOrderItem(idx, 'qty', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 bg-stone-50 border border-transparent rounded-lg text-sm text-right tabular-nums font-semibold focus:outline-none focus:bg-white focus:border-stone-300 transition-all"
                      />
                    </div>

                    {/* 박스당 (B2B만) - 직접 입력으로 변경! */}
                    {isB2B && (
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-stone-500 mb-1">박스당</label>
                        <input
                          type="number"
                          min="1"
                          value={oi.perBox}
                          onChange={e => updateOrderItem(idx, 'perBox', parseInt(e.target.value) || 1)}
                          placeholder="개수"
                          className="w-full px-2 py-2 bg-stone-50 border border-transparent rounded-lg text-sm text-right tabular-nums font-semibold focus:outline-none focus:bg-white focus:border-stone-300 transition-all"
                        />
                      </div>
                    )}

                    {/* 소계 */}
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-1">소계</label>
                      <div className="h-[36px] flex items-center justify-end">
                        <span className="text-sm font-bold text-stone-900 tabular-nums">
                          ${formatNum(oi.itemTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 📦 박스 정보 (간결하게) */}
                  {isB2B && oi.qty >= oi.perBox && oi.itemName && oi.perBox > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-stone-50/60 border-t border-stone-100">
                      <div className="text-[11px] text-stone-600">
                        <span className="font-bold text-stone-900 tabular-nums">{oi.boxCountFloor}박스</span>
                        {oi.remainder > 0 && <span className="text-stone-500"> + {oi.remainder}개</span>}
                        <span className="text-stone-400 ml-2">({oi.perBox}개 × {oi.boxCountFloor}박스{oi.remainder > 0 ? ` + 낱개 ${oi.remainder}` : ''})</span>
                      </div>
                      {!oi.isExactBox && oi.remainder > 0 && (
                        <button
                          type="button"
                          onClick={() => updateOrderItem(idx, 'qty', oi.boxCountCeil * oi.perBox)}
                          className="text-[10px] font-semibold text-stone-700 hover:bg-stone-200 px-2 py-1 rounded-md transition-colors"
                        >
                          {oi.boxCountCeil}박스로 올림
                        </button>
                      )}
                    </div>
                  )}

                  {/* 재고 부족 경고 */}
                  {oi.item && oi.qty > oi.item.availStock && !isB2B && (
                    <div className="px-3 py-1.5 bg-orange-50 border-t border-orange-100 text-[11px] text-orange-800">
                      재고 부족: 가용재고 {oi.item.availStock}개
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 📋 합계 요약 */}
          <div className={`p-4 rounded-2xl ${isService ? 'bg-amber-50/50' : isPickup ? 'bg-sky-50/50' : 'bg-stone-900 text-white'}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-80">
                {isService ? '🎁 서비스 (무료)' : isPickup ? '📍 픽업 (배송료 없음)' : ''}
                {!isService && !isPickup && (
                  <span>품목 {orderItems.filter(o => o.itemName).length}개 · 수량 {totalQty}개</span>
                )}
              </div>
              <span className={`text-2xl font-bold tabular-nums ${isService ? 'text-amber-700 line-through' : ''}`}>
                ${formatNum(grandTotal)}
              </span>
            </div>
            {isB2B && totalSaved > 0 && !isService && (
              <div className="text-[11px] opacity-70 text-right mt-1">
                💰 절약: ${formatNum(totalSaved)}
              </div>
            )}
          </div>

          {/* 🎯 옵션들 - 한 줄 토글 */}
          <div className="space-y-2">
            {/* 서비스 + 픽업 토글 */}
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${isService ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                <input
                  type="checkbox"
                  checked={isService}
                  onChange={e => setIsService(e.target.checked)}
                  className="w-4 h-4 accent-stone-900"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-stone-900">🎁 서비스 주문</div>
                  <div className="text-[10px] text-stone-500">무료 · 매출 제외</div>
                </div>
              </label>
              <label className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border transition-all ${isPickup ? 'bg-sky-50 border-sky-200' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                <input
                  type="checkbox"
                  checked={isPickup}
                  onChange={e => setIsPickup(e.target.checked)}
                  className="w-4 h-4 accent-stone-900"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-stone-900">📍 픽업 주문</div>
                  <div className="text-[10px] text-stone-500">배송료 면제</div>
                </div>
              </label>
            </div>

            {/* 💰 선결제 (배송 전 결제) */}
            {!isService && (
              <div className={`rounded-xl border transition-all ${
                paymentStatus === 'paid'
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-white border-stone-200'
              }`}>
                <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentStatus === 'paid'}
                    onChange={e => {
                      const checked = e.target.checked;
                      setPaymentStatus(checked ? 'paid' : 'unpaid');
                      // 체크 시 기본값: 계좌이체
                      if (checked && !paymentMethod) {
                        setPaymentMethod('transfer');
                      }
                    }}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                      💰 배송 전 선결제 완료
                      {paymentStatus === 'paid' && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-700 text-white rounded font-bold">PAID</span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {paymentStatus === 'paid'
                        ? '✓ 기사 화면에 "이미 결제됨"으로 표시됩니다'
                        : '계좌이체/현금으로 미리 받은 경우 체크'}
                    </div>
                  </div>
                </label>

                {/* 선결제 체크 시 결제 수단 선택만 */}
                {paymentStatus === 'paid' && (
                  <div className="px-3 pb-3 pt-1 border-t border-emerald-200/60">
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1.5 mt-2">결제 수단</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          paymentMethod === 'transfer'
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        🏦 계좌이체
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          paymentMethod === 'cash'
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        💵 현금
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🏢 B2B: 선주문 토글 */}
            {isB2B && (
              <div className={`rounded-xl border transition-all ${isPreOrder ? 'bg-white border-stone-300' : 'bg-white border-stone-200'}`}>
                <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPreOrder}
                    onChange={e => setIsPreOrder(e.target.checked)}
                    className="w-4 h-4 accent-stone-900"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-stone-900">⏳ 선주문 (입고 대기)</div>
                    <div className="text-[10px] text-stone-500">재고 입고 후 자동 배송 준비</div>
                  </div>
                </label>
                {isPreOrder && (
                  <div className="px-3 pb-3 pt-1 border-t border-stone-100 flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 shrink-0">예상 입고일</span>
                    <input
                      type="date"
                      value={expectedStockDate}
                      onChange={e => setExpectedStockDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="flex-1 px-2.5 py-1.5 bg-stone-50 border border-transparent rounded-lg text-xs focus:outline-none focus:bg-white focus:border-stone-300"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 🏢 B2B: 분할 배송 */}
            {isB2B && totalQty >= 5 && (
              <div className={`rounded-xl border transition-all ${showSplitUI ? 'bg-white border-stone-300' : 'bg-white border-stone-200'}`}>
                <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSplitUI}
                    onChange={e => {
                      setShowSplitUI(e.target.checked);
                      if (e.target.checked && splitDeliveries.length === 0) {
                        setSplitDeliveries([{ date: '', qty: Math.ceil(totalQty / 2) }, { date: '', qty: Math.floor(totalQty / 2) }]);
                      }
                    }}
                    className="w-4 h-4 accent-stone-900"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-stone-900">📦 분할 배송</div>
                    <div className="text-[10px] text-stone-500">여러 날에 나눠서 배송</div>
                  </div>
                </label>

                {showSplitUI && (
                  <div className="px-3 pb-3 pt-1 border-t border-stone-100 space-y-1.5">
                    {splitDeliveries.map((split, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-stone-500 w-6">{idx + 1}회</span>
                        <input
                          type="date"
                          value={split.date}
                          onChange={e => updateSplit(idx, 'date', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-stone-50 border border-transparent rounded-lg text-xs focus:outline-none focus:bg-white focus:border-stone-300"
                        />
                        <input
                          type="number"
                          min="1"
                          max={totalQty}
                          value={split.qty}
                          onChange={e => updateSplit(idx, 'qty', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1.5 bg-stone-50 border border-transparent rounded-lg text-xs text-right tabular-nums focus:outline-none focus:bg-white focus:border-stone-300"
                        />
                        <span className="text-[10px] text-stone-400">개</span>
                        <button
                          onClick={() => removeSplit(idx)}
                          className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={addSplit}
                        className="text-[11px] text-stone-600 hover:text-stone-900 font-semibold"
                      >
                        + 추가
                      </button>
                      <div className={`text-[10px] font-semibold ${splitTotal === totalQty ? 'text-emerald-700' : 'text-red-600'}`}>
                        {splitTotal} / {totalQty}개 {splitTotal === totalQty ? '✓' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🎁 사은품 섹션 - 미니멀 */}
          {activeGift && !isService && customerId && (
            <div className={`rounded-2xl border transition-all overflow-hidden ${
              effectiveGiftQty > 0
                ? 'bg-rose-50/50 border-rose-200'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎁</span>
                  <div>
                    <div className="text-xs font-semibold text-stone-900">{activeGift.name}</div>
                    <div className="text-[10px] text-stone-500">
                      총 주문액 ${formatNum(totalForGift)} · 자동 {autoGiftQty}개
                      {activeGift.remaining !== undefined && ` · 재고 ${activeGift.remaining}개`}
                    </div>
                  </div>
                </div>
                {giftQty !== null && (
                  <button
                    type="button"
                    onClick={() => setGiftQty(null)}
                    className="text-[10px] text-stone-500 hover:text-stone-900 font-medium"
                  >
                    자동 복원
                  </button>
                )}
              </div>
              <div className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-[11px] text-stone-500 flex-shrink-0">지급</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGiftQty(Math.max(0, effectiveGiftQty - 1))}
                    className="w-7 h-7 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg font-semibold text-stone-700"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={effectiveGiftQty}
                    onChange={e => setGiftQty(Number(e.target.value) || 0)}
                    className="w-12 h-7 text-center bg-white border border-stone-200 rounded-lg font-bold tabular-nums text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setGiftQty(effectiveGiftQty + 1)}
                    className="w-7 h-7 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg font-semibold text-stone-700"
                  >
                    +
                  </button>
                </div>
                <span className="text-[11px] text-stone-500">개</span>
                {giftQty !== null && giftQty !== autoGiftQty && (
                  <span className="ml-auto text-[10px] text-amber-700 font-semibold">수동 조정</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 바 - 미니멀 */}
        <div className="px-6 py-3 border-t border-stone-100 flex items-center justify-end gap-2 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">취소</button>
          <button
            onClick={handleSave}
            disabled={!canSubmit}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
          >
            {editTarget ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ order, customers, items, orders, onClose }) {
  const c = customers.find(x => x.id === order.customerId);
  const it = items.find(i => i.name === order.itemName);
  const total = (it?.price || 0) * order.qty;
  // 고객의 총 주문액 계산 (배송료 판단용)
  const priceMap = {};
  items.forEach(i => { priceMap[i.name] = i.price || 0; });
  const customerTotal = orders
    .filter(o => o.customerId === order.customerId)
    .reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);
  // 픽업 주문이면 배송료 없음
  const needsShipping = !order.isPickup && customerTotal < SHIPPING_THRESHOLD;
  const shippingLine = needsShipping ? ` (배송료 $${SHIPPING_FEE} 포함)` : order.isPickup ? ' (📍 픽업)' : '';
  const finalTotal = total + (needsShipping ? SHIPPING_FEE : 0);
  const [copied, setCopied] = useState(false);

  // 🎁 사은품 메시지 구문
  const giftLine = (order.giftQty > 0 && order.giftName)
    ? `\n🎁 사은품: ${order.giftName} ${order.giftQty}개`
    : '';

  const orderMsg = `[워커힐호텔김치 주문 안내] ${c?.name}고객님, ${koDate(order.date)}에 ${order.itemName} ${order.qty}개 주문해주셨습니다. 총 $${formatNum(finalTotal)}${shippingLine} 입니다.${giftLine ? ' ' + giftLine.replace(/\n/g, ' ') : ''} 감사합니다~♥`;
  const confirmMsg = `[워커힐호텔김치 배송 전 확인] ${c?.name}고객님, 곧 배송 예정인 주문 내역을 확인 부탁드립니다.\n- 품목: ${order.itemName}\n- 수량: ${order.qty}개\n- 금액: $${formatNum(finalTotal)}${shippingLine}${giftLine}\n- 배송지: ${c?.address}\n내역이 맞으시면 "확인" 답장 부탁드려요~♥`;
  const shipMsg = (order.shipStatus === '배송완료' || order.shipStatus === '배송중') ? `[워커힐호텔김치 배송 안내] ${c?.name}고객님, 주문하신 ${order.itemName} x${order.qty}${giftLine ? ` + ${order.giftName} ${order.giftQty}개(사은품)` : ''}이(가) ${order.shipDate ? order.shipDate + ' 출고되었습니다. ' : '배송 중입니다. '}${order.deliveryMethod ? '(' + order.deliveryMethod + ') ' : ''}감사합니다~♥` : null;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif-ko text-xl font-bold text-stone-800">카톡 메시지</h2>
            <div className="text-xs text-stone-500 mt-0.5">{c?.name}고객님 · {order.id}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <MsgBlock title="① 주문 안내" msg={orderMsg} onCopy={copy} copied={copied} />
          <MsgBlock title="② 배송 전 확인" msg={confirmMsg} onCopy={copy} copied={copied} />
          {shipMsg && <MsgBlock title="③ 배송 안내" msg={shipMsg} onCopy={copy} copied={copied} />}
        </div>
      </div>
    </div>
  );
}

function MsgBlock({ title, msg, onCopy, copied }) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700">{title}</span>
        <button
          onClick={() => onCopy(msg)}
          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded text-xs font-medium hover:bg-stone-100"
        >
          {copied === msg ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
        </button>
      </div>
      <div className="p-4 text-sm text-stone-800 whitespace-pre-wrap leading-relaxed bg-yellow-50/50 font-sans-ko">
        {msg}
      </div>
    </div>
  );
}

function Customers({ customers, setCustomers, items, orders, showToast, setOrders }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [agedCareFilter, setAgedCareFilter] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all'); // 'all' | 'b2c' | 'b2b'
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [showDuplicates, setShowDuplicates] = useState(false);  // 🆕 중복 찾기 모달

  // 🆕 체크박스
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (visibleIds) => {
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDeleteCustomers = () => {
    if (selectedIds.size === 0) return;
    const hasOrders = [...selectedIds].some(cid => orders.some(o => o.customerId === cid));
    if (hasOrders) {
      if (!confirm(`⚠️ 주문 내역이 있는 고객이 포함되어 있습니다.\n선택한 ${selectedIds.size}명을 정말 삭제할까요?\n(주문은 유지되지만 고객 정보는 "삭제된 고객"으로 표시됩니다)`)) return;
    } else {
      if (!confirm(`선택한 ${selectedIds.size}명의 고객을 삭제할까요?`)) return;
    }
    setCustomers(customers.filter(c => !selectedIds.has(c.id)));
    showToast(`✅ ${selectedIds.size}명 삭제 완료`);
    clearSelection();
  };

  const handleBulkGrade = (grade) => {
    if (selectedIds.size === 0) return;
    setCustomers(customers.map(c => selectedIds.has(c.id) ? { ...c, grade } : c));
    showToast(`✅ ${selectedIds.size}명 등급 → ${grade}`);
    clearSelection();
  };

  const handleBulkAgedCare = (agedCare) => {
    if (selectedIds.size === 0) return;
    setCustomers(customers.map(c => selectedIds.has(c.id) ? { ...c, agedCare } : c));
    showToast(`✅ ${selectedIds.size}명 Aged Care ${agedCare ? '설정' : '해제'}`);
    clearSelection();
  };

  // 🔍 검색 debounce 300ms (4000명+ 대용량 대응)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // 성능 최적화: 고객ID → 주문 배열 + 자동등급 미리 계산 (서비스 제외)
  // 🆕 B2B 거래처는 등급 자동 업그레이드 대상 아님 (항상 '일반')
  const ordersByCustomer = useMemo(() => {
    const map = {};
    const priceMap = {};
    items.forEach(i => { priceMap[i.name] = i.price || 0; });
    const b2bSet = new Set(customers.filter(c => c.isB2B).map(c => c.id));

    orders.forEach(o => {
      if (!map[o.customerId]) {
        map[o.customerId] = { orders: [], count: 0, totalSpent: 0, serviceCount: 0, summary: '', autoGrade: '일반' };
      }
      map[o.customerId].orders.push(o);
      map[o.customerId].count += 1;
      if (o.isService) {
        map[o.customerId].serviceCount += 1;
      } else {
        map[o.customerId].totalSpent += (priceMap[o.itemName] || 0) * o.qty;
      }
    });
    Object.keys(map).forEach(cid => {
      map[cid].summary = map[cid].orders.map(o => `${o.itemName}×${o.qty}${o.isService ? '🎁' : ''}`).join(', ');
      // 🆕 B2B 거래처는 자동 등급 계산 제외
      if (b2bSet.has(cid)) {
        map[cid].autoGrade = '일반';
      } else {
        const total = map[cid].totalSpent;
        if (total >= GRADE_VIP_THRESHOLD) map[cid].autoGrade = 'VIP';
        else if (total >= GRADE_PREMIUM_THRESHOLD) map[cid].autoGrade = '우수';
        else map[cid].autoGrade = '일반';
      }
    });
    return map;
  }, [orders, items, customers]);

  const filtered = useMemo(() => {
    let result = [...customers];
    if (customerTypeFilter === 'b2b') result = result.filter(c => c.isB2B);
    else if (customerTypeFilter === 'b2c') result = result.filter(c => !c.isB2B);
    if (agedCareFilter) result = result.filter(c => c.agedCare);
    if (gradeFilter) {
      result = result.filter(c => {
        const autoGrade = ordersByCustomer[c.id]?.autoGrade || '일반';
        return autoGrade === gradeFilter;
      });
    }
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        (c.phone || '').includes(s) ||
        (c.address || '').toLowerCase().includes(s)
      );
    }
    // 정렬
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let av, bv;
      if (sortKey === 'id') { av = a.id; bv = b.id; }
      else if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sortKey === 'phone') { av = a.phone || ''; bv = b.phone || ''; }
      else if (sortKey === 'grade') {
        const gOrder = { 'VIP': 3, '우수': 2, '일반': 1 };
        av = gOrder[ordersByCustomer[a.id]?.autoGrade || '일반'] || 0;
        bv = gOrder[ordersByCustomer[b.id]?.autoGrade || '일반'] || 0;
      }
      else if (sortKey === 'orderCount') {
        av = ordersByCustomer[a.id]?.count || 0;
        bv = ordersByCustomer[b.id]?.count || 0;
      }
      else if (sortKey === 'totalSpent') {
        av = ordersByCustomer[a.id]?.totalSpent || 0;
        bv = ordersByCustomer[b.id]?.totalSpent || 0;
      }
      else { av = a.id; bv = b.id; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return result;
  }, [customers, search, gradeFilter, agedCareFilter, ordersByCustomer, sortKey, sortDir]);

  // 검색/필터 변경 시 표시 개수 리셋
  useEffect(() => { setDisplayLimit(50); }, [search, gradeFilter, agedCareFilter]);

  const nextId = () => {
    const nums = customers.map(c => parseInt(c.id.replace('C',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'C' + String(max + 1).padStart(4, '0');
  };

  const handleSave = (cust) => {
    if (editTarget) {
      setCustomers(customers.map(c => c.id === editTarget.id ? { ...cust, id: editTarget.id } : c));
      showToast('고객 정보가 수정되었습니다');
    } else {
      setCustomers([...customers, { ...cust, id: nextId() }]);
      showToast('고객이 추가되었습니다');
    }
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    const hasOrders = orders.some(o => o.customerId === id);
    if (hasOrders) {
      alert('이 고객은 주문 이력이 있어 삭제할 수 없습니다.');
      return;
    }
    if (confirm('이 고객을 삭제할까요?')) {
      setCustomers(customers.filter(c => c.id !== id));
      showToast('삭제되었습니다');
    }
  };

  return (
    <div className="space-y-4">
      {/* 검색 + 고객 추가 + 중복 찾기 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 고객ID, 전화, 주소 검색"
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4E4E7] rounded-[8px] text-[14px] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#09090B] transition-colors"
          />
        </div>

        {/* 중복 찾기 버튼 */}
        {(() => {
          // 전화번호 기준 중복 개수 계산
          const phoneGroups = {};
          customers.forEach(c => {
            const normPhone = String(c.phone || '').replace(/\D/g, '');
            if (normPhone && normPhone.length >= 8) {
              if (!phoneGroups[normPhone]) phoneGroups[normPhone] = [];
              phoneGroups[normPhone].push(c);
            }
          });
          const dupCount = Object.values(phoneGroups).filter(g => g.length > 1).reduce((s, g) => s + g.length - 1, 0);

          return dupCount > 0 ? (
            <button
              onClick={() => setShowDuplicates(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] rounded-[8px] text-[13px] font-medium transition-colors"
            >
              <AlertTriangle size={14} />
              중복 연락처 <span className="tabular-nums">{dupCount}건</span>
            </button>
          ) : null;
        })()}

        {/* 🆕 주문 없는 고객 즉시 삭제 버튼 */}
        {(() => {
          const customerIdsWithOrders = new Set(orders.map(o => o.customerId));
          const noOrderCount = customers.filter(c => !customerIdsWithOrders.has(c.id)).length;

          if (noOrderCount === 0) return null;

          const handleCleanupNow = () => {
            const withOrders = customers.filter(c => customerIdsWithOrders.has(c.id));
            const withoutCount = customers.length - withOrders.length;

            if (!confirm(
              `⚠️ 주문 없는 고객 ${withoutCount}명을 영구 삭제합니다.\n\n` +
              `• 전체: ${customers.length}명\n` +
              `• 유지: ${withOrders.length}명 (주문 있음)\n` +
              `• 삭제: ${withoutCount}명 (주문 없음)\n\n` +
              `복구할 수 없습니다. 계속할까요?`
            )) return;

            setCustomers(withOrders);
            showToast(`✓ ${withoutCount}명 삭제 완료 · 남은 고객 ${withOrders.length}명`);
          };

          return (
            <button
              onClick={handleCleanupNow}
              className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-[8px] text-[13px] font-medium transition-colors"
              title={`주문 이력이 없는 고객 ${noOrderCount}명을 즉시 삭제합니다`}
            >
              <Trash2 size={14} />
              주문 없는 고객 <span className="tabular-nums">{noOrderCount}명</span>
            </button>
          );
        })()}

        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[14px] font-medium transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          고객 추가
        </button>
      </div>

      {/* 선택 액션 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-white border border-[#E4E4E7] rounded-[10px]">
          <div className="flex items-center gap-2 pr-3 border-r border-[#E4E4E7]">
            <span className="text-[13px] font-medium text-[#09090B]">
              {selectedIds.size}명 선택됨
            </span>
            <button
              onClick={clearSelection}
              className="text-[12px] text-[#71717A] hover:text-[#09090B] transition-colors"
            >
              해제
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#71717A] mr-1">등급</span>
            <button onClick={() => handleBulkGrade('VIP')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">VIP</button>
            <button onClick={() => handleBulkGrade('우수')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">우수</button>
            <button onClick={() => handleBulkGrade('일반')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">일반</button>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E4E4E7]">
            <span className="text-[11px] text-[#71717A] mr-1">Aged Care</span>
            <button onClick={() => handleBulkAgedCare(true)} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">설정</button>
            <button onClick={() => handleBulkAgedCare(false)} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">해제</button>
          </div>

          <button
            onClick={handleBulkDeleteCustomers}
            className="ml-auto px-3 py-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] rounded-[6px] text-[12px] font-medium transition-colors"
          >
            삭제
          </button>
        </div>
      )}

      {/* 고객 유형 탭 */}
      <div className="flex items-center gap-1 border-b border-[#E4E4E7]">
        {[
          { id: 'all', label: '전체', count: customers.length },
          { id: 'b2c', label: '개인', count: customers.filter(c => !c.isB2B).length },
          { id: 'b2b', label: '거래처', count: customers.filter(c => c.isB2B).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCustomerTypeFilter(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              customerTypeFilter === tab.id
                ? 'text-[#09090B] border-[#09090B]'
                : 'text-[#71717A] hover:text-[#09090B] border-transparent'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-[12px] tabular-nums ${customerTypeFilter === tab.id ? 'text-[#52525B]' : 'text-[#A1A1AA]'}`}>
              {tab.count.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {/* 등급 + Aged Care 필터 */}
      <div className="bg-white rounded-[10px] border border-[#E4E4E7] p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-[#71717A] mr-1">등급</span>
          {[
            { v: '', label: '전체' },
            { v: 'VIP', label: 'VIP' },
            { v: '우수', label: '우수' },
            { v: '일반', label: '일반' },
          ].map(g => (
            <button
              key={g.v}
              onClick={() => setGradeFilter(g.v)}
              className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
                gradeFilter === g.v
                  ? 'bg-[#09090B] text-white'
                  : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
              }`}>
              {g.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#E4E4E7]" />

        <button
          onClick={() => setAgedCareFilter(!agedCareFilter)}
          className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
            agedCareFilter
              ? 'bg-[#09090B] text-white'
              : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
          }`}>
          Aged Care <span className="tabular-nums ml-0.5 opacity-70">{customers.filter(c => c.agedCare).length}</span>
        </button>

        <div className="ml-auto text-[12px] text-[#71717A]">
          <span className="font-medium text-[#09090B] tabular-nums">{filtered.length.toLocaleString()}</span>
          <span className="mx-1">/</span>
          <span className="tabular-nums">{customers.length.toLocaleString()}</span>
          <span className="ml-1">명</span>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-[13px]">
            <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#09090B] cursor-pointer"
                    checked={filtered.length > 0 && filtered.slice(0, displayLimit).every(c => selectedIds.has(c.id))}
                    onChange={() => toggleSelectAll(filtered.slice(0, displayLimit).map(c => c.id))}
                    title="전체 선택"
                  />
                </th>
                <SortHeader label="고객ID" field="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="성함" field="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="연락처" field="phone" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">주소</th>
                <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">주문 품목</th>
                <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">구분</th>
                <SortHeader label="등급(자동)" field="grade" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="주문" field="orderCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="구매액" field="totalSpent" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(c => {
                const custData = ordersByCustomer[c.id] || { orders: [], count: 0, totalSpent: 0, summary: '', autoGrade: '일반' };
                const orderCount = custData.count;
                const totalSpent = custData.totalSpent;
                const myOrders = custData.orders;
                const autoGrade = custData.autoGrade;
                return (
                  <tr key={c.id} className={`border-b border-stone-100 hover:bg-stone-50 ${selectedIds.has(c.id) ? 'bg-red-50/50' : c.agedCare ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-red-700 cursor-pointer"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-red-800">{c.id}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-stone-800">{c.name}</span>
                        {c.isB2B && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">🏢 B2B</span>
                        )}
                        {c.b2bDiscount > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">-{c.b2bDiscount}%</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs tabular-nums">{c.phone}</td>
                    <td className="px-4 py-3 text-stone-600 text-xs max-w-[180px] truncate" title={c.address}>{c.address}</td>
                    <td className="px-4 py-3 text-stone-700 text-xs max-w-[220px]" title={custData.summary}>
                      {myOrders.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {myOrders.map((o, idx) => (
                            <span key={idx} className="inline-block px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-medium">
                              {o.itemName}×{o.qty}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.agedCare ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-200 text-amber-900">🏥 Aged</span>
                      ) : (
                        <span className="text-stone-300 text-xs">일반</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${gradeStyle(autoGrade)}`}>{autoGrade}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`tabular-nums font-semibold ${orderCount > 0 ? 'text-stone-800' : 'text-stone-400'}`}>{orderCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums font-semibold text-xs ${totalSpent > 0 ? 'text-red-800' : 'text-stone-400'}`}>
                        {totalSpent > 0 ? formatWon(totalSpent) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setHistoryTarget(c)} className="p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700 rounded" title="주문 히스토리">
                          <History size={14} />
                        </button>
                        <button onClick={() => { setEditTarget(c); setShowForm(true); }} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded" title="수정">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700 rounded" title="삭제">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-stone-400 text-sm">검색 결과가 없습니다</div>}
          {filtered.length > displayLimit && (
            <div className="px-4 py-4 text-center border-t border-stone-100 bg-stone-50">
              <div className="text-xs text-stone-500 mb-2">
                {displayLimit}명 / {filtered.length}명 표시 중
              </div>
              <button
                onClick={() => setDisplayLimit(displayLimit + 50)}
                className="px-5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-lg text-sm font-medium border border-stone-200"
              >
                다음 50명 더 보기 ↓
              </button>
              <button
                onClick={() => setDisplayLimit(filtered.length)}
                className="ml-2 px-5 py-2 bg-white hover:bg-stone-100 text-stone-600 rounded-lg text-sm font-medium border border-stone-200"
              >
                전체 보기 ({filtered.length}명)
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <CustomerFormModal
          editTarget={editTarget}
          items={items}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {historyTarget && (
        <CustomerHistoryModal
          customer={historyTarget}
          items={items}
          orders={orders}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {showDuplicates && (
        <DuplicateCustomersModal
          customers={customers}
          setCustomers={setCustomers}
          orders={orders}
          setOrders={setOrders}
          showToast={showToast}
          onClose={() => setShowDuplicates(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔍 중복 고객 찾기 + 병합 삭제 모달
// ═══════════════════════════════════════════════════════════
function DuplicateCustomersModal({ customers, setCustomers, orders, setOrders, showToast, onClose }) {
  // 중복 그룹 찾기 (전화번호 기준)
  const duplicateGroups = useMemo(() => {
    const phoneGroups = {};
    customers.forEach(c => {
      const normPhone = String(c.phone || '').replace(/\D/g, '');
      if (normPhone && normPhone.length >= 8) {
        if (!phoneGroups[normPhone]) phoneGroups[normPhone] = [];
        phoneGroups[normPhone].push(c);
      }
    });

    // 중복만 필터 + 각 고객의 주문 수 계산
    const dups = Object.entries(phoneGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([phone, group]) => ({
        phone,
        customers: group.map(c => {
          const orderCount = orders.filter(o => o.customerId === c.id && o.shipStatus !== '취소' && !o.isService).length;
          const totalSpent = orders
            .filter(o => o.customerId === c.id && o.shipStatus !== '취소' && !o.isService)
            .reduce((s, o) => s + (o.qty || 0), 0);
          return { ...c, _orderCount: orderCount, _totalSpent: totalSpent };
        }).sort((a, b) => {
          // 주문 많은 순 → 구매 많은 순 → ID 작은 순
          if (b._orderCount !== a._orderCount) return b._orderCount - a._orderCount;
          if (b._totalSpent !== a._totalSpent) return b._totalSpent - a._totalSpent;
          return a.id.localeCompare(b.id);
        }),
      }));

    return dups;
  }, [customers, orders]);

  // 각 그룹별 "유지할 고객 ID" (기본값: 주문 가장 많은 고객)
  const [keepIds, setKeepIds] = useState(() => {
    const initial = {};
    duplicateGroups.forEach(g => {
      initial[g.phone] = g.customers[0].id;  // 첫번째 = 주문 많은 순 1등
    });
    return initial;
  });

  const [selectedGroups, setSelectedGroups] = useState(() => {
    // 기본: 모든 그룹 선택
    return new Set(duplicateGroups.map(g => g.phone));
  });

  const toggleGroup = (phone) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (selectedGroups.size === duplicateGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(duplicateGroups.map(g => g.phone)));
    }
  };

  // 병합 + 삭제 실행
  const handleMerge = () => {
    if (selectedGroups.size === 0) {
      alert('처리할 그룹을 선택하세요');
      return;
    }

    // 삭제 대상 계산
    const toDelete = new Set();
    const idRemap = {};  // 삭제될 ID → 유지될 ID

    duplicateGroups.forEach(g => {
      if (!selectedGroups.has(g.phone)) return;
      const keepId = keepIds[g.phone];
      g.customers.forEach(c => {
        if (c.id !== keepId) {
          toDelete.add(c.id);
          idRemap[c.id] = keepId;
        }
      });
    });

    if (toDelete.size === 0) {
      alert('삭제할 고객이 없습니다');
      return;
    }

    if (!confirm(
      `${selectedGroups.size}개 그룹에서 중복 고객 ${toDelete.size}명을 병합 삭제합니다.\n\n` +
      `- 삭제되는 고객의 주문은 유지되는 고객에게 이전됩니다\n` +
      `- 이 작업은 되돌릴 수 없습니다\n\n` +
      `계속할까요?`
    )) return;

    // ① 주문의 customerId를 유지되는 고객으로 변경
    const updatedOrders = orders.map(o => {
      if (idRemap[o.customerId]) {
        return { ...o, customerId: idRemap[o.customerId] };
      }
      return o;
    });

    // ② 고객 삭제
    const updatedCustomers = customers.filter(c => !toDelete.has(c.id));

    setOrders(updatedOrders);
    setCustomers(updatedCustomers);
    showToast(`✓ 중복 ${toDelete.size}명 병합 완료 · 주문 ${Object.values(idRemap).length}건 이전`);
    onClose();
  };

  const totalDuplicates = duplicateGroups.reduce((s, g) => s + g.customers.length - 1, 0);
  const selectedDupCount = duplicateGroups
    .filter(g => selectedGroups.has(g.phone))
    .reduce((s, g) => s + g.customers.length - 1, 0);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between z-10">
          <div>
            <h2 className="text-[18px] font-semibold text-[#09090B] tracking-tight">중복 연락처 정리</h2>
            <div className="text-[13px] text-[#71717A] mt-0.5">
              {duplicateGroups.length}개 그룹 · 중복 {totalDuplicates}명 발견
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F4F4F5] rounded-[6px] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 안내 */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px]">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#1D4ED8] mt-0.5 flex-shrink-0" />
              <div className="text-[12px] text-[#1E3A8A] leading-relaxed">
                <div className="font-semibold mb-1">병합 방식</div>
                <div>• <strong>유지</strong> 선택된 고객의 정보만 남고, 나머지는 삭제됩니다</div>
                <div>• 삭제되는 고객의 <strong>모든 주문은 유지되는 고객에게 자동 이전</strong>됩니다</div>
                <div>• 기본적으로 <strong>주문이 가장 많은 고객</strong>이 유지되도록 선택됩니다</div>
                <div className="text-[11px] text-[#3B82F6] mt-1">※ 이 작업은 되돌릴 수 없습니다</div>
              </div>
            </div>
          </div>

          {/* 전체 선택 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-[#09090B] cursor-pointer"
                checked={selectedGroups.size === duplicateGroups.length && duplicateGroups.length > 0}
                onChange={toggleAllGroups}
              />
              <span className="text-[13px] font-medium text-[#09090B]">전체 그룹 선택</span>
              <span className="text-[12px] text-[#71717A]">
                ({selectedGroups.size} / {duplicateGroups.length} 그룹 선택됨 · 중복 {selectedDupCount}명 삭제)
              </span>
            </label>
          </div>

          {/* 중복 그룹 리스트 */}
          <div className="space-y-3">
            {duplicateGroups.map(group => (
              <div
                key={group.phone}
                className={`border rounded-[12px] overflow-hidden transition-colors ${
                  selectedGroups.has(group.phone) ? 'border-[#09090B]' : 'border-[#E4E4E7]'
                }`}
              >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E4E4E7]">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#09090B] cursor-pointer"
                    checked={selectedGroups.has(group.phone)}
                    onChange={() => toggleGroup(group.phone)}
                  />
                  <span className="text-[13px] font-semibold text-[#09090B] tabular-nums">
                    {group.phone.replace(/(\d{4})(\d{3,4})(\d{4})/, '$1 $2 $3')}
                  </span>
                  <span className="text-[12px] text-[#71717A]">
                    · {group.customers.length}명 중복
                  </span>
                </div>

                <div className="divide-y divide-[#E4E4E7]">
                  {group.customers.map((c, idx) => {
                    const isKeep = keepIds[group.phone] === c.id;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          isKeep ? 'bg-[#F0FDF4]' : 'hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`keep-${group.phone}`}
                          className="w-4 h-4 accent-[#15803D] cursor-pointer"
                          checked={isKeep}
                          onChange={() => setKeepIds(prev => ({ ...prev, [group.phone]: c.id }))}
                        />
                        <div className="flex-1 grid grid-cols-12 gap-2 items-center text-[13px]">
                          <div className="col-span-1 font-mono text-[11px] text-[#71717A]">{c.id}</div>
                          <div className="col-span-2 font-medium text-[#09090B] truncate">{c.name}</div>
                          <div className="col-span-4 text-[#52525B] truncate">{c.address || '-'}</div>
                          <div className="col-span-2 text-[#71717A] text-[12px]">{c.grade || '일반'}</div>
                          <div className="col-span-1 text-right tabular-nums text-[#09090B] font-medium">{c._orderCount}건</div>
                          <div className="col-span-2 text-right">
                            {isKeep ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#15803D] text-white rounded-[4px] text-[11px] font-medium">
                                <Check size={10} strokeWidth={3} />
                                유지
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#B91C1C] font-medium">삭제</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {duplicateGroups.length === 0 && (
            <div className="text-center py-12 text-[#71717A] text-[14px]">
              중복된 연락처가 없습니다
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-[#E4E4E7] flex items-center justify-between gap-2">
          <div className="text-[12px] text-[#71717A]">
            {selectedDupCount > 0 && (
              <span>
                <strong className="text-[#09090B]">{selectedDupCount}명</strong> 삭제 · 주문은 유지 고객에게 이전됩니다
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-[#52525B] hover:bg-[#F4F4F5] rounded-[8px] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleMerge}
              disabled={selectedGroups.size === 0}
              className="px-5 py-2 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              병합 삭제 ({selectedDupCount}명)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerHistoryModal({ customer, items, orders, onClose }) {
  const myOrders = useMemo(() =>
    orders
      .filter(o => o.customerId === customer.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [orders, customer.id]
  );

  const totalSpent = myOrders.reduce((s, o) => {
    const it = items.find(i => i.name === o.itemName);
    return s + (it ? it.price * o.qty : 0);
  }, 0);

  const totalQty = myOrders.reduce((s, o) => s + o.qty, 0);

  // 품목별 집계
  const itemSummary = {};
  myOrders.forEach(o => {
    if (!itemSummary[o.itemName]) {
      itemSummary[o.itemName] = { qty: 0, count: 0, amount: 0 };
    }
    const it = items.find(i => i.name === o.itemName);
    itemSummary[o.itemName].qty += o.qty;
    itemSummary[o.itemName].count += 1;
    itemSummary[o.itemName].amount += (it?.price || 0) * o.qty;
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-gradient-to-br from-red-50 to-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History size={18} className="text-red-700" />
              <h2 className="font-serif-ko text-xl font-bold text-stone-800">
                {customer.name} 고객님 주문 히스토리
              </h2>
            </div>
            <div className="text-xs text-stone-500 font-mono">
              {customer.id} · {customer.phone}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <div className="text-xs text-stone-500 mb-1">총 주문건</div>
              <div className="text-2xl font-bold text-stone-800 tabular-nums">{myOrders.length}<span className="text-xs text-stone-400 ml-1">건</span></div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <div className="text-xs text-stone-500 mb-1">총 구매 수량</div>
              <div className="text-2xl font-bold text-stone-800 tabular-nums">{totalQty}<span className="text-xs text-stone-400 ml-1">개</span></div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="text-xs text-red-600 mb-1">총 구매액</div>
              <div className="text-2xl font-bold text-red-800 tabular-nums">{formatWon(totalSpent)}</div>
            </div>
          </div>

          {/* 고객 정보 요약 */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
            <div className="text-xs text-amber-900"><span className="font-semibold">주소:</span> {customer.address || '-'}</div>
            {customer.agedCare && (
              <div className="text-xs text-amber-900"><span className="font-semibold">🏥 Aged Care 고객</span></div>
            )}
            {customer.memo && (
              <div className="text-xs text-amber-900"><span className="font-semibold">메모:</span> {customer.memo}</div>
            )}
          </div>

          {/* 품목별 집계 */}
          {Object.keys(itemSummary).length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                <Package size={14} /> 품목별 주문 요약
              </h3>
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-stone-600 text-xs">품목명</th>
                      <th className="text-right px-4 py-2 font-semibold text-stone-600 text-xs">주문 횟수</th>
                      <th className="text-right px-4 py-2 font-semibold text-stone-600 text-xs">총 수량</th>
                      <th className="text-right px-4 py-2 font-semibold text-stone-600 text-xs">소계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(itemSummary).map(([name, s]) => (
                      <tr key={name} className="border-t border-stone-100">
                        <td className="px-4 py-2 font-medium text-stone-800">{name}</td>
                        <td className="px-4 py-2 text-right text-stone-600 tabular-nums">{s.count}건</td>
                        <td className="px-4 py-2 text-right text-stone-700 tabular-nums font-semibold">{s.qty}개</td>
                        <td className="px-4 py-2 text-right text-red-800 tabular-nums font-bold">{formatWon(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 전체 주문 목록 */}
          <div>
            <h3 className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
              <ShoppingCart size={14} /> 전체 주문 내역 ({myOrders.length}건)
            </h3>
            {myOrders.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm bg-stone-50 rounded-xl">
                주문 이력이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {myOrders.map(o => {
                  const it = items.find(i => i.name === o.itemName);
                  const amount = (it?.price || 0) * o.qty;
                  return (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 border border-stone-100">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-red-800">{o.id}</span>
                        <span className="text-xs text-stone-500">{o.date}</span>
                        <span className="font-medium text-sm text-stone-800">{o.itemName}</span>
                        <span className="text-xs text-stone-500">× {o.qty}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${shipStatusStyle(o.shipStatus)}`}>{o.shipStatus}</span>
                        <span className="text-sm font-bold text-stone-800 tabular-nums">{formatWon(amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerFormModal({ editTarget, items, onSave, onClose }) {
  const [form, setForm] = useState(editTarget || {
    name: '', phone: '', agedCare: false, address: '', grade: '일반',
    joinDate: new Date().toISOString().slice(0,10), memo: '',
    isB2B: false, b2bDiscount: 0, b2bPaymentTerms: '즉시결제', b2bContact: '',
    itemPriceOverrides: {}  // { itemCode: customPrice }
  });

  // 상품별 가격 오버라이드 업데이트
  const updateItemOverride = (itemCode, value) => {
    const overrides = { ...(form.itemPriceOverrides || {}) };
    if (value === '' || value === null || value === 0) {
      delete overrides[itemCode];  // 빈 값이면 삭제 (기본가 사용)
    } else {
      overrides[itemCode] = Number(value);
    }
    setForm({ ...form, itemPriceOverrides: overrides });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <h2 className="font-serif-ko text-lg font-bold text-stone-800">
            {editTarget ? '고객 수정' : '고객 추가'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => form.name && onSave(form)}
              disabled={!form.name}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              💾 저장
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {!editTarget && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800">
              💡 고객ID는 저장 시 자동으로 생성됩니다 (C0001, C0002...) · 등급은 누적 구매액에 따라 자동 승급됩니다
            </div>
          )}

          {/* 🏢 B2B 거래처 여부 - 최상단 */}
          <div className="col-span-2">
            <label className="flex items-center gap-3 p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-all">
              <input
                type="checkbox"
                checked={!!form.isB2B}
                onChange={e => setForm({...form, isB2B: e.target.checked})}
                className="w-5 h-5 accent-indigo-700"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-indigo-900">🏢 거래처 (B2B)</div>
                <div className="text-[10px] text-indigo-700 mt-0.5">
                  체크 시 도매가 / 분할배송 / 외상결제 / 선주문 기능 사용 가능
                </div>
              </div>
            </label>
          </div>

          <Field label="성함 / 상호 *" value={form.name} onChange={v => setForm({...form, name: v})} />
          <Field label="연락처" value={form.phone} onChange={v => setForm({...form, phone: v})} />
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">주소</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
          </div>

          {/* 🏢 B2B 전용 필드들 */}
          {form.isB2B && (
            <div className="col-span-2 p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                🏢 거래처 전용 설정
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1.5">담당자</label>
                  <input
                    value={form.b2bContact || ''}
                    onChange={e => setForm({...form, b2bContact: e.target.value})}
                    placeholder="예: 김사장"
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1.5">도매 할인율 (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={form.b2bDiscount ?? 0}
                      onChange={e => setForm({...form, b2bDiscount: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">%</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-indigo-700 mb-1.5">결제 조건</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.values(PAYMENT_TERMS).map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setForm({...form, b2bPaymentTerms: term})}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        form.b2bPaymentTerms === term
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-indigo-700 bg-white rounded-lg p-2 border border-indigo-100">
                💡 <strong>할인율 {form.b2bDiscount || 0}%</strong> 적용 예시: 배추김치 4KG ($70) → <strong>${getB2BPrice(70, form.b2bDiscount || 0)}</strong>
              </div>

              {/* 🎯 상품별 개별 가격 오버라이드 */}
              {items && items.length > 0 && (
                <div className="pt-3 border-t border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-bold text-indigo-900">🎯 상품별 개별 가격 (선택사항)</div>
                      <div className="text-[10px] text-indigo-600 mt-0.5">설정하면 기본 할인율보다 우선 적용됩니다</div>
                    </div>
                    {Object.keys(form.itemPriceOverrides || {}).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm({...form, itemPriceOverrides: {}})}
                        className="text-[10px] text-red-600 hover:underline"
                      >
                        전체 초기화
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {items.map(item => {
                      const override = form.itemPriceOverrides?.[item.code];
                      const defaultB2BPrice = item.b2bPrice > 0 ? item.b2bPrice : getB2BPrice(item.price, form.b2bDiscount || 0);
                      const effectivePrice = override !== undefined ? override : defaultB2BPrice;
                      const savingVsB2C = item.price > 0 ? ((1 - effectivePrice / item.price) * 100).toFixed(0) : 0;

                      return (
                        <div key={item.code} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-stone-800 truncate">{item.name}</div>
                            <div className="text-[10px] text-stone-500 flex items-center gap-1.5">
                              <span>정가: ${item.price}</span>
                              <span className="text-indigo-400">|</span>
                              <span className="text-indigo-700">기본도매가: ${defaultB2BPrice}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={override ?? ''}
                              placeholder={String(defaultB2BPrice)}
                              onChange={e => updateItemOverride(item.code, e.target.value)}
                              className={`w-20 px-2 py-1 border rounded text-xs text-right tabular-nums focus:outline-none focus:ring-1 ${
                                override !== undefined
                                  ? 'border-indigo-500 bg-indigo-50 font-bold text-indigo-700'
                                  : 'border-stone-200 focus:border-indigo-500 focus:ring-indigo-100'
                              }`}
                            />
                            {override !== undefined && (
                              <span className={`text-[10px] font-bold ${savingVsB2C >= 20 ? 'text-emerald-700' : savingVsB2C >= 10 ? 'text-amber-700' : 'text-red-700'} w-8`}>
                                -{savingVsB2C}%
                              </span>
                            )}
                            {override !== undefined && (
                              <button
                                type="button"
                                onClick={() => updateItemOverride(item.code, '')}
                                className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                title="기본값으로"
                              >
                                <X size={12} />
                              </button>
                            )}
                            {override === undefined && (
                              <span className="w-10 text-[9px] text-stone-400 text-center">기본</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(form.itemPriceOverrides || {}).length > 0 && (
                    <div className="mt-2 text-[10px] text-indigo-700 bg-white rounded px-2 py-1.5 border border-indigo-100">
                      ✓ <strong>{Object.keys(form.itemPriceOverrides).length}개 상품</strong>에 개별 가격 적용 중
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Field label="가입일" type="date" value={form.joinDate} onChange={v => setForm({...form, joinDate: v})} />
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">등급 (자동 계산)</label>
            <div className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-500">
              {form.grade || '일반'} <span className="text-[10px] text-stone-400">· 구매액에 따라 자동 변경</span>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">메모</label>
            <input value={form.memo} onChange={e => setForm({...form, memo: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
          </div>
          {!form.isB2B && (
            <div className="col-span-2">
              <label className="flex items-center gap-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-all">
                <input
                  type="checkbox"
                  checked={!!form.agedCare}
                  onChange={e => setForm({...form, agedCare: e.target.checked})}
                  className="w-4 h-4 accent-amber-700"
                />
                <span className="text-sm font-semibold text-amber-900">
                  🏥 Aged Care 고객
                </span>
                <span className="text-xs text-amber-700 ml-1">
                  (체크 시 고객 목록에서 배지로 구분 표시됨)
                </span>
              </label>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button
            onClick={() => form.name && onSave(form)}
            disabled={!form.name}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 active:scale-95 transition-all disabled:bg-stone-300"
          >
            💾 {editTarget ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, field, sortKey, sortDir, onClick, align = 'left' }) {
  const active = sortKey === field;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={`${alignClass} px-4 py-3 font-semibold text-xs cursor-pointer select-none hover:bg-stone-100 ${active ? 'text-red-800' : 'text-stone-600'}`}
      onClick={() => onClick(field)}>
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span>{label}</span>
        <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-30'}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </div>
    </th>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
    </div>
  );
}

function Items({ items, setItems, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [stockInTarget, setStockInTarget] = useState(null); // 📥 입고 모달 대상
  const [historyTarget, setHistoryTarget] = useState(null); // 📜 입고 이력 대상

  const baechu = items.find(i => i.code === 'P001');
  const chonggak = items.find(i => i.code === 'P002');

  // availStock 같은 계산 필드 제거 (Supabase 저장 시 문제 방지)
  const stripComputed = (item) => {
    const { availStock, ...clean } = item;
    return clean;
  };

  const handleSaveStock = (code, newStock) => {
    setItems(prev => prev.map(i => {
      if (i.code !== code) return stripComputed(i);
      return { ...stripComputed(i), realStock: newStock };
    }));
    showToast('재고가 업데이트되었습니다');
  };

  // 📥 입고 처리 (평균 원가 자동 재계산)
  const handleStockIn = (code, stockInData) => {
    // stockInData: { qty, cost, date, memo, supplier }
    setItems(prev => prev.map(i => {
      if (i.code !== code) return stripComputed(i);

      const clean = stripComputed(i);
      const currentStock = clean.realStock || 0;
      const currentCost = clean.cost || 0;
      const newQty = stockInData.qty;
      const newCost = stockInData.cost;

      // 평균 원가 계산 (가중 평균)
      const totalValue = currentStock * currentCost + newQty * newCost;
      const totalQty = currentStock + newQty;
      const avgCost = totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : newCost;

      const newHistoryEntry = {
        id: `SI-${Date.now()}`,
        date: stockInData.date,
        qty: newQty,
        cost: newCost,
        supplier: stockInData.supplier || '',
        memo: stockInData.memo || '',
        prevStock: currentStock,
        newStock: totalQty,
      };

      return {
        ...clean,
        realStock: totalQty,
        cost: avgCost,
        stockHistory: [...(clean.stockHistory || []), newHistoryEntry],
      };
    }));
    showToast(`✅ 입고 완료: ${stockInData.qty}개 · 평균원가 재계산됨`);
  };

  const nextCode = () => {
    const nums = items.map(i => parseInt(i.code.replace('P',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'P' + String(max + 1).padStart(3, '0');
  };

  const handleSave = (item) => {
    if (editTarget) {
      setItems(prev => prev.map(i => {
        if (i.code !== editTarget.code) return stripComputed(i);
        return { ...stripComputed(i), ...item, code: editTarget.code };
      }));
      showToast('품목이 수정되었습니다');
    } else {
      setItems(prev => [...prev.map(stripComputed), { ...item, code: nextCode() }]);
      showToast('품목이 추가되었습니다');
    }
    setShowForm(false);
    setEditTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">개별 품목 실재고</h2>
            <p className="text-xs text-stone-500 mt-0.5">개별 재고만 직접 관리하세요. 세트는 자동 계산됩니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[baechu, chonggak].filter(Boolean).map(it => {
            const st = stockStatus(it.availStock);
            return (
              <StockCard key={it.code} item={it} status={st} onUpdate={(v) => handleSaveStock(it.code, v)} />
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">세트 가용재고 <span className="text-xs text-stone-400 font-normal ml-2">(자동 계산)</span></h2>
            <p className="text-xs text-stone-500 mt-0.5">구성품 재고에 따라 자동 계산됩니다. 별도 관리 불필요.</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {items.filter(i => i.isSet).map(it => {
            const st = stockStatus(it.availStock);
            return (
              <div key={it.code} className="border border-stone-200 rounded-xl p-4 bg-gradient-to-br from-stone-50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-stone-500">{it.code}</span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium border ${st.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>
                <div className="font-semibold text-stone-800 text-sm mb-1">{it.name}</div>
                <div className="text-xs text-stone-500 mb-3">{it.spec}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-red-800 tabular-nums">{it.availStock}</span>
                  <span className="text-xs text-stone-400">세트</span>
                </div>
                <div className="mt-2 text-[10px] text-stone-400">
                  구성: {it.baechu > 0 && `배추×${it.baechu}`} {it.baechu > 0 && it.chonggak > 0 && ' + '} {it.chonggak > 0 && `총각×${it.chonggak}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-serif-ko text-lg font-bold text-stone-800">전체 품목 목록</h2>
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-2 bg-red-800 text-white rounded-lg text-xs font-semibold hover:bg-red-900">
            <Plus size={14} /> 품목 추가
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">품목코드</th>
              <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">품목명</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">💰 원가</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">🏠 B2C 판매가</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">🏢 B2B 도매가</th>
              <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">마진율</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">실재고</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">가용재고</th>
              <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">상태</th>
              <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const st = stockStatus(it.availStock);
              const cost = it.cost || 0;
              const margin = (it.price || 0) - cost;
              const marginRate = it.price > 0 ? ((margin / it.price) * 100).toFixed(0) : 0;
              return (
                <tr key={it.code} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-red-800">{it.code}</span></td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    <div>{it.name}</div>
                    <div className="text-[10px] text-stone-400">{it.spec}</div>
                    {it.isSet && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">세트</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600 tabular-nums text-xs">
                    {cost > 0 ? `$${cost.toFixed(2)}` : <span className="text-stone-300">미설정</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-800 tabular-nums">
                    {formatWon(it.price)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-700 tabular-nums text-xs">
                    {it.b2bPrice > 0 ? `$${it.b2bPrice}` : <span className="text-stone-300">미설정</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cost > 0 ? (
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                        marginRate >= 30 ? 'bg-emerald-100 text-emerald-700' :
                        marginRate >= 15 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {marginRate}%
                      </span>
                    ) : <span className="text-stone-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600 tabular-nums">
                    {it.isSet ? <span className="text-stone-400">—</span> : formatNum(it.realStock)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-800 tabular-nums">{formatNum(it.availStock)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`flex items-center justify-center gap-1 text-xs px-2 py-0.5 rounded border ${st.color} w-fit mx-auto`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {!it.isSet && (
                        <button
                          onClick={() => setStockInTarget(it)}
                          className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          title="입고 등록"
                        >
                          📥 입고
                        </button>
                      )}
                      {it.stockHistory?.length > 0 && (
                        <button
                          onClick={() => setHistoryTarget(it)}
                          className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded"
                          title={`입고 이력 ${it.stockHistory.length}건`}
                        >
                          <History size={14} />
                        </button>
                      )}
                      <button onClick={() => { setEditTarget(it); setShowForm(true); }} className="p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ItemFormModal editTarget={editTarget} onSave={handleSave} onClose={() => { setShowForm(false); setEditTarget(null); }} />
      )}
      {stockInTarget && (
        <StockInModal
          item={stockInTarget}
          onSave={(data) => { handleStockIn(stockInTarget.code, data); setStockInTarget(null); }}
          onClose={() => setStockInTarget(null)}
        />
      )}
      {historyTarget && (
        <StockHistoryModal
          item={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// 📥 입고 등록 모달
// ============================================================
function StockInModal({ item, onSave, onClose }) {
  const [qty, setQty] = useState(0);
  const [cost, setCost] = useState(item.cost || 0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState('');
  const [memo, setMemo] = useState('');

  const canSubmit = qty > 0 && cost > 0;

  // 평균 원가 예상 계산
  const currentStock = item.realStock || 0;
  const currentCost = item.cost || 0;
  const totalValue = currentStock * currentCost + qty * cost;
  const totalQty = currentStock + qty;
  const newAvgCost = totalQty > 0 ? (totalValue / totalQty).toFixed(2) : 0;
  const totalCostOfStockIn = qty * cost;

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">📥 입고 등록</h2>
            <div className="text-xs text-stone-500 mt-0.5">{item.code} · {item.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canSubmit && onSave({ qty, cost, date, supplier, memo })}
              disabled={!canSubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              💾 입고 완료
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* 현재 재고 정보 */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-stone-500">현재 재고</div>
              <div className="font-bold text-stone-800 text-lg tabular-nums">{currentStock}개</div>
            </div>
            <div>
              <div className="text-stone-500">현재 평균 원가</div>
              <div className="font-bold text-stone-800 text-lg tabular-nums">${currentCost.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">입고 수량 *</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border-2 border-emerald-300 rounded-lg text-lg font-bold focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 bg-white tabular-nums"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">입고 단가 (AUD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={e => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border-2 border-emerald-300 rounded-lg text-lg font-bold focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 bg-white tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* 입고 후 예상 */}
          {qty > 0 && cost > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="text-xs font-bold text-emerald-900">📊 입고 후 예상</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-emerald-700">총 입고액</div>
                  <div className="font-bold text-emerald-900 tabular-nums">${totalCostOfStockIn.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-emerald-700">새 재고</div>
                  <div className="font-bold text-emerald-900 tabular-nums">{totalQty}개</div>
                </div>
                <div>
                  <div className="text-emerald-700">새 평균 원가</div>
                  <div className="font-bold text-emerald-900 tabular-nums">${newAvgCost}</div>
                </div>
              </div>
              {item.price > 0 && (
                <div className="pt-2 border-t border-emerald-200 text-[10px] text-emerald-700">
                  예상 마진율 (B2C): {(((item.price - parseFloat(newAvgCost)) / item.price) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">입고일</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">공급처</label>
              <input
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="예: 한국본사"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">메모</label>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="예: 4/25 Container 입고분"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 📜 입고 이력 모달
// ============================================================
function StockHistoryModal({ item, onClose }) {
  const history = (item.stockHistory || []).slice().reverse(); // 최신순
  const totalValue = history.reduce((s, h) => s + (h.qty * h.cost), 0);
  const totalQty = history.reduce((s, h) => s + h.qty, 0);

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">📜 입고 이력</h2>
            <div className="text-xs text-stone-500 mt-0.5">{item.code} · {item.name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* 요약 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-[10px] text-emerald-700">총 입고 건수</div>
              <div className="font-bold text-emerald-900 text-xl tabular-nums">{history.length}회</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-[10px] text-emerald-700">총 입고 수량</div>
              <div className="font-bold text-emerald-900 text-xl tabular-nums">{formatNum(totalQty)}개</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-[10px] text-emerald-700">총 입고액</div>
              <div className="font-bold text-emerald-900 text-xl tabular-nums">${formatNum(totalValue.toFixed(2))}</div>
            </div>
          </div>

          {/* 이력 목록 */}
          <div className="space-y-2">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="p-3 bg-white border border-stone-200 rounded-lg hover:bg-stone-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-stone-500">{h.date}</span>
                      {h.supplier && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">{h.supplier}</span>}
                    </div>
                    {h.memo && <div className="text-xs text-stone-600 mt-1">{h.memo}</div>}
                    <div className="text-[10px] text-stone-400 mt-1">
                      재고: {h.prevStock}개 → {h.newStock}개
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-700 tabular-nums">+{h.qty}개</div>
                    <div className="text-xs text-stone-600 tabular-nums">단가 ${h.cost.toFixed(2)}</div>
                    <div className="text-[10px] text-stone-400 tabular-nums">계 ${(h.qty * h.cost).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-8 text-sm text-stone-400">입고 이력이 없습니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StockCard({ item, status, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.realStock);

  return (
    <div className="border border-stone-200 rounded-xl p-5 bg-gradient-to-br from-white to-stone-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-mono text-stone-500">{item.code}</div>
          <div className="font-serif-ko text-lg font-bold text-stone-800">{item.name}</div>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">실재고</div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input type="number" value={value} onChange={e => setValue(parseInt(e.target.value) || 0)}
                className="w-24 px-2 py-1 border border-red-700 rounded text-lg font-bold focus:outline-none" autoFocus />
              <button onClick={() => { onUpdate(value); setEditing(false); }} className="p-1 bg-red-800 text-white rounded"><Check size={14} /></button>
              <button onClick={() => { setValue(item.realStock); setEditing(false); }} className="p-1 bg-stone-200 rounded"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-baseline gap-1 hover:bg-white px-2 py-0.5 rounded -ml-2">
              <span className="text-3xl font-bold text-stone-800 tabular-nums">{formatNum(item.realStock)}</span>
              <span className="text-xs text-stone-400">개</span>
              <Edit2 size={12} className="ml-1 text-stone-400" />
            </button>
          )}
        </div>
        <div>
          <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">가용재고</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-red-800 tabular-nums">{formatNum(item.availStock)}</span>
            <span className="text-xs text-stone-400">개</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">주문 {item.realStock - item.availStock}개 차감됨</div>
        </div>
      </div>
    </div>
  );
}

function ItemFormModal({ editTarget, onSave, onClose }) {
  const [form, setForm] = useState(editTarget || {
    name: '', spec: '', price: 0, realStock: 0, baechu: 0, chonggak: 0, memo: '', isSet: false,
    cost: 0, costCurrency: 'AUD', b2bPrice: 0
  });

  // 자동 계산
  const marginAmount = (form.price || 0) - (form.cost || 0);
  const marginRate = form.price > 0 ? ((marginAmount / form.price) * 100).toFixed(1) : 0;
  const b2bMarginAmount = (form.b2bPrice || 0) - (form.cost || 0);
  const b2bMarginRate = form.b2bPrice > 0 ? ((b2bMarginAmount / form.b2bPrice) * 100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <h2 className="font-serif-ko text-lg font-bold text-stone-800">{editTarget ? '품목 수정' : '품목 추가'}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => form.name && onSave(form)} disabled={!form.name}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed">
              💾 저장
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!editTarget && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800">
              💡 품목코드는 저장 시 자동 생성됩니다 (P001, P002...)
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isSet" checked={form.isSet} onChange={e => setForm({...form, isSet: e.target.checked, realStock: e.target.checked ? null : 0})} />
            <label htmlFor="isSet" className="text-sm text-stone-700">세트 상품 (구성품에서 자동 재고 계산)</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="품목명 *" value={form.name} onChange={v => setForm({...form, name: v})} />
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">구성/용량</label>
              <input value={form.spec} onChange={e => setForm({...form, spec: e.target.value})}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
            </div>
          </div>

          {/* 💰 가격 정보 섹션 */}
          <div className="bg-gradient-to-br from-stone-50 to-amber-50/30 border-2 border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                💰 가격 정보
              </h3>
              <span className="text-[10px] text-stone-500">모두 AUD 기준</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* 수입 원가 */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  📥 수입 원가
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost || 0}
                    onChange={e => setForm({...form, cost: parseFloat(e.target.value) || 0})}
                    className="w-full pl-6 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 bg-white tabular-nums"
                  />
                </div>
                <div className="text-[10px] text-stone-400 mt-1">실 구매 단가</div>
              </div>

              {/* B2C 판매가 */}
              <div>
                <label className="block text-[11px] font-semibold text-red-800 mb-1">
                  🏠 B2C 판매가 *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price || 0}
                    onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})}
                    className="w-full pl-6 pr-3 py-2 border-2 border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 bg-white tabular-nums font-bold"
                  />
                </div>
                <div className={`text-[10px] mt-1 ${marginRate >= 30 ? 'text-emerald-700' : marginRate >= 15 ? 'text-amber-700' : 'text-red-700'}`}>
                  마진: ${marginAmount.toFixed(2)} ({marginRate}%)
                </div>
              </div>

              {/* B2B 도매가 */}
              <div>
                <label className="block text-[11px] font-semibold text-indigo-700 mb-1">
                  🏢 B2B 도매가
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.b2bPrice || 0}
                    onChange={e => setForm({...form, b2bPrice: parseFloat(e.target.value) || 0})}
                    className="w-full pl-6 pr-3 py-2 border-2 border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100 bg-white tabular-nums font-bold"
                  />
                </div>
                <div className={`text-[10px] mt-1 ${b2bMarginRate >= 20 ? 'text-emerald-700' : b2bMarginRate >= 10 ? 'text-amber-700' : 'text-red-700'}`}>
                  {form.b2bPrice > 0 ? `마진: $${b2bMarginAmount.toFixed(2)} (${b2bMarginRate}%)` : '미설정 (기본값=판매가)'}
                </div>
              </div>
            </div>

            {/* 가격 비교 요약 */}
            {(form.cost > 0 || form.price > 0) && (
              <div className="flex items-center gap-2 text-[10px] pt-2 border-t border-stone-200">
                <span className="text-stone-500">원가 ${form.cost}</span>
                <span className="text-stone-400">→</span>
                <span className="text-red-700 font-bold">B2C ${form.price}</span>
                {form.b2bPrice > 0 && (
                  <>
                    <span className="text-stone-400">|</span>
                    <span className="text-indigo-700 font-bold">B2B ${form.b2bPrice}</span>
                    {form.b2bPrice < form.price && (
                      <span className="text-[9px] text-indigo-500">
                        (B2C 대비 {((1 - form.b2bPrice / form.price) * 100).toFixed(0)}%↓)
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* 재고 및 구성 */}
          <div className="grid grid-cols-3 gap-4">
            {!form.isSet && <Field label="실재고" type="number" value={form.realStock || 0} onChange={v => setForm({...form, realStock: parseInt(v)||0})} />}
            <Field label="배추김치 구성수량" type="number" value={form.baechu} onChange={v => setForm({...form, baechu: parseInt(v)||0})} />
            <Field label="총각김치 구성수량" type="number" value={form.chonggak} onChange={v => setForm({...form, chonggak: parseInt(v)||0})} />
          </div>

          <Field label="비고" value={form.memo} onChange={v => setForm({...form, memo: v})} />
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button onClick={() => form.name && onSave(form)} disabled={!form.name}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 active:scale-95 transition-all disabled:bg-stone-300">
            💾 {editTarget ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Shipping({ customers, orders, setOrders, showToast }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [pickupFilter, setPickupFilter] = useState(false);
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [editTarget, setEditTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);

  // 🆕 체크박스
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (visibleIds) => {
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach(id => next.delete(id));
      else visibleIds.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatus = (status) => {
    if (selectedIds.size === 0) return;
    setOrders(orders.map(o => selectedIds.has(o.id) ? { ...o, shipStatus: status } : o));
    showToast(`✅ ${selectedIds.size}건 → ${status}`);
    clearSelection();
  };
  const handleBulkPayment = (status) => {
    if (selectedIds.size === 0) return;
    setOrders(orders.map(o => selectedIds.has(o.id) ? { ...o, paymentStatus: status } : o));
    showToast(`✅ ${selectedIds.size}건 결제 → ${status}`);
    clearSelection();
  };
  const handleBulkZone = (zone) => {
    if (selectedIds.size === 0) return;
    setOrders(orders.map(o => selectedIds.has(o.id) ? { ...o, shippingGroup: zone } : o));
    showToast(`✅ ${selectedIds.size}건 Zone → ${zone || '미배정'}`);
    clearSelection();
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    let result = [...orders];
    if (statusFilter) result = result.filter(o => o.shipStatus === statusFilter);
    if (zoneFilter) result = result.filter(o => o.shippingGroup === zoneFilter);
    if (paymentFilter) result = result.filter(o => o.paymentStatus === paymentFilter);
    if (pickupFilter) result = result.filter(o => o.isPickup);
    // 정렬
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let av, bv;
      if (sortKey === 'id') { av = a.id; bv = b.id; }
      else if (sortKey === 'zone') { av = a.shippingGroup || ''; bv = b.shippingGroup || ''; }
      else if (sortKey === 'customer') {
        av = (customerMap[a.customerId]?.name || '').toLowerCase();
        bv = (customerMap[b.customerId]?.name || '').toLowerCase();
      }
      else if (sortKey === 'shipDate') { av = a.shipDate || ''; bv = b.shipDate || ''; }
      else if (sortKey === 'status') { av = a.shipStatus; bv = b.shipStatus; }
      else if (sortKey === 'payment') { av = a.paymentStatus || ''; bv = b.paymentStatus || ''; }
      else { av = a.id; bv = b.id; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return result;
  }, [orders, statusFilter, zoneFilter, paymentFilter, pickupFilter, sortKey, sortDir, customerMap]);

  useEffect(() => { setDisplayLimit(50); }, [statusFilter, zoneFilter, paymentFilter, pickupFilter]);

  const handleUpdate = (updated) => {
    setOrders(orders.map(o => o.id === updated.id ? updated : o));
    showToast('배송 정보가 업데이트되었습니다');
    setEditTarget(null);
  };

  const statusCounts = useMemo(() => ({
    '배송준비중': orders.filter(o => o.shipStatus === '배송준비중').length,
    '출고대기': orders.filter(o => o.shipStatus === '출고대기').length,
    '배송중': orders.filter(o => o.shipStatus === '배송중').length,
    '배송완료': orders.filter(o => o.shipStatus === '배송완료').length,
  }), [orders]);

  // Zone별 주문 건수
  const zoneCounts = useMemo(() => {
    const counts = {};
    SHIPPING_ZONES.forEach(z => {
      counts[z] = orders.filter(o => o.shippingGroup === z).length;
    });
    counts['미지정'] = orders.filter(o => !o.shippingGroup).length;
    return counts;
  }, [orders]);

  const unpaidCount = useMemo(() => orders.filter(o => o.paymentStatus === '미결제').length, [orders]);

  return (
    <div className="space-y-4">
      {/* 선택 액션 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-white border border-[#E4E4E7] rounded-[10px] flex-wrap">
          <div className="flex items-center gap-2 pr-3 border-r border-[#E4E4E7]">
            <span className="text-[13px] font-medium text-[#09090B]">
              {selectedIds.size}건 선택됨
            </span>
            <button
              onClick={clearSelection}
              className="text-[12px] text-[#71717A] hover:text-[#09090B] transition-colors"
            >
              해제
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#71717A] mr-1">배송</span>
            <button onClick={() => handleBulkStatus('출고대기')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">출고대기</button>
            <button onClick={() => handleBulkStatus('배송중')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">배송중</button>
            <button onClick={() => handleBulkStatus('배송완료')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">완료</button>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E4E4E7]">
            <span className="text-[11px] text-[#71717A] mr-1">결제</span>
            <button onClick={() => handleBulkPayment('결제완료')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">완료</button>
            <button onClick={() => handleBulkPayment('미결제')} className="px-2.5 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[12px] font-medium text-[#52525B] transition-colors">미결제</button>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-[#E4E4E7]">
            <span className="text-[11px] text-[#71717A] mr-1">Zone</span>
            {SHIPPING_ZONES.map(z => (
              <button
                key={z}
                onClick={() => handleBulkZone(z)}
                className="px-2 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[11px] font-medium text-[#52525B] transition-colors"
              >
                Z{z.replace('Zone', '')}
              </button>
            ))}
            <button onClick={() => handleBulkZone('')} className="px-2 py-1 bg-white hover:bg-[#F4F4F5] border border-[#E4E4E7] rounded-[6px] text-[11px] font-medium text-[#71717A] transition-colors">해제</button>
          </div>
        </div>
      )}

      {/* 상태 필터 카드 */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(statusCounts).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={`text-left p-4 rounded-[12px] border transition-colors ${
              statusFilter === k
                ? 'bg-[#09090B] border-[#09090B]'
                : 'bg-white border-[#E4E4E7] hover:border-[#D4D4D8]'
            }`}>
            <div className={`text-[12px] font-medium mb-1 ${statusFilter === k ? 'text-white/70' : 'text-[#71717A]'}`}>{k}</div>
            <div className={`text-[28px] font-semibold tabular-nums tracking-tight ${statusFilter === k ? 'text-white' : 'text-[#09090B]'}`}>{v}</div>
          </button>
        ))}
      </div>

      {/* Zone + 결제 필터 */}
      <div className="bg-white rounded-[12px] border border-[#E4E4E7] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold text-[#09090B]">Zone별 배송</div>
          {(zoneFilter || paymentFilter || statusFilter || pickupFilter) && (
            <button
              onClick={() => { setZoneFilter(''); setPaymentFilter(''); setStatusFilter(''); setPickupFilter(false); }}
              className="text-[12px] text-[#71717A] hover:text-[#09090B] transition-colors">
              필터 초기화
            </button>
          )}
        </div>

        {/* Zone 버튼 */}
        <div className="grid grid-cols-9 gap-2">
          <button
            onClick={() => setZoneFilter('')}
            className={`px-2 py-2 rounded-[8px] text-[12px] font-medium transition-colors ${
              zoneFilter === ''
                ? 'bg-[#09090B] text-white'
                : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
            }`}>
            <div>전체</div>
            <div className="text-[10px] opacity-70 mt-0.5 tabular-nums">{orders.length}</div>
          </button>
          {SHIPPING_ZONES.map(z => (
            <button
              key={z}
              onClick={() => setZoneFilter(zoneFilter === z ? '' : z)}
              className={`px-2 py-2 rounded-[8px] text-[12px] font-medium transition-colors ${
                zoneFilter === z
                  ? 'bg-[#09090B] text-white'
                  : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
              }`}>
              <div>Z{z.replace('Zone', '')}</div>
              <div className="text-[10px] opacity-70 mt-0.5 tabular-nums">{zoneCounts[z]}</div>
            </button>
          ))}
        </div>

        {/* 결제상태 + 픽업 */}
        <div className="mt-3 pt-3 border-t border-[#E4E4E7] flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-medium text-[#71717A]">결제</span>
          <button
            onClick={() => setPaymentFilter(paymentFilter === '결제완료' ? '' : '결제완료')}
            className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
              paymentFilter === '결제완료'
                ? 'bg-[#09090B] text-white'
                : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
            }`}>
            완료 <span className="tabular-nums ml-0.5 opacity-70">{orders.filter(o => o.paymentStatus === '결제완료').length}</span>
          </button>
          <button
            onClick={() => setPaymentFilter(paymentFilter === '미결제' ? '' : '미결제')}
            className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
              paymentFilter === '미결제'
                ? 'bg-[#09090B] text-white'
                : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
            }`}>
            미결제 <span className="tabular-nums ml-0.5 opacity-70">{unpaidCount}</span>
          </button>

          <div className="w-px h-5 bg-[#E4E4E7]" />

          <span className="text-[12px] font-medium text-[#71717A]">픽업</span>
          <button
            onClick={() => setPickupFilter(!pickupFilter)}
            className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
              pickupFilter
                ? 'bg-[#09090B] text-white'
                : 'bg-white text-[#52525B] border border-[#E4E4E7] hover:bg-[#F4F4F5]'
            }`}>
            픽업만 <span className="tabular-nums ml-0.5 opacity-70">{orders.filter(o => o.isPickup).length}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-[13px]">
            <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#09090B] cursor-pointer"
                    checked={filtered.length > 0 && filtered.slice(0, displayLimit).every(o => selectedIds.has(o.id))}
                    onChange={() => toggleSelectAll(filtered.slice(0, displayLimit).map(o => o.id))}
                    title="전체 선택"
                  />
                </th>
                <SortHeader label="주문번호" field="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="Zone" field="zone" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="고객" field="customer" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">주문내역</th>
                <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">배송지</th>
                <SortHeader label="출고일" field="shipDate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">배송방법</th>
                <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">결제방식</th>
                <SortHeader label="결제상태" field="payment" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-left px-4 py-3 font-medium text-[#71717A] text-[12px]">메모</th>
                <SortHeader label="상태" field="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-center px-4 py-3 font-medium text-[#71717A] text-[12px]">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(o => {
                const c = customerMap[o.customerId];
                const isServ = !!o.isService;
                return (
                  <tr key={o.id} className={`border-b border-stone-100 hover:bg-stone-50 ${selectedIds.has(o.id) ? 'bg-red-50/50' : isServ ? 'bg-amber-50/40' : o.isPickup ? 'bg-sky-50/40' : ''}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-red-700 cursor-pointer"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                      />
                    </td>                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-red-800">{o.id}</span>
                        {isServ && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500 text-white font-bold">🎁</span>}
                        {o.isPickup && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500 text-white font-bold">📍</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.shippingGroup ? (
                        <div className="space-y-0.5">
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold ${ZONE_COLORS[o.shippingGroup] || 'bg-stone-100 text-stone-600'}`}>
                            {o.shippingGroup.replace('Zone', 'Zone ')}
                          </span>
                          {o.sequence && (
                            <div className="text-[9px] text-stone-500">
                              순번 <span className="font-bold">{o.sequence}</span>
                              {o.arrivalTime && <span className="ml-1 text-blue-600">⏰ {o.arrivalTime}</span>}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-stone-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-stone-800">{c?.name || '-'}</span>
                        {c?.agedCare && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">🏥</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700 text-xs">
                      <div>{o.itemName} × {o.qty}</div>
                      {o.giftQty > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-pink-100 text-pink-800 rounded text-[10px] font-bold border border-pink-300">
                          🎁 {o.giftName || '사은품'} × {o.giftQty}개
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs max-w-[180px] truncate" title={c?.address}>{c?.address || '-'}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      {o.shipDate ? (
                        <div>
                          <div className="text-stone-700 font-medium">{o.shipDate}</div>
                          <div className="text-[10px] text-stone-400">{getDayLabel(o.shipDate)}요일 · {ZONE_DAY_LABEL[o.shippingGroup] || '-'}</div>
                        </div>
                      ) : <span className="text-stone-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.isPickup ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-sky-100 text-sky-700">📍 픽업</span>
                      ) : o.deliveryMethod ? (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          o.deliveryMethod === '대면배송' ? 'bg-blue-50 text-blue-700' :
                          o.deliveryMethod === '비대면배송' ? 'bg-violet-50 text-violet-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>{o.deliveryMethod}</span>
                      ) : <span className="text-stone-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isServ ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700">🎁 무료</span>
                      ) : o.paymentType ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-700">{o.paymentType}</span>
                      ) : <span className="text-stone-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isServ ? (
                        <span className="text-xs text-stone-400">-</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          o.paymentStatus === '결제완료' ? 'bg-emerald-100 text-emerald-700' :
                          o.paymentStatus === '부분결제' ? 'bg-amber-100 text-amber-700' :
                          o.paymentStatus === '미결제' ? 'bg-red-100 text-red-700' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {o.paymentStatus === '결제완료' ? '✓ 결제완료' : o.paymentStatus === '부분결제' ? '🔶 부분결제' : o.paymentStatus === '미결제' ? '✗ 미결제' : '-'}
                          {o.cashReceived > 0 && o.paymentStatus !== '결제완료' && (
                            <span className="ml-1 text-[9px] opacity-80">${o.cashReceived}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs max-w-[160px] truncate" title={o.deliveryMemo}>
                      {o.deliveryMemo || <span className="text-stone-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${shipStatusStyle(o.shipStatus)}`}>{o.shipStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditTarget(o)} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-medium mx-auto block">
                        상태 변경
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-stone-400 text-sm">주문이 없습니다</div>}
          {filtered.length > displayLimit && (
            <div className="px-4 py-4 text-center border-t border-stone-100 bg-stone-50">
              <div className="text-xs text-stone-500 mb-2">
                {displayLimit}건 / {filtered.length}건 표시 중
              </div>
              <button
                onClick={() => setDisplayLimit(displayLimit + 50)}
                className="px-5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-lg text-sm font-medium border border-stone-200"
              >
                다음 50건 더 보기 ↓
              </button>
              <button
                onClick={() => setDisplayLimit(filtered.length)}
                className="ml-2 px-5 py-2 bg-white hover:bg-stone-100 text-stone-600 rounded-lg text-sm font-medium border border-stone-200"
              >
                전체 보기
              </button>
            </div>
          )}
        </div>
      </div>

      {editTarget && (
        <ShippingModal order={editTarget} customer={customerMap[editTarget.customerId]} onSave={handleUpdate} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}

function ShippingModal({ order, customer, onSave, onClose }) {
  const [form, setForm] = useState({
    shipStatus: order.shipStatus,
    deliveryMethod: order.deliveryMethod || '',
    paymentType: order.paymentType || '',
    paymentStatus: order.paymentStatus || '미결제',
    deliveryMemo: order.deliveryMemo || '',
    shipDate: order.shipDate || '',
    shippingGroup: order.shippingGroup || '',
    isPickup: order.isPickup || false
  });

  // 배송 시작일 (Day 1 기준)을 역산
  const startDate = useMemo(() => {
    if (!form.shipDate || !form.shippingGroup) return form.shipDate || '';
    const offset = ZONE_DAY_OFFSET[form.shippingGroup] || 0;
    if (offset === 0) return form.shipDate;
    const d = new Date(form.shipDate);
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  }, [form.shipDate, form.shippingGroup]);

  // Zone 변경 시 출고일 자동 재계산
  const setZone = (newZone) => {
    if (startDate && newZone) {
      const newShipDate = calcShipDateByZone(startDate, newZone);
      setForm({...form, shippingGroup: newZone, shipDate: newShipDate});
    } else {
      setForm({...form, shippingGroup: newZone});
    }
  };

  // 시작일 변경 시 모든 Zone 날짜 재계산
  const setStartDate = (newStart) => {
    if (form.shippingGroup) {
      const newShipDate = calcShipDateByZone(newStart, form.shippingGroup);
      setForm({...form, shipDate: newShipDate});
    } else {
      setForm({...form, shipDate: newStart});
    }
  };

  // 빠른 선택: 오늘/내일/모레
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  const dayAfterStr = (() => { const d = new Date(); d.setDate(d.getDate()+2); return d.toISOString().slice(0,10); })();

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <div className="flex-1 min-w-0">
            <h2 className="font-serif-ko text-lg font-bold text-stone-800 truncate">배송 정보 업데이트</h2>
            <div className="text-xs text-stone-500 mt-0.5 truncate">{order.id} · {customer?.name}고객님</div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button
              onClick={() => onSave({ ...order, ...form })}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all"
            >
              💾 저장
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-600">
            <div>📦 {order.itemName} × {order.qty}</div>
            <div className="mt-1">📍 {customer?.address || '-'}</div>
          </div>

          {/* 🎁 사은품 알림 (크게 강조 - 배송기사 시각 확인) */}
          {order.giftQty > 0 && (
            <div className="p-4 bg-gradient-to-br from-pink-100 to-rose-100 border-2 border-pink-400 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🎁</div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-pink-700 uppercase tracking-wider">사은품 전달 필수!</div>
                  <div className="text-base font-bold text-pink-900 leading-tight mt-0.5">
                    {order.giftName || '사은품'}
                  </div>
                  <div className="text-3xl font-bold text-pink-700 tabular-nums mt-1">
                    {order.giftQty}<span className="text-sm font-normal text-pink-500 ml-1">개 전달</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-pink-200 text-[10px] text-pink-800 font-semibold">
                💡 고객에게 김치와 함께 <strong>{order.giftQty}개</strong>를 꼭 전달해주세요
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">배송상태</label>
            <select value={form.shipStatus} onChange={e => setForm({...form, shipStatus: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100">
              <option>배송준비중</option><option>출고대기</option><option>배송중</option><option>배송완료</option><option>반송</option><option>취소</option>
            </select>
          </div>

          {/* 픽업 체크박스 */}
          <div className="p-3 bg-sky-50 border-2 border-sky-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.isPickup}
                onChange={e => setForm({...form, isPickup: e.target.checked})}
                className="w-5 h-5 accent-sky-600"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-sky-900">📍 픽업 주문</div>
                <div className="text-[10px] text-sky-700">체크 시 배송료 $10 부과되지 않음 · 고객이 직접 방문</div>
              </div>
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">🗺️ 배송 그룹</label>
            <div className="grid grid-cols-6 gap-1.5">
              {SHIPPING_ZONES.map(z => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(form.shippingGroup === z ? '' : z)}
                  className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                    form.shippingGroup === z
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {z.replace('Zone', 'Z')}
                  <div className="text-[9px] font-normal opacity-70 mt-0.5">{ZONE_DAY_LABEL[z]}</div>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-stone-400 mt-1.5">💡 Zone을 선택하면 출고일이 자동 조정됩니다 (Day1~Day3)</div>
          </div>

          {/* 🚚 출고일 - Zone 기반 빠른 선택 */}
          <div className="p-3 bg-gradient-to-br from-red-50 to-amber-50 rounded-xl border border-red-100">
            <label className="block text-xs font-bold text-red-900 mb-2">🚚 배송 시작일 (Day 1 기준)</label>
            <div className="flex gap-1.5 mb-2">
              <button type="button" onClick={() => setStartDate(todayStr)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold border transition-all ${
                  startDate === todayStr ? 'bg-red-700 text-white border-red-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}>
                오늘 {getDayLabel(todayStr)}
              </button>
              <button type="button" onClick={() => setStartDate(tomorrowStr)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold border transition-all ${
                  startDate === tomorrowStr ? 'bg-red-700 text-white border-red-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}>
                내일 {getDayLabel(tomorrowStr)}
              </button>
              <button type="button" onClick={() => setStartDate(dayAfterStr)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold border transition-all ${
                  startDate === dayAfterStr ? 'bg-red-700 text-white border-red-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}>
                모레 {getDayLabel(dayAfterStr)}
              </button>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
            />
            {form.shippingGroup && form.shipDate && (
              <div className="mt-2 p-2 bg-white/80 rounded-lg text-xs flex items-center justify-between">
                <span className="text-stone-600">실제 출고일 ({form.shippingGroup.replace('Zone','Z')})</span>
                <span className="font-bold text-red-800">
                  {form.shipDate} ({getDayLabel(form.shipDate)}) · {ZONE_DAY_LABEL[form.shippingGroup]}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">배송방법</label>
            <div className="flex gap-2">
              {['대면배송', '비대면배송', '미배송'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({...form, deliveryMethod: form.deliveryMethod === m ? '' : m})}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.deliveryMethod === m
                      ? 'bg-red-800 text-white border-red-800'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">💳 결제방식</label>
            <div className="flex gap-2">
              {['KA', '현금', '계좌'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({...form, paymentType: form.paymentType === p ? '' : p})}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.paymentType === p
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">✅ 결제상태</label>
            <div className="flex gap-2">
              {['결제완료', '미결제'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({...form, paymentStatus: s})}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                    form.paymentStatus === s
                      ? (s === '결제완료' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-red-100 text-red-700 border-red-300')
                      : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {s === '결제완료' ? '✓ 결제완료' : '✗ 미결제'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">배송메모</label>
            <textarea
              value={form.deliveryMemo}
              onChange={e => setForm({...form, deliveryMemo: e.target.value})}
              placeholder="예: 문앞에 놓아주세요, 경비실 맡겨주세요 등"
              rows={2}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 resize-none"
            />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button onClick={() => onSave({ ...order, ...form })}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 active:scale-95 transition-all">
            💾 저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🚚 DriversManagement - 관리자용 배송기사 계정 관리
// ============================================================
// ============================================================
// 🎁 사은품 이벤트 관리 탭
// ============================================================
function Gifts({ gifts, setGifts, orders, setOrders, customers, items, showToast, setView }) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(null); // 소급 적용 확인

  // 각 이벤트별 지급 현황 계산 (공통 함수 사용)
  const giftStats = useMemo(() => {
    return gifts.map(g => {
      const { givenQty, recipientCount, reservedQty, reservedCount, totalUsed, totalRecipients, remaining } = calcGiftStats(g, orders);
      return {
        ...g,
        givenQty,
        recipientCount,
        reservedQty,
        reservedCount,
        totalUsed,
        totalRecipients,
        remaining,
      };
    });
  }, [gifts, orders]);

  const activeGifts = giftStats.filter(g => g.active);
  const inactiveGifts = giftStats.filter(g => !g.active);

  // 🎁 기존 주문에 사은품 소급 적용 계산 (미리보기)
  const calcRetroactiveApply = (gift) => {
    if (!gift || !gift.active) return null;
    const tiers = gift.tiers || DEFAULT_GIFT_TIERS;
    const priceMap = {};
    items.forEach(i => { priceMap[i.name] = i.price || 0; });

    // 고객별 총 주문액 계산 (취소/서비스 제외)
    const customerTotals = {};
    orders.forEach(o => {
      if (o.shipStatus === '취소' || o.isService) return;
      const total = (priceMap[o.itemName] || 0) * o.qty;
      customerTotals[o.customerId] = (customerTotals[o.customerId] || 0) + total;
    });

    // 각 고객별 받아야 할 사은품 수량
    const toApply = [];
    Object.entries(customerTotals).forEach(([cid, total]) => {
      const targetQty = calcGiftQtyByAmount(total, tiers);
      if (targetQty === 0) return;

      // 해당 고객의 이 사은품 이벤트 주문들
      const customerGiftOrders = orders.filter(o =>
        o.customerId === cid &&
        o.shipStatus !== '취소' &&
        !o.isService
      );

      // 이미 지급된 수량 (이 이벤트)
      const alreadyGiven = customerGiftOrders
        .filter(o => o.giftId === gift.id)
        .reduce((s, o) => s + (o.giftQty || 0), 0);

      // 부족한 수량만큼 추가
      const needMore = targetQty - alreadyGiven;
      if (needMore > 0 && customerGiftOrders.length > 0) {
        // 가장 최근 주문 하나에 추가
        const targetOrder = customerGiftOrders[customerGiftOrders.length - 1];
        toApply.push({
          orderId: targetOrder.id,
          customerId: cid,
          customerName: customers.find(c => c.id === cid)?.name || cid,
          customerTotal: total,
          currentQty: alreadyGiven,
          targetQty,
          addQty: needMore,
        });
      }
    });

    return toApply;
  };

  // 🎁 사은품 소급 적용 실행
  const handleRetroactiveApply = (gift) => {
    if (!setOrders) {
      showToast('주문 데이터 수정 권한이 없습니다', 'error');
      return;
    }

    const toApply = calcRetroactiveApply(gift);
    if (!toApply || toApply.length === 0) {
      showToast('추가로 지급할 대상이 없습니다');
      return;
    }

    // 재고 체크
    const totalNeeded = toApply.reduce((s, t) => s + t.addQty, 0);
    if (totalNeeded > gift.remaining) {
      showToast(`재고 부족! 필요: ${totalNeeded}개, 남음: ${gift.remaining}개`, 'error');
      return;
    }

    // 주문 업데이트
    const updateMap = {};
    toApply.forEach(t => {
      updateMap[t.orderId] = { addQty: t.addQty, giftId: gift.id, giftName: gift.name };
    });

    setOrders(prevOrders => prevOrders.map(o => {
      const update = updateMap[o.id];
      if (!update) return o;
      return {
        ...o,
        giftId: update.giftId,
        giftName: update.giftName,
        giftQty: (o.giftQty || 0) + update.addQty,
      };
    }));

    showToast(`✨ ${toApply.length}개 주문에 사은품 ${totalNeeded}개 소급 적용!`);
    setShowApplyConfirm(null);
  };

  const handleSave = (gift) => {
    if (editTarget) {
      setGifts(gifts.map(g => g.id === editTarget.id ? { ...gift, id: editTarget.id } : g));
      showToast('사은품 이벤트가 수정되었습니다');
    } else {
      const newId = `GIFT-${Date.now()}`;
      // 새 이벤트가 활성이면 기존 활성은 자동 비활성화 (1개만 활성)
      let updatedGifts = [...gifts];
      if (gift.active) {
        updatedGifts = updatedGifts.map(g => ({ ...g, active: false }));
      }
      setGifts([...updatedGifts, { ...gift, id: newId, createdAt: new Date().toISOString() }]);
      showToast('✨ 새 사은품 이벤트가 등록되었습니다');
    }
    setShowForm(false);
    setEditTarget(null);
  };

  const handleToggleActive = (id) => {
    const target = gifts.find(g => g.id === id);
    if (!target) return;
    // 활성화하면 다른 이벤트는 자동 비활성화
    if (!target.active) {
      setGifts(gifts.map(g => ({ ...g, active: g.id === id })));
      showToast('✅ 활성 이벤트로 전환되었습니다');
    } else {
      setGifts(gifts.map(g => g.id === id ? { ...g, active: false } : g));
      showToast('이벤트가 종료되었습니다');
    }
  };

  const handleDelete = (id) => {
    if (!confirm('이 이벤트를 삭제할까요? 지급 기록은 유지됩니다.')) return;
    setGifts(gifts.filter(g => g.id !== id));
    showToast('삭제되었습니다');
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500">새 상품 입고 시 사은품 이벤트를 등록하고 자동 지급 기준을 설정하세요</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-semibold shadow-sm"
        >
          <Plus size={16} />
          새 이벤트 등록
        </button>
      </div>

      {/* 🟢 활성 이벤트 */}
      {activeGifts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">진행 중</span>
            </div>
            {/* 🎁 소급 적용 버튼 */}
            {activeGifts.length > 0 && (
              <button
                onClick={() => setShowApplyConfirm(activeGifts[0])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold border border-amber-300 transition-all"
                title="기존 $100+ 주문에 사은품 자동 지급"
              >
                <span>⚡</span>
                <span>기존 주문에 소급 적용</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {activeGifts.map(g => {
              // 🛡️ 계산 필드 제거 (저장 시 Supabase 스키마와 충돌 방지)
              const { givenQty, recipientCount, reservedQty, reservedCount, totalUsed, totalRecipients, remaining, ...giftBase } = g;
              return (
                <GiftCard
                  key={g.id}
                  gift={g}
                  onEdit={() => { setEditTarget(giftBase); setShowForm(true); }}
                  onToggle={() => handleToggleActive(g.id)}
                  onDelete={() => handleDelete(g.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 🎁 소급 적용 확인 모달 */}
      {showApplyConfirm && (() => {
        const toApply = calcRetroactiveApply(showApplyConfirm);
        const totalNeeded = toApply ? toApply.reduce((s, t) => s + t.addQty, 0) : 0;
        const canApply = toApply && toApply.length > 0 && totalNeeded <= showApplyConfirm.remaining;

        return (
          <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowApplyConfirm(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h2 className="font-serif-ko text-lg font-bold text-stone-800">⚡ 사은품 소급 적용</h2>
                  <p className="text-xs text-stone-500 mt-0.5">{showApplyConfirm.name}</p>
                </div>
                <button onClick={() => setShowApplyConfirm(null)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="text-xs font-bold text-indigo-900 mb-1">📋 자동 지급 기준</div>
                  {(showApplyConfirm.tiers || DEFAULT_GIFT_TIERS).sort((a, b) => a.minAmount - b.minAmount).map((t, i) => (
                    <div key={i} className="text-xs text-indigo-800">${t.minAmount} 이상 → {t.qty}개</div>
                  ))}
                </div>

                {toApply && toApply.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl">
                        <div className="text-[10px] text-pink-700 mb-0.5">대상 주문</div>
                        <div className="text-xl font-bold text-pink-900 tabular-nums">{toApply.length}<span className="text-xs font-normal ml-0.5">건</span></div>
                      </div>
                      <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl">
                        <div className="text-[10px] text-pink-700 mb-0.5">지급 수량</div>
                        <div className="text-xl font-bold text-pink-900 tabular-nums">{totalNeeded}<span className="text-xs font-normal ml-0.5">개</span></div>
                      </div>
                      <div className={`p-3 rounded-xl border ${canApply ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className={`text-[10px] mb-0.5 ${canApply ? 'text-emerald-700' : 'text-red-700'}`}>재고 상태</div>
                        <div className={`text-xl font-bold tabular-nums ${canApply ? 'text-emerald-900' : 'text-red-900'}`}>
                          {showApplyConfirm.remaining}<span className="text-xs font-normal ml-0.5">개</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-stone-200 rounded-xl overflow-hidden">
                      <div className="bg-stone-50 px-3 py-2 border-b border-stone-200">
                        <div className="text-xs font-bold text-stone-700">적용 대상 목록 ({toApply.length}건)</div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-stone-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-semibold text-stone-600">고객</th>
                              <th className="px-3 py-1.5 text-right font-semibold text-stone-600">총 주문액</th>
                              <th className="px-3 py-1.5 text-center font-semibold text-stone-600">기존</th>
                              <th className="px-3 py-1.5 text-center font-semibold text-stone-600">→ 목표</th>
                              <th className="px-3 py-1.5 text-right font-semibold text-pink-700">추가</th>
                            </tr>
                          </thead>
                          <tbody>
                            {toApply.slice(0, 100).map((t, i) => (
                              <tr key={i} className="border-t border-stone-100 hover:bg-pink-50/30">
                                <td className="px-3 py-1.5 font-medium truncate max-w-[160px]">{t.customerName}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-stone-600">{formatWon(t.customerTotal)}</td>
                                <td className="px-3 py-1.5 text-center tabular-nums text-stone-400">{t.currentQty}</td>
                                <td className="px-3 py-1.5 text-center tabular-nums font-semibold">{t.targetQty}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums font-bold text-pink-700">+{t.addQty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {toApply.length > 100 && (
                          <div className="text-center text-xs text-stone-500 py-2">... 외 {toApply.length - 100}건</div>
                        )}
                      </div>
                    </div>

                    {!canApply && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-semibold">
                        ⚠️ 재고 부족! {totalNeeded}개 필요한데 {showApplyConfirm.remaining}개만 남음
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-sm font-bold text-stone-700">모든 주문에 사은품이 이미 지급되었습니다</div>
                    <div className="text-xs text-stone-500 mt-1">추가로 지급할 대상이 없습니다</div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
                <button onClick={() => setShowApplyConfirm(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
                {toApply && toApply.length > 0 && (
                  <button
                    onClick={() => handleRetroactiveApply(showApplyConfirm)}
                    disabled={!canApply}
                    className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-bold active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
                  >
                    ⚡ {toApply.length}건에 적용하기
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 빈 상태 */}
      {gifts.length === 0 && (
        <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-3">🎁</div>
          <div className="text-lg font-bold text-stone-800 mb-2">아직 사은품 이벤트가 없습니다</div>
          <div className="text-sm text-stone-500 mb-5 max-w-md mx-auto">
            새 상품을 수입할 때마다 사은품 이벤트를 등록하세요.<br/>
            주문 등록 시 자동으로 계산되어 표시됩니다.
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            🎁 첫 이벤트 등록하기
          </button>
        </div>
      )}

      {/* 종료된 이벤트 */}
      {inactiveGifts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 mt-6">
            <span className="w-2 h-2 rounded-full bg-stone-400"></span>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">종료된 이벤트 ({inactiveGifts.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {inactiveGifts.map(g => {
              // 🛡️ 계산 필드 제거 (저장 시 Supabase 스키마와 충돌 방지)
              const { givenQty, recipientCount, reservedQty, reservedCount, totalUsed, totalRecipients, remaining, ...giftBase } = g;
              return (
                <GiftCard
                  key={g.id}
                  gift={g}
                  onEdit={() => { setEditTarget(giftBase); setShowForm(true); }}
                  onToggle={() => handleToggleActive(g.id)}
                  onDelete={() => handleDelete(g.id)}
                  inactive
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 폼 모달 */}
      {showForm && (
        <GiftFormModal
          editTarget={editTarget}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

// ============================================================
// 🎁 사은품 카드
// ============================================================
function GiftCard({ gift, onEdit, onToggle, onDelete, inactive }) {
  const pct = gift.totalStock > 0 ? ((gift.totalUsed || gift.givenQty) / gift.totalStock) * 100 : 0;

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 transition-all ${
      inactive ? 'border-stone-200 opacity-70' : 'border-emerald-200 shadow-sm hover:shadow-md'
    }`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎁</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              inactive ? 'bg-stone-100 text-stone-500' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {inactive ? '종료됨' : '진행 중'}
            </span>
          </div>
          <h3 className="font-bold text-stone-800 text-base leading-tight truncate">
            {gift.name}
          </h3>
          {gift.description && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{gift.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onToggle}
            className={`px-2 py-1 rounded text-[10px] font-bold ${
              inactive
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
            title={inactive ? '활성화' : '종료'}
          >
            {inactive ? '활성화' : '종료'}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-stone-500 hover:bg-stone-100 rounded"
            title="수정"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700 rounded"
            title="삭제"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 재고 상황 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-stone-600">재고 사용 현황</span>
          <span className="text-xs font-bold text-stone-800">
            <span className="text-red-800">{gift.totalUsed || gift.givenQty}</span>
            <span className="text-stone-400"> / {gift.totalStock}개</span>
          </span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 90 ? 'bg-red-500' :
              pct >= 70 ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-stone-500">남은 수량</span>
          <span className={`text-xs font-bold tabular-nums ${
            gift.remaining === 0 ? 'text-red-700' :
            gift.remaining <= 50 ? 'text-amber-700' :
            'text-emerald-700'
          }`}>
            {gift.remaining}개 {pct.toFixed(0)}% 사용
          </span>
        </div>

        {/* 🆕 예약 수량 표시 (있을 때만) */}
        {gift.reservedQty > 0 && (
          <div className="mt-2 pt-2 border-t border-stone-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">✓ 지급 완료</span>
              <span className="font-semibold text-stone-800 tabular-nums">{gift.givenQty}개</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-700">⏳ 예약</span>
              <span className="font-semibold text-amber-700 tabular-nums">{gift.reservedQty}개</span>
            </div>
          </div>
        )}
      </div>

      {/* 지급 기준 */}
      <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
        <div className="text-[10px] font-bold text-indigo-700 mb-1.5">📋 자동 지급 기준</div>
        <div className="space-y-1">
          {(gift.tiers || DEFAULT_GIFT_TIERS).sort((a, b) => a.minAmount - b.minAmount).map((tier, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-indigo-900">${tier.minAmount} 이상 주문 시</span>
              <span className="font-bold text-indigo-800">{tier.qty}개</span>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-100">
        <div>
          <div className="text-[10px] text-stone-400 uppercase tracking-wider">지급 완료</div>
          <div className="text-lg font-bold text-stone-800 tabular-nums">
            {gift.recipientCount}<span className="text-[10px] font-normal text-stone-400 ml-0.5">명</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-stone-400 uppercase tracking-wider">총 지급</div>
          <div className="text-lg font-bold text-stone-800 tabular-nums">
            {gift.givenQty}<span className="text-[10px] font-normal text-stone-400 ml-0.5">개</span>
          </div>
        </div>
      </div>

      {/* 기간 */}
      {(gift.startDate || gift.endDate) && (
        <div className="mt-3 pt-3 border-t border-stone-100 text-[10px] text-stone-500">
          📅 {gift.startDate || '-'} ~ {gift.endDate || '-'}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🎁 사은품 등록/수정 폼
// ============================================================
function GiftFormModal({ editTarget, onSave, onClose }) {
  const [form, setForm] = useState(editTarget || {
    name: '',
    description: '',
    totalStock: 0,
    tiers: [{ minAmount: 100, qty: 1 }],
    active: true,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });

  const addTier = () => {
    setForm({
      ...form,
      tiers: [...form.tiers, { minAmount: 0, qty: 1 }]
    });
  };

  const removeTier = (idx) => {
    setForm({
      ...form,
      tiers: form.tiers.filter((_, i) => i !== idx)
    });
  };

  const updateTier = (idx, key, value) => {
    const next = [...form.tiers];
    next[idx] = { ...next[idx], [key]: Number(value) || 0 };
    setForm({ ...form, tiers: next });
  };

  const canSubmit = form.name && form.totalStock > 0 && form.tiers.length > 0 &&
    form.tiers.every(t => t.minAmount > 0 && t.qty > 0);

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">
              🎁 {editTarget ? '사은품 이벤트 수정' : '새 사은품 이벤트'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canSubmit && onSave(form)}
              disabled={!canSubmit}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-bold shadow-sm disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              💾 저장
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* 사은품 이름 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">사은품 이름 *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="예: 프리미엄 김 1봉 / 제주 감귤 500g"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">설명 (선택)</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="예: 한국산 김 · 수량 한정"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* 총 수량 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">총 수량 *</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={form.totalStock}
                onChange={e => setForm({ ...form, totalStock: Number(e.target.value) || 0 })}
                placeholder="900"
                className="w-full px-3 py-2 pr-12 border border-stone-200 rounded-lg text-lg font-bold focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">개</span>
            </div>
            <div className="mt-2 text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
              💡 <strong>입고대기</strong> 상태 주문의 사은품은 자동으로 <strong className="text-amber-700">예약 수량</strong>으로 집계되어 재고에서 미리 차감됩니다
            </div>
          </div>

          {/* 지급 기준 */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-bold text-indigo-900">📋 자동 지급 기준</div>
                <div className="text-[10px] text-indigo-700 mt-0.5">주문 합계 기준으로 자동 계산됩니다</div>
              </div>
              <button
                onClick={addTier}
                type="button"
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
              >
                + 기준 추가
              </button>
            </div>

            <div className="space-y-2">
              {form.tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                  <span className="text-xs text-stone-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={tier.minAmount}
                    onChange={e => updateTier(idx, 'minAmount', e.target.value)}
                    className="w-20 px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:border-indigo-700 tabular-nums text-right"
                  />
                  <span className="text-xs text-stone-600">이상 주문 시</span>
                  <input
                    type="number"
                    min="1"
                    value={tier.qty}
                    onChange={e => updateTier(idx, 'qty', e.target.value)}
                    className="w-14 px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:border-indigo-700 tabular-nums text-right"
                  />
                  <span className="text-xs text-stone-600">개 지급</span>
                  {form.tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(idx)}
                      type="button"
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 text-[10px] text-indigo-600 italic">
              💡 예: $100 이상 → 1개, $200 이상 → 2개, $300 이상 → 3개
            </div>
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">시작일 (선택)</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">종료일 (선택)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700"
              />
            </div>
          </div>

          {/* 활성 상태 */}
          <label className="flex items-center gap-3 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 transition-all">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              className="w-5 h-5 accent-emerald-600"
            />
            <div>
              <div className="text-sm font-bold text-emerald-900">🟢 지금 활성화</div>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                체크 시 주문 등록에서 자동 적용됩니다. (한 번에 하나의 이벤트만 활성 가능)
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📋 변경 이력 (Audit Log) 페이지
// ═══════════════════════════════════════════════════════════
function AuditLog({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('week');  // today/week/month/all
  const [limit, setLimit] = useState(100);

  // 이력 불러오기
  const loadLogs = async () => {
    setLoading(true);
    try {
      const options = { limit: 500 };  // 충분히 많이 가져오기
      // 기간 필터
      const now = new Date();
      if (periodFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        options.fromDate = today.toISOString();
      } else if (periodFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        options.fromDate = weekAgo.toISOString();
      } else if (periodFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        options.fromDate = monthAgo.toISOString();
      }
      const data = await fetchAuditLogs(options);
      setLogs(data);
    } catch (err) {
      console.error('이력 로드 실패:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [periodFilter]);

  // 필터링
  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (userFilter !== 'all' && log.user_name !== userFilter) return false;
      if (typeFilter !== 'all' && log.entity_type !== typeFilter) return false;
      return true;
    }).slice(0, limit);
  }, [logs, userFilter, typeFilter, limit]);

  // 고유 사용자 목록
  const uniqueUsers = useMemo(() => {
    return [...new Set(logs.map(l => l.user_name))].filter(Boolean);
  }, [logs]);

  // 날짜별 그룹핑
  const groupedByDate = useMemo(() => {
    const groups = {};
    filtered.forEach(log => {
      const date = new Date(log.timestamp);
      const dateKey = date.toISOString().slice(0, 10);  // YYYY-MM-DD
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    // 배열로 변환 (최신순)
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  // 날짜 포맷
  const formatDateHeader = (dateKey) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateKey === today) return '오늘';
    if (dateKey === yesterday) return '어제';
    const d = new Date(dateKey);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  // 시간 포맷
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 액션별 아이콘 + 색상
  const getActionStyle = (action) => {
    switch (action) {
      case 'create': return { icon: '➕', color: 'text-[#15803D]', bg: 'bg-[#F0FDF4]', border: 'border-[#BBF7D0]', label: '생성' };
      case 'update': return { icon: '✏️', color: 'text-[#1D4ED8]', bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]', label: '수정' };
      case 'delete': return { icon: '🗑️', color: 'text-[#B91C1C]', bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', label: '삭제' };
      case 'bulk': return { icon: '📦', color: 'text-[#B45309]', bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', label: '대량' };
      default: return { icon: '•', color: 'text-[#52525B]', bg: 'bg-[#F4F4F5]', border: 'border-[#E4E4E7]', label: '변경' };
    }
  };

  // 엔티티 타입 한글
  const getEntityLabel = (type) => {
    const map = { customer: '고객', order: '주문', item: '품목', driver: '기사', gift: '사은품' };
    return map[type] || type;
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="bg-white rounded-[12px] border border-[#E4E4E7] p-12 text-center">
        <CloudOff size={40} className="mx-auto text-[#D4D4D8] mb-3" />
        <div className="text-[14px] text-[#71717A]">클라우드 연결이 필요합니다</div>
        <div className="text-[12px] text-[#A1A1AA] mt-1">Supabase가 연결되어야 변경 이력을 볼 수 있습니다</div>
      </div>
    );
  }

  return (
    <div>
      {/* 필터 바 */}
      <div className="bg-white rounded-[12px] border border-[#E4E4E7] p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="text-[12px] font-semibold text-[#52525B]">필터</div>

        {/* 기간 */}
        <div className="flex items-center gap-1 bg-[#FAFAFA] border border-[#E4E4E7] rounded-[8px] p-0.5">
          {[
            { id: 'today', label: '오늘' },
            { id: 'week', label: '최근 7일' },
            { id: 'month', label: '최근 30일' },
            { id: 'all', label: '전체' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id)}
              className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                periodFilter === p.id ? 'bg-[#09090B] text-white' : 'text-[#71717A] hover:bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 작성자 */}
        <select
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[8px] text-[12px] font-medium text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#09090B]/20 cursor-pointer"
        >
          <option value="all">전체 작성자</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* 유형 */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[8px] text-[12px] font-medium text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#09090B]/20 cursor-pointer"
        >
          <option value="all">전체 유형</option>
          <option value="order">주문</option>
          <option value="customer">고객</option>
          <option value="item">품목</option>
          <option value="driver">기사</option>
          <option value="gift">사은품</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-[12px] text-[#71717A]">
            총 <span className="font-semibold text-[#09090B] tabular-nums">{filtered.length}</span>건
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] rounded-[8px] text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="bg-white rounded-[12px] border border-[#E4E4E7] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-[#71717A] mb-2" />
            <div className="text-[13px] text-[#71717A]">불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History size={40} className="mx-auto text-[#D4D4D8] mb-3" />
            <div className="text-[14px] text-[#71717A]">기록된 변경 이력이 없습니다</div>
            <div className="text-[12px] text-[#A1A1AA] mt-1">주문/고객/품목을 수정하면 자동으로 기록됩니다</div>
          </div>
        ) : (
          <div className="divide-y divide-[#F4F4F5]">
            {groupedByDate.map(([dateKey, items]) => (
              <div key={dateKey}>
                {/* 날짜 헤더 */}
                <div className="sticky top-0 px-6 py-2 bg-[#FAFAFA] border-b border-[#E4E4E7] z-10">
                  <div className="text-[12px] font-semibold text-[#52525B]">
                    📅 {formatDateHeader(dateKey)}
                    <span className="ml-2 text-[#A1A1AA] font-normal tabular-nums">{items.length}건</span>
                  </div>
                </div>

                {/* 이벤트 리스트 */}
                <div className="divide-y divide-[#F4F4F5]">
                  {items.map(log => {
                    const style = getActionStyle(log.action);
                    return (
                      <div key={log.id} className="px-6 py-3 hover:bg-[#FAFAFA] transition-colors">
                        <div className="flex items-start gap-3">
                          {/* 시간 */}
                          <div className="w-12 shrink-0 text-[12px] text-[#71717A] font-mono tabular-nums mt-0.5">
                            {formatTime(log.timestamp)}
                          </div>

                          {/* 사용자 */}
                          <div className="w-20 shrink-0 mt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#09090B] text-white rounded-[5px] text-[11px] font-medium">
                              {log.user_name}
                            </span>
                          </div>

                          {/* 액션 배지 */}
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 ${style.bg} ${style.border} border rounded-[5px] text-[11px] font-medium ${style.color} shrink-0 mt-0.5`}>
                            {style.icon} {getEntityLabel(log.entity_type)} {style.label}
                          </div>

                          {/* 설명 */}
                          <div className="flex-1 text-[13px] text-[#09090B] leading-relaxed">
                            {log.entity_name && (
                              <span className="font-medium">{log.entity_name}</span>
                            )}
                            {log.entity_name && log.description && <span className="text-[#A1A1AA]"> · </span>}
                            <span className="text-[#52525B]">{log.description}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 더 보기 */}
            {logs.length > limit && (
              <div className="px-6 py-4 bg-[#FAFAFA] text-center border-t border-[#E4E4E7]">
                <button
                  onClick={() => setLimit(limit + 100)}
                  className="px-4 py-2 bg-white hover:bg-[#FAFAFA] border border-[#E4E4E7] text-[#52525B] rounded-[8px] text-[12px] font-medium transition-colors"
                >
                  더 보기 ({logs.length - limit}건 더 있음)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 안내 */}
      <div className="mt-4 p-3 bg-[#F0F9FF] border border-[#BFDBFE] rounded-[8px] text-[12px] text-[#1E40AF] leading-relaxed">
        💡 변경 이력은 Supabase에 저장되어 다른 PC에서도 확인할 수 있습니다. 주문/고객/품목/기사/사은품의 생성·수정·삭제가 자동으로 기록됩니다.
      </div>
    </div>
  );
}

function DriversManagement({ drivers, setDrivers, orders, showToast }) {
  const [editTarget, setEditTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 기사별 담당 주문 개수 집계
  const driverStats = useMemo(() => {
    const stats = {};
    drivers.forEach(d => {
      const zoneOrders = orders.filter(o => d.zones.includes(o.shippingGroup));
      const pending = zoneOrders.filter(o => o.shipStatus !== '배송완료' && o.shipStatus !== '취소').length;
      const completed = zoneOrders.filter(o => o.shipStatus === '배송완료').length;
      stats[d.id] = { total: zoneOrders.length, pending, completed };
    });
    return stats;
  }, [drivers, orders]);

  const nextDriverId = () => {
    const nums = drivers.map(d => parseInt(d.id.replace('D',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'D' + String(max + 1).padStart(3, '0');
  };

  const handleSave = (driver) => {
    if (editTarget) {
      setDrivers(drivers.map(d => d.id === editTarget.id ? { ...driver, id: editTarget.id } : d));
      showToast('기사 정보가 수정되었습니다');
    } else {
      // 중복 비밀번호 체크
      if (drivers.some(d => d.password === driver.password)) {
        showToast('이미 사용중인 비밀번호입니다', 'error');
        return;
      }
      setDrivers([...drivers, { ...driver, id: nextDriverId() }]);
      showToast('기사가 추가되었습니다');
    }
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm('정말 이 기사 계정을 삭제하시겠습니까?')) return;
    setDrivers(drivers.filter(d => d.id !== id));
    showToast('기사 계정이 삭제되었습니다');
  };

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚚</span>
          <div>
            <div className="font-bold text-sky-900 text-sm">배송기사 계정 관리</div>
            <div className="text-xs text-sky-700 mt-1">
              기사에게 비밀번호를 전달하면, 로그인 화면에서 해당 비밀번호 입력 시 자동으로 기사 전용 모바일 화면으로 진입합니다.<br/>
              기사는 <span className="font-bold">담당 Zone의 배송 목록만</span> 볼 수 있고, 배송 상태를 업데이트할 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-stone-500">
          총 <span className="font-bold text-stone-800">{drivers.length}</span>명의 기사
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-700 text-white rounded-lg text-sm font-semibold hover:bg-sky-800 shadow-sm"
        >
          <Plus size={16} /> 기사 추가
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {drivers.map(d => {
          const stat = driverStats[d.id] || { total: 0, pending: 0, completed: 0 };
          return (
            <div key={d.id} className="bg-white rounded-2xl border-2 border-stone-200 p-5 hover:border-sky-300 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white text-xl">🚚</div>
                  <div>
                    <div className="font-bold text-lg text-stone-800">{d.name}</div>
                    <div className="text-xs text-stone-500 font-mono">{d.id}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditTarget(d); setShowForm(true); }}
                    className="p-1.5 text-stone-500 hover:bg-stone-100 rounded" title="수정">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(d.id)}
                    className="p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700 rounded" title="삭제">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="p-2 bg-stone-50 rounded-lg">
                  <div className="text-[10px] text-stone-500 font-medium">총 배송</div>
                  <div className="text-lg font-bold text-stone-800">{stat.total}</div>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <div className="text-[10px] text-amber-700 font-medium">대기</div>
                  <div className="text-lg font-bold text-amber-800">{stat.pending}</div>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <div className="text-[10px] text-emerald-700 font-medium">완료</div>
                  <div className="text-lg font-bold text-emerald-800">{stat.completed}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-stone-500 font-semibold mb-1">🗺️ 담당 Zone</div>
                  <div className="flex flex-wrap gap-1">
                    {d.zones.length > 0 ? d.zones.map(z => (
                      <span key={z} className={`text-[11px] px-2 py-0.5 rounded font-bold ${ZONE_COLORS[z] || 'bg-stone-100 text-stone-600'}`}>
                        {z.replace('Zone', 'Z')}
                      </span>
                    )) : <span className="text-[10px] text-stone-400">미지정</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-100">
                  <span className="text-stone-500">🔑 비밀번호</span>
                  <span className="font-mono font-bold text-sky-700">{d.password}</span>
                </div>
                {d.phone && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">📞 연락처</span>
                    <span className="font-mono text-stone-700">{d.phone}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <DriverFormModal
          editTarget={editTarget}
          drivers={drivers}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

function DriverFormModal({ editTarget, drivers, onSave, onClose }) {
  const [form, setForm] = useState(editTarget || {
    name: '', password: '', phone: '', zones: []
  });

  const toggleZone = (z) => {
    const zones = form.zones.includes(z)
      ? form.zones.filter(x => x !== z)
      : [...form.zones, z];
    setForm({...form, zones});
  };

  const canSubmit = form.name && form.password && form.password.length >= 4;

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-serif-ko text-xl font-bold text-stone-800">
            {editTarget ? '🚚 기사 정보 수정' : '🚚 새 기사 추가'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">기사명 *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="예: 김기사"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              로그인 비밀번호 * <span className="text-stone-400 font-normal">(4자 이상)</span>
            </label>
            <input value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              placeholder="예: driver01"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono focus:outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
            <div className="text-[10px] text-stone-400 mt-1">⚠️ 이 비밀번호로 기사가 로그인합니다. 관리자 비밀번호와 달라야 합니다.</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">연락처 (선택)</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="예: 0400 123 456"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              🗺️ 담당 Zone <span className="text-stone-400 font-normal">({form.zones.length}개 선택됨)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SHIPPING_ZONES.map(z => (
                <button
                  key={z}
                  type="button"
                  onClick={() => toggleZone(z)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${
                    form.zones.includes(z)
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : `border-stone-200 ${ZONE_COLORS[z]} hover:opacity-80`
                  }`}
                >
                  {z.replace('Zone', 'Z')}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-stone-400 mt-1">💡 여러 Zone 선택 가능 · 선택한 Zone의 배송만 이 기사에게 보입니다</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button
            onClick={() => canSubmit && onSave(form)}
            disabled={!canSubmit}
            className="px-5 py-2 bg-sky-700 text-white rounded-lg text-sm font-semibold hover:bg-sky-800 disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {editTarget ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 📱 DriverApp - 배송기사 모바일 전용 앱 (Today View)
// ============================================================
function DriverApp({ driver, customers, items, orders, setOrders, onLogout, showToast, toast }) {
  const [tab, setTab] = useState('today'); // today | all | profile
  const [editTarget, setEditTarget] = useState(null);
  const [cashTarget, setCashTarget] = useState(null); // 수금 입력 모달 대상

  // 고객 맵 + 가격 맵
  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  const priceMap = useMemo(() => {
    const map = {};
    items.forEach(i => { map[i.name] = i.price || 0; });
    return map;
  }, [items]);

  // 내 담당 Zone 주문만 필터링
  const myOrders = useMemo(() => {
    if (!driver?.zones) return [];
    return orders.filter(o => driver.zones.includes(o.shippingGroup));
  }, [orders, driver]);

  // 🔑 배송 그룹핑: 같은 고객의 주문들을 하나로 묶기
  const groupOrdersByCustomer = (orderList) => {
    const groups = {};
    orderList.forEach(o => {
      if (!groups[o.customerId]) {
        groups[o.customerId] = {
          customerId: o.customerId,
          orders: [],
          // 대표값 (첫 주문 기준)
          shippingGroup: o.shippingGroup,
          sequence: o.sequence || 999,
          arrivalTime: o.arrivalTime || '',
          shipDate: o.shipDate || '',
          shipStatus: o.shipStatus,
          deliveryMethod: o.deliveryMethod || '',
          paymentType: o.paymentType || '',
          paymentStatus: o.paymentStatus || '미결제',
          deliveryMemo: o.deliveryMemo || '',
          isPickup: o.isPickup || false,
          hasService: false,
          totalAmount: 0,
          totalPaid: 0,
        };
      }
      groups[o.customerId].orders.push(o);
      if (o.isService) groups[o.customerId].hasService = true;
      if (!o.isService) {
        groups[o.customerId].totalAmount += (priceMap[o.itemName] || 0) * o.qty;
      }
      // 수금액 합산 (cashReceived 필드)
      groups[o.customerId].totalPaid += (o.cashReceived || 0);
      // 💰 선결제 정보 (배송 전 결제 완료된 주문이 있는지)
      if (o.paymentStatus === 'paid') {
        if (!groups[o.customerId].prepaidInfo) {
          groups[o.customerId].prepaidInfo = {
            method: o.paymentMethod || 'transfer',
            amount: 0,
          };
        }
        // 선결제된 주문의 금액 합산
        if (!o.isService) {
          groups[o.customerId].prepaidInfo.amount += (priceMap[o.itemName] || 0) * o.qty;
        }
      }
      // 배송 상태는 "가장 진행 안 된" 것 기준 (대기 > 배송중 > 완료)
      const statusOrder = { '취소': 0, '배송완료': 1, '배송중': 2, '출고대기': 3, '배송준비중': 4, '반송': 5 };
      if ((statusOrder[o.shipStatus] || 4) > (statusOrder[groups[o.customerId].shipStatus] || 4)) {
        groups[o.customerId].shipStatus = o.shipStatus;
      }
    });

    // 배송료 계산 (고객 기준)
    Object.values(groups).forEach(g => {
      const customerTotal = orders
        .filter(o => o.customerId === g.customerId && !o.isService)
        .reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);
      const hasPickupOnly = g.orders.every(o => o.isPickup);
      const needsShipping = !hasPickupOnly && customerTotal < SHIPPING_THRESHOLD;
      g.shippingFee = needsShipping ? SHIPPING_FEE : 0;
      g.finalTotal = g.totalAmount + g.shippingFee;
      // 💰 선결제 금액을 totalPaid에 자동 합산 (기사가 받을 필요 없음)
      if (g.prepaidInfo) {
        g.totalPaid += g.prepaidInfo.amount;
        // 선결제 시 배송료가 있으면 함께 결제된 것으로 처리
        if (g.shippingFee > 0 && g.prepaidInfo.amount >= g.totalAmount) {
          g.totalPaid += g.shippingFee;
        }
      }
      g.remainingAmount = Math.max(0, g.finalTotal - g.totalPaid);
    });

    return Object.values(groups);
  };

  // 오늘 날짜 (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  // 오늘 배송할 주문 그룹 (출고일 = 오늘, 완료/취소 제외)
  const todayGroups = useMemo(() => {
    const filtered = myOrders.filter(o =>
      o.shipDate === todayStr && o.shipStatus !== '배송완료' && o.shipStatus !== '취소'
    );
    return groupOrdersByCustomer(filtered)
      .sort((a, b) => {
        const za = a.shippingGroup || '';
        const zb = b.shippingGroup || '';
        if (za !== zb) return za.localeCompare(zb);
        if (a.sequence !== b.sequence) return a.sequence - b.sequence;
        return a.customerId.localeCompare(b.customerId);
      });
  }, [myOrders, todayStr, priceMap]);

  // 통계 (모두 "배송지 수" 기준 - 같은 고객 여러 주문은 1건으로)
  const stats = useMemo(() => {
    // 전체 내 담당 주문을 그룹화
    const allGroups = groupOrdersByCustomer(myOrders);

    // 배송지(그룹) 기준으로 카운트
    const pending = allGroups.filter(g => g.shipStatus !== '배송완료' && g.shipStatus !== '취소').length;
    const completed = allGroups.filter(g => g.shipStatus === '배송완료').length;

    // 오늘 배송지 수
    const todayPending = todayGroups.length;
    const todayAllGroups = allGroups.filter(g =>
      g.orders.some(o => o.shipDate === todayStr)
    );
    const todayDone = todayAllGroups.filter(g => g.shipStatus === '배송완료').length;

    // 오늘 받을 총 금액 / 받은 금액
    const todayTotalAmount = todayGroups.reduce((s, g) => s + g.finalTotal, 0);
    const todayReceivedAmount = todayGroups.reduce((s, g) => s + g.totalPaid, 0);

    return { pending, completed, todayPending, todayDone, todayTotalAmount, todayReceivedAmount };
  }, [myOrders, todayGroups, todayStr]);

  // 그룹 단위 빠른 상태 변경 (같은 고객의 모든 주문을 한꺼번에 업데이트)
  const handleGroupQuickUpdate = (group, newStatus) => {
    const groupOrderIds = new Set(group.orders.map(o => o.id));
    setOrders(orders.map(o => groupOrderIds.has(o.id) ? { ...o, shipStatus: newStatus } : o));
    const msg = newStatus === '배송완료'
      ? (group.orders.length > 1 ? `✓ ${group.orders.length}개 품목 배송완료` : '✓ 배송완료')
      : `${newStatus}(으)로 변경됨`;
    showToast(msg);
  };

  const handleSaveDetail = (updated) => {
    // updated는 그룹의 orders 배열에 대한 업데이트
    if (updated.groupOrderIds && updated.commonFields) {
      const ids = new Set(updated.groupOrderIds);
      setOrders(orders.map(o => ids.has(o.id) ? { ...o, ...updated.commonFields } : o));
    } else {
      setOrders(orders.map(o => o.id === updated.id ? updated : o));
    }
    showToast('배송 정보가 업데이트되었습니다');
    setEditTarget(null);
  };

  // 수금 입력 저장 (그룹 단위로 비례 분배)
  const handleSaveCash = (group, receivedAmount) => {
    const groupOrderIds = new Set(group.orders.map(o => o.id));
    // 받은 금액을 주문별로 비례 분배 (서비스 제외)
    const paidOrders = group.orders.filter(o => !o.isService);
    const totalBase = paidOrders.reduce((s, o) => s + (priceMap[o.itemName] || 0) * o.qty, 0);

    setOrders(orders.map(o => {
      if (!groupOrderIds.has(o.id)) return o;
      if (o.isService) return { ...o, cashReceived: 0 };
      const ratio = totalBase > 0 ? ((priceMap[o.itemName] || 0) * o.qty) / totalBase : 0;
      const cash = Math.round(receivedAmount * ratio);
      // 전액 수금 시 자동 결제완료 처리
      const newPaymentStatus = receivedAmount >= group.finalTotal ? '결제완료' : (receivedAmount > 0 ? '부분결제' : o.paymentStatus);
      return { ...o, cashReceived: cash, paymentStatus: newPaymentStatus };
    }));

    const remaining = group.finalTotal - receivedAmount;
    if (remaining <= 0) {
      showToast(`✓ 전액 수금 완료 (${formatWon(receivedAmount)})`);
    } else {
      showToast(`✓ 부분 수금 (받은 금액: ${formatWon(receivedAmount)} / 잔액: ${formatWon(remaining)})`);
    }
    setCashTarget(null);
  };

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Pretendard', -apple-system, 'Malgun Gothic', sans-serif" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        .scrollbar-slim::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* 모바일 헤더 */}
      <header className="sticky top-0 z-20 bg-gradient-to-br from-sky-600 to-sky-800 text-white shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🚚</div>
            <div>
              <div className="font-bold text-base leading-tight flex items-center gap-1.5">
                {driver?.name || '기사'}님
                {isSupabaseConfigured && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" title="실시간 연결됨" />
                )}
              </div>
              <div className="text-[10px] text-sky-100 flex items-center gap-1">
                <span>담당:</span>
                {driver?.zones?.map(z => (
                  <span key={z} className="bg-white/20 px-1.5 py-0.5 rounded font-bold">
                    {z.replace('Zone', 'Z')}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-white/20 rounded-lg">
            <LogOut size={18} />
          </button>
        </div>

        {/* 오늘 날짜 + 빠른 통계 (모두 배송지 단위) */}
        <div className="px-4 pb-3 grid grid-cols-4 gap-2">
          <div className="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div className="text-[9px] text-sky-100 font-medium">오늘 예정</div>
            <div className="text-xl font-bold tabular-nums">{stats.todayPending}<span className="text-[10px] font-normal ml-0.5">집</span></div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div className="text-[9px] text-sky-100 font-medium">오늘 완료</div>
            <div className="text-xl font-bold tabular-nums">{stats.todayDone}<span className="text-[10px] font-normal ml-0.5">집</span></div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div className="text-[9px] text-sky-100 font-medium">전체 대기</div>
            <div className="text-xl font-bold tabular-nums">{stats.pending}<span className="text-[10px] font-normal ml-0.5">집</span></div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-2 text-center">
            <div className="text-[9px] text-sky-100 font-medium">전체 완료</div>
            <div className="text-xl font-bold tabular-nums">{stats.completed}<span className="text-[10px] font-normal ml-0.5">집</span></div>
          </div>
        </div>

        {/* 💵 오늘 수금 현황 */}
        {stats.todayTotalAmount > 0 && (
          <div className="px-4 pb-3">
            <div className="bg-white/20 backdrop-blur rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💵</span>
                <div>
                  <div className="text-[9px] text-sky-100 font-medium">오늘 받은 금액 / 받을 금액</div>
                  <div className="text-xs font-bold tabular-nums">
                    ${stats.todayReceivedAmount} <span className="text-sky-200">/</span> ${stats.todayTotalAmount}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-sky-100 font-medium">잔액</div>
                <div className="text-sm font-bold tabular-nums text-amber-200">${Math.max(0, stats.todayTotalAmount - stats.todayReceivedAmount)}</div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <main className="pb-20">
        {tab === 'today' && (
          <DriverTodayView
            groups={todayGroups}
            customerMap={customerMap}
            items={items}
            onGroupUpdate={handleGroupQuickUpdate}
            onEdit={setEditTarget}
            onCashClick={setCashTarget}
            todayStr={todayStr}
          />
        )}
        {tab === 'all' && (
          <DriverAllView
            orders={myOrders}
            customerMap={customerMap}
            items={items}
            priceMap={priceMap}
            groupOrdersByCustomer={groupOrdersByCustomer}
            onGroupUpdate={handleGroupQuickUpdate}
            onEdit={setEditTarget}
            onCashClick={setCashTarget}
            driver={driver}
          />
        )}
        {tab === 'profile' && (
          <DriverProfileView driver={driver} stats={stats} onLogout={onLogout} />
        )}
      </main>

      {/* 하단 탭 바 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-20 shadow-2xl">
        <div className="grid grid-cols-3">
          {[
            { id: 'today', icon: '📅', label: '오늘 배송', badge: stats.todayPending },
            { id: 'all', icon: '📋', label: '전체 배송', badge: stats.pending },
            { id: 'profile', icon: '👤', label: '내 정보', badge: 0 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2.5 flex flex-col items-center gap-0.5 relative transition-all ${
                tab === t.id ? 'text-sky-700' : 'text-stone-400'
              }`}
            >
              <div className="relative">
                <span className="text-xl">{t.icon}</span>
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${tab === t.id ? 'text-sky-700' : 'text-stone-500'}`}>
                {t.label}
              </span>
              {tab === t.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-sky-700 rounded-t" />}
            </button>
          ))}
        </div>
      </nav>

      {editTarget && (
        <DriverOrderDetailModal
          order={editTarget}
          customer={customerMap[editTarget.customerId]}
          item={items.find(i => i.name === editTarget.itemName)}
          onSave={handleSaveDetail}
          onClose={() => setEditTarget(null)}
        />
      )}

      {cashTarget && (
        <CashReceiveModal
          group={cashTarget}
          customer={customerMap[cashTarget.customerId]}
          onSave={(amount) => handleSaveCash(cashTarget, amount)}
          onClose={() => setCashTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium bg-stone-900 text-white z-50">
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// 📅 Today View - 오늘 배송할 주문만 카드 형태로
function DriverTodayView({ groups, customerMap, items, onGroupUpdate, onEdit, onCashClick, todayStr }) {
  const today = new Date(todayStr);
  const dayName = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][today.getDay()];
  const dateStr = `${today.getMonth()+1}월 ${today.getDate()}일 (${dayName})`;

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl">📅</div>
        <div className="flex-1">
          <div className="text-xs text-stone-500">오늘의 배송</div>
          <div className="font-bold text-stone-800">{dateStr}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-500">남은 배송지</div>
          <div className="text-2xl font-bold text-sky-700 tabular-nums">{groups.length}</div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <div className="font-bold text-stone-800 mb-1">오늘 배송 완료!</div>
          <div className="text-xs text-stone-500">오늘 배송해야 할 주문이 모두 끝났어요</div>
        </div>
      ) : (
        groups.map(g => (
          <DriverDeliveryGroupCard
            key={g.customerId}
            group={g}
            customer={customerMap[g.customerId]}
            items={items}
            onGroupUpdate={onGroupUpdate}
            onEdit={onEdit}
            onCashClick={onCashClick}
          />
        ))
      )}
    </div>
  );
}

// 📋 전체 배송 - 그룹 기반 (같은 고객 주문 합침)
function DriverAllView({ orders, customerMap, items, priceMap, groupOrdersByCustomer, onGroupUpdate, onEdit, onCashClick, driver }) {
  const [filter, setFilter] = useState('pending');

  // 전체 주문을 그룹화 → 그룹 상태로 필터 (더 정확)
  const allGroups = useMemo(() => groupOrdersByCustomer(orders), [orders, groupOrdersByCustomer]);

  const filteredGroups = useMemo(() => {
    let groups = [...allGroups];
    if (filter === 'pending') {
      groups = groups.filter(g => g.shipStatus !== '배송완료' && g.shipStatus !== '취소');
    } else if (filter === 'done') {
      groups = groups.filter(g => g.shipStatus === '배송완료');
    }
    // Zone → sequence → 출고일 → customerId 순
    groups.sort((a, b) => {
      const za = a.shippingGroup || '';
      const zb = b.shippingGroup || '';
      if (za !== zb) return za.localeCompare(zb);
      if (a.sequence !== b.sequence) return a.sequence - b.sequence;
      const da = a.shipDate || '9999';
      const db = b.shipDate || '9999';
      if (da !== db) return da.localeCompare(db);
      return a.customerId.localeCompare(b.customerId);
    });
    return groups;
  }, [allGroups, filter]);

  const pendingCount = useMemo(() => {
    return allGroups.filter(g => g.shipStatus !== '배송완료' && g.shipStatus !== '취소').length;
  }, [allGroups]);

  const doneCount = useMemo(() => {
    return allGroups.filter(g => g.shipStatus === '배송완료').length;
  }, [allGroups]);

  const allCount = useMemo(() => allGroups.length, [allGroups]);

  return (
    <div className="px-4 py-4 space-y-3">
      {/* 필터 탭 */}
      <div className="bg-white rounded-2xl p-1 border border-stone-200 flex gap-1">
        {[
          { id: 'pending', label: '대기', count: pendingCount },
          { id: 'done', label: '완료', count: doneCount },
          { id: 'all', label: '전체', count: allCount },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f.id ? 'bg-sky-700 text-white' : 'text-stone-500'
            }`}
          >
            {f.label} {f.count}
          </button>
        ))}
      </div>

      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="text-5xl mb-3">📭</div>
          <div className="text-sm text-stone-500">해당하는 배송이 없어요</div>
        </div>
      ) : (
        filteredGroups.map(g => (
          <DriverDeliveryGroupCard
            key={g.customerId}
            group={g}
            customer={customerMap[g.customerId]}
            items={items}
            onGroupUpdate={onGroupUpdate}
            onEdit={onEdit}
            onCashClick={onCashClick}
          />
        ))
      )}
    </div>
  );
}

// 👤 프로필 & 로그아웃
function DriverProfileView({ driver, stats, onLogout }) {
  return (
    <div className="px-4 py-4 space-y-3">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-4xl mb-3">🚚</div>
        <div className="text-xl font-bold text-stone-800">{driver?.name}님</div>
        <div className="text-xs text-stone-500 font-mono mt-0.5">{driver?.id}</div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="text-xs font-bold text-stone-500 mb-2">🗺️ 담당 Zone</div>
        <div className="flex flex-wrap gap-2">
          {driver?.zones?.map(z => (
            <span key={z} className={`text-sm px-3 py-1.5 rounded-lg font-bold ${ZONE_COLORS[z] || 'bg-stone-100 text-stone-600'}`}>
              {z}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="text-xs font-bold text-stone-500 mb-3">📊 배송 현황</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-amber-50 rounded-xl text-center">
            <div className="text-[10px] text-amber-700 font-semibold">대기 중</div>
            <div className="text-2xl font-bold text-amber-800 tabular-nums">{stats.pending}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-center">
            <div className="text-[10px] text-emerald-700 font-semibold">배송 완료</div>
            <div className="text-2xl font-bold text-emerald-800 tabular-nums">{stats.completed}</div>
          </div>
        </div>
      </div>

      {driver?.phone && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500">📞 내 연락처</div>
            <div className="font-mono font-bold text-stone-800">{driver.phone}</div>
          </div>
        </div>
      )}

      <button
        onClick={onLogout}
        className="w-full py-3 bg-red-50 text-red-700 rounded-2xl font-bold text-sm border-2 border-red-200 hover:bg-red-100"
      >
        🚪 로그아웃
      </button>

      <div className="text-center text-[10px] text-stone-400 pt-2">
        김치하우스 OMS · 배송기사 앱<br/>
        © 2026 Kimchi House AU
      </div>
    </div>
  );
}

// 📦 배송 그룹 카드 (같은 고객의 여러 주문을 하나의 카드로)
function DriverDeliveryGroupCard({ group, customer, items, onGroupUpdate, onEdit, onCashClick }) {
  const statusColors = {
    '배송준비중': 'bg-stone-100 text-stone-700 border-stone-300',
    '출고대기': 'bg-amber-100 text-amber-700 border-amber-300',
    '배송중': 'bg-blue-100 text-blue-700 border-blue-300',
    '배송완료': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    '반송': 'bg-red-100 text-red-700 border-red-300',
    '취소': 'bg-stone-100 text-stone-500 border-stone-200',
  };

  const priceMap = {};
  items.forEach(i => { priceMap[i.name] = i.price || 0; });

  const isDone = group.shipStatus === '배송완료';
  const phone = customer?.phone?.replace(/\s/g, '');
  const address = customer?.address || '';
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  // 결제 상태 판단
  const paymentPercent = group.finalTotal > 0 ? Math.round((group.totalPaid / group.finalTotal) * 100) : 0;
  const isFullyPaid = group.totalPaid >= group.finalTotal && group.finalTotal > 0;
  const isPartialPaid = group.totalPaid > 0 && !isFullyPaid;

  return (
    <div className={`bg-white rounded-2xl border-2 ${isDone ? 'border-emerald-200 opacity-70' : 'border-stone-200'} overflow-hidden`}>
      {/* 상단: 순번 + Zone + 상태 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100">
        <div className="flex items-center gap-2 flex-wrap">
          {group.sequence && group.sequence !== 999 && (
            <span className="text-xs font-bold bg-gradient-to-br from-red-700 to-red-900 text-white rounded-full w-6 h-6 flex items-center justify-center">
              {group.sequence}
            </span>
          )}
          {group.shippingGroup && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ZONE_COLORS[group.shippingGroup] || 'bg-stone-100'}`}>
              {group.shippingGroup.replace('Zone', 'Zone ')}
            </span>
          )}
          {group.arrivalTime && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-700">
              ⏰ {group.arrivalTime}
            </span>
          )}
          {group.isPickup && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-sky-500 text-white">📍 픽업</span>}
          {group.hasService && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500 text-white">🎁</span>}
          {group.orders.length > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-700">
              📦 {group.orders.length}건
            </span>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${statusColors[group.shipStatus] || 'bg-stone-100'}`}>
          {group.shipStatus}
        </span>
      </div>

      {/* 고객 정보 */}
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-stone-800">{customer?.name || '-'}</span>
            {customer?.agedCare && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">🏥 Aged</span>}
          </div>
          <div className="text-[10px] text-stone-500">
            {group.shipDate && `📅 ${group.shipDate}`}
          </div>
        </div>
        {/* 품목 리스트 */}
        <div className="space-y-1">
          {group.orders.map(o => {
            const itemPrice = (priceMap[o.itemName] || 0) * o.qty;
            return (
              <div key={o.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400">📦</span>
                  <span className="text-stone-700">{o.itemName} <span className="text-stone-400">×{o.qty}</span></span>
                  {o.isService && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">무료</span>}
                </div>
                <span className={`font-mono tabular-nums ${o.isService ? 'text-stone-400 line-through' : 'text-stone-700 font-semibold'}`}>
                  {o.isService ? `$${itemPrice}` : `$${itemPrice}`}
                </span>
              </div>
            );
          })}
          {group.shippingFee > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
              <span className="text-stone-500">🚚 배송료</span>
              <span className="font-mono tabular-nums text-stone-700">${group.shippingFee}</span>
            </div>
          )}

          {/* 🎁 사은품 알림 (배송기사가 꼭 확인) */}
          {(() => {
            const totalGiftQty = group.orders.reduce((s, o) => s + (o.giftQty || 0), 0);
            const giftNames = [...new Set(group.orders.filter(o => o.giftQty > 0).map(o => o.giftName || '사은품'))];
            if (totalGiftQty === 0) return null;
            return (
              <div className="mt-2 p-2.5 bg-gradient-to-r from-pink-100 to-rose-100 border-2 border-pink-400 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-pink-700 uppercase">사은품 전달</div>
                    <div className="text-xs font-bold text-pink-900 truncate">
                      {giftNames.join(', ')}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-pink-700 tabular-nums">
                    {totalGiftQty}<span className="text-xs font-normal text-pink-500 ml-0.5">개</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between pt-1.5 border-t-2 border-stone-200">
            <span className="text-sm font-bold text-stone-800">💰 총액</span>
            <span className="text-base font-bold text-red-800 font-mono tabular-nums">${group.finalTotal}</span>
          </div>
        </div>
      </div>

      {/* 💵 수금 상태 */}
      <div className={`px-4 py-2.5 border-b border-stone-100 ${isFullyPaid ? 'bg-emerald-50' : isPartialPaid ? 'bg-amber-50' : 'bg-red-50'}`}>
        {/* 💰 선결제 표시 (있을 때만) */}
        {group.prepaidInfo && (
          <div className="mb-2 px-3 py-2 bg-emerald-100 border-2 border-emerald-500 rounded-lg flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-emerald-900 flex items-center gap-1.5">
                이미 결제됨
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-700 text-white rounded font-bold whitespace-nowrap">
                  {group.prepaidInfo.method === 'cash' ? '💵 현금' : '🏦 계좌이체'}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 font-mono">
                선결제 금액: <span className="font-bold">${group.prepaidInfo.amount}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">
              {isFullyPaid ? '✅' : isPartialPaid ? '🔶' : '⚠️'}
            </span>
            <div>
              <div className={`text-[10px] font-bold ${isFullyPaid ? 'text-emerald-800' : isPartialPaid ? 'text-amber-800' : 'text-red-800'}`}>
                {isFullyPaid ? (group.prepaidInfo ? '결제 완료 (선결제)' : '결제 완료') : isPartialPaid ? `부분 결제 (${paymentPercent}%)` : '미결제'}
              </div>
              <div className={`text-[11px] font-mono tabular-nums ${isFullyPaid ? 'text-emerald-700' : isPartialPaid ? 'text-amber-700' : 'text-red-700'}`}>
                받은 금액: <span className="font-bold">${group.totalPaid}</span> / ${group.finalTotal}
              </div>
            </div>
          </div>
          {/* 미결제/부분결제일 때만 수금 버튼 (이미 선결제 완료면 숨김) */}
          {(!isFullyPaid && (!group.hasService || group.finalTotal > 0)) ? (
            <button
              onClick={() => onCashClick(group)}
              className="px-3 py-1.5 bg-white border-2 border-current rounded-lg text-xs font-bold active:scale-95 transition-all"
              style={{ color: isPartialPaid ? '#b45309' : '#b91c1c' }}
            >
              💵 수금
            </button>
          ) : null}
        </div>
        {isPartialPaid && (
          <div className="mt-1.5 h-1 bg-amber-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${paymentPercent}%` }} />
          </div>
        )}
      </div>

      {/* 주소 + 액션 버튼 */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
        <div className="text-xs text-stone-700 mb-2 leading-relaxed">
          📍 {address || '-'}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {address && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 px-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              🗺️ 지도
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-1 px-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              📞 전화
            </a>
          )}
          {phone && (
            <a
              href={`sms:${phone}?body=${encodeURIComponent(`[워커힐호텔김치] ${customer?.name || ''}고객님, 주문하신 ${group.orders[0]?.itemName || ''} 외 ${group.orders.length - 1}건 배송 중입니다. 잠시 후 도착 예정입니다.`)}`}
              className="flex items-center justify-center gap-1 px-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              💬 문자
            </a>
          )}
        </div>
      </div>

      {/* 배송 메모 */}
      {group.deliveryMemo && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-900">
          💬 {group.deliveryMemo}
        </div>
      )}

      {/* 상태 변경 버튼 */}
      <div className="px-3 py-2.5 grid grid-cols-3 gap-1.5">
        {group.shipStatus !== '배송중' && !isDone && (
          <button
            onClick={() => onGroupUpdate(group, '배송중')}
            className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold active:scale-95 transition-all border border-blue-200"
          >
            🚛 배송중
          </button>
        )}
        {!isDone && (
          <button
            onClick={() => onGroupUpdate(group, '배송완료')}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold active:scale-95 transition-all col-span-2"
          >
            ✓ 배송완료
          </button>
        )}
        {isDone && (
          <button
            onClick={() => onGroupUpdate(group, '배송준비중')}
            className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-bold col-span-2"
          >
            ↩️ 완료 취소
          </button>
        )}
        <button
          onClick={() => onEdit(group.orders[0])}
          className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold border border-stone-200"
        >
          ⚙️ 상세
        </button>
      </div>
    </div>
  );
}

// 💵 수금 입력 모달 (모바일 키패드)
function CashReceiveModal({ group, customer, onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const numAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, group.finalTotal - numAmount);

  const appendDigit = (d) => {
    if (amount.length >= 7) return;
    if (d === '.' && amount.includes('.')) return;
    setAmount(amount + d);
  };

  const clear = () => setAmount('');
  const backspace = () => setAmount(amount.slice(0, -1));
  const setFull = () => setAmount(String(group.finalTotal));
  const setRemaining = () => {
    const r = group.finalTotal - group.totalPaid;
    setAmount(String(Math.max(0, r)));
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-stone-800">💵 수금 입력</h2>
            <div className="text-[10px] text-stone-500">{customer?.name}고객님 · 배송지 수금</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg"><X size={20} /></button>
        </div>

        {/* 금액 정보 */}
        <div className="p-5 space-y-3">
          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">💰 총 주문액</span>
              <span className="font-bold text-stone-800 font-mono tabular-nums">${group.finalTotal}</span>
            </div>
            {group.totalPaid > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">이미 받은 금액</span>
                <span className="font-bold text-emerald-700 font-mono tabular-nums">${group.totalPaid}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-stone-200">
              <span className="text-stone-600">🔴 잔액</span>
              <span className="font-bold text-red-700 font-mono tabular-nums">${Math.max(0, group.finalTotal - group.totalPaid)}</span>
            </div>
          </div>

          {/* 입력 금액 표시 */}
          <div className="bg-sky-50 border-2 border-sky-300 rounded-xl p-5">
            <div className="text-[10px] text-sky-700 font-bold mb-1">받은 금액 입력</div>
            <div className="text-4xl font-bold text-sky-900 font-mono tabular-nums text-right">
              ${amount || '0'}
            </div>
            {numAmount > 0 && (
              <div className="mt-2 pt-2 border-t border-sky-200 flex justify-between text-[11px]">
                <span className="text-sky-700">수금 후 잔액:</span>
                <span className={`font-bold ${remaining === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  ${remaining} {remaining === 0 && '✓ 완납'}
                </span>
              </div>
            )}
          </div>

          {/* 빠른 입력 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={setRemaining}
              className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold active:scale-95"
            >
              💯 전액 수금 (${Math.max(0, group.finalTotal - group.totalPaid)})
            </button>
            <button
              onClick={clear}
              className="py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-sm font-bold active:scale-95"
            >
              🗑️ 지우기
            </button>
          </div>

          {/* 숫자 키패드 */}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
              <button
                key={k}
                onClick={() => k === '⌫' ? backspace() : appendDigit(k)}
                className="py-4 bg-white border-2 border-stone-200 hover:bg-stone-50 rounded-xl text-xl font-bold text-stone-800 active:scale-95 active:bg-sky-50"
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-stone-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-stone-600 bg-stone-100 rounded-xl">취소</button>
          <button
            onClick={() => numAmount >= 0 && onSave(numAmount)}
            disabled={numAmount < 0}
            className="flex-1 py-3 bg-sky-700 hover:bg-sky-800 disabled:bg-stone-300 text-white rounded-xl text-sm font-bold"
          >
            💾 저장
          </button>
        </div>
      </div>
    </div>
  );
}

// 상세 편집 모달 (모바일 최적화)
function DriverOrderDetailModal({ order, customer, item, onSave, onClose }) {
  const [form, setForm] = useState({
    shipStatus: order.shipStatus,
    deliveryMethod: order.deliveryMethod || '',
    paymentStatus: order.paymentStatus || '미결제',
    deliveryMemo: order.deliveryMemo || '',
  });

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-stone-800">배송 상세 업데이트</h2>
            <div className="text-[10px] text-stone-500">{order.id} · {customer?.name}고객님</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-2">배송 상태</label>
            <div className="grid grid-cols-2 gap-2">
              {['입고대기','배송준비중','출고대기','배송중','배송완료','반송','취소'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({...form, shipStatus: s})}
                  className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    form.shipStatus === s
                      ? s === '배송완료' ? 'bg-emerald-600 text-white border-emerald-600'
                        : s === '배송중' ? 'bg-blue-600 text-white border-blue-600'
                        : s === '입고대기' ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-stone-800 text-white border-stone-800'
                      : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!order.isPickup && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2">배송 방법</label>
              <div className="grid grid-cols-3 gap-2">
                {['대면배송','비대면배송','미배송'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({...form, deliveryMethod: form.deliveryMethod === m ? '' : m})}
                    className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                      form.deliveryMethod === m
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!order.isService && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2">결제 상태</label>
              <div className="grid grid-cols-2 gap-2">
                {['결제완료','미결제'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({...form, paymentStatus: s})}
                    className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                      form.paymentStatus === s
                        ? s === '결제완료' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    {s === '결제완료' ? '✓ 결제완료' : '✗ 미결제'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-2">배송 메모</label>
            <textarea
              value={form.deliveryMemo}
              onChange={e => setForm({...form, deliveryMemo: e.target.value})}
              placeholder="예: 문앞에 놓아주세요"
              rows={3}
              className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:border-sky-600 resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-stone-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-stone-600 bg-stone-100 rounded-xl">취소</button>
          <button
            onClick={() => onSave({ ...order, ...form })}
            className="flex-1 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-sm font-bold"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 📤 ExcelUploadButton - 엑셀 업로드로 주문 데이터 일괄 업데이트
// ============================================================
// ============================================================
// 📥 엑셀 백업 복원 버튼 - 백업 파일을 업로드해서 데이터 복원
// ============================================================
function BackupRestoreButton({ setCustomers, setItems, setOrders, showToast }) {
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [mode, setMode] = useState('merge'); // 'replace' | 'merge'
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      const result = importFromBackupExcel(wb);

      if (!result.valid) {
        showToast(`백업 파일을 읽을 수 없습니다: ${result.errors.join(', ')}`, 'error');
        setParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPreview(result);
    } catch (err) {
      console.error(err);
      showToast('백업 파일 읽기 실패. "워커힐김치_백업_xxx.xlsx" 형식이 맞는지 확인해주세요.', 'error');
    }
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApply = () => {
    if (!preview) return;

    if (mode === 'replace') {
      // 완전 교체
      setCustomers(preview.customers);
      setItems(preview.items);
      setOrders(preview.orders);
      showToast(`✅ 복원 완료! 고객 ${preview.customers.length}명, 주문 ${preview.orders.length}건, 품목 ${preview.items.length}개`);
    } else {
      // 병합 모드: 기존 데이터 유지 + 백업에 있는 것만 덮어쓰기
      setCustomers(prevCustomers => {
        const map = {};
        prevCustomers.forEach(c => { map[c.id] = c; });
        preview.customers.forEach(c => { map[c.id] = c; });
        return Object.values(map);
      });
      setItems(prevItems => {
        const map = {};
        prevItems.forEach(i => { map[i.code] = i; });
        preview.items.forEach(i => {
          // 기존 원가/B2B가/입고이력은 유지 (백업에는 없을 수 있음)
          const existing = map[i.code];
          map[i.code] = existing ? { ...existing, ...i } : i;
        });
        return Object.values(map);
      });
      setOrders(prevOrders => {
        const map = {};
        prevOrders.forEach(o => { map[o.id] = o; });
        preview.orders.forEach(o => { map[o.id] = o; });
        return Object.values(map);
      });
      showToast(`✅ 병합 완료! 기존 데이터에 백업 데이터가 추가/업데이트되었습니다`);
    }

    setPreview(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={parsing}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-emerald-50 border-2 border-emerald-600 text-emerald-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
        title="백업 엑셀 파일에서 데이터 복원"
      >
        <span className="text-sm">📥</span>
        <span className="flex-1 text-left">{parsing ? '읽는 중...' : '백업 복원하기'}</span>
        <span className="text-[9px] opacity-60">.xlsx</span>
      </button>

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
              <div>
                <h2 className="font-serif-ko text-lg font-bold text-stone-800">📥 백업 복원 미리보기</h2>
                <div className="text-xs text-stone-500 mt-0.5">백업 파일의 내용을 확인하고 복원 방식을 선택하세요</div>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* 요약 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                  <div className="text-[10px] text-sky-700">고객</div>
                  <div className="font-bold text-sky-900 text-2xl tabular-nums">{preview.customers.length}</div>
                  <div className="text-[10px] text-sky-600">명</div>
                </div>
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                  <div className="text-[10px] text-sky-700">주문</div>
                  <div className="font-bold text-sky-900 text-2xl tabular-nums">{preview.orders.length}</div>
                  <div className="text-[10px] text-sky-600">건</div>
                </div>
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                  <div className="text-[10px] text-sky-700">품목</div>
                  <div className="font-bold text-sky-900 text-2xl tabular-nums">{preview.items.length}</div>
                  <div className="text-[10px] text-sky-600">개</div>
                </div>
              </div>

              {/* 에러가 있으면 표시 */}
              {preview.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-xs font-bold text-amber-900 mb-1">⚠️ 주의사항</div>
                  <ul className="text-[11px] text-amber-800 list-disc list-inside space-y-0.5">
                    {preview.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* 복원 방식 선택 */}
              <div>
                <div className="text-xs font-bold text-stone-700 mb-2">복원 방식 선택</div>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    mode === 'merge' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}>
                    <input
                      type="radio"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                      className="mt-0.5 w-4 h-4 accent-emerald-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-emerald-900">🔀 병합 모드 (추천)</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        기존 데이터는 유지하고, 백업 데이터를 추가/업데이트합니다.
                        <br/>같은 ID가 있으면 백업 데이터로 덮어쓰고, 없으면 새로 추가합니다.
                        <br/><strong>안전한 선택 - 데이터 손실 없음</strong>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    mode === 'replace' ? 'bg-red-50 border-red-300' : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}>
                    <input
                      type="radio"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="mt-0.5 w-4 h-4 accent-red-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-red-900">⚠️ 완전 교체 모드</div>
                      <div className="text-[11px] text-red-700 mt-0.5">
                        기존 모든 데이터를 삭제하고 백업 데이터로 교체합니다.
                        <br/><strong className="text-red-900">주의: 현재 데이터가 사라집니다!</strong>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 고객 미리보기 */}
              {preview.customers.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-stone-700 mb-2">고객 미리보기 (상위 5명)</div>
                  <div className="bg-stone-50 rounded-lg p-2 space-y-1">
                    {preview.customers.slice(0, 5).map(c => (
                      <div key={c.id} className="text-xs flex items-center gap-2">
                        <span className="font-mono text-stone-500">{c.id}</span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-stone-400">{c.phone}</span>
                      </div>
                    ))}
                    {preview.customers.length > 5 && (
                      <div className="text-[10px] text-stone-500">...외 {preview.customers.length - 5}명</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
              <button
                onClick={handleApply}
                className={`px-5 py-2 text-white rounded-lg text-sm font-semibold active:scale-95 transition-all ${
                  mode === 'replace' ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {mode === 'replace' ? '⚠️ 완전 교체' : '🔀 병합 복원'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExcelUploadButton({ customers, items, orders, setCustomers, setOrders, showToast }) {
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      // 🆕 통합 파싱 (전체(원본) + Zone A~H) - 데이터 보존 중심
      const result = parseFullReplaceExcel(wb, customers, items, orders);

      if (result.totalExcelOrders === 0) {
        showToast('엑셀에서 주문 데이터를 찾을 수 없습니다. "전체(원본)" 시트를 확인해주세요.', 'error');
        setParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPreview(result);
    } catch (err) {
      console.error(err);
      showToast('엑셀 파일을 읽을 수 없습니다. 양식을 확인해주세요.', 'error');
    }
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApply = () => {
    if (!preview) return;

    // 🎯 데이터 보존 중심 업로드
    // ① 신규 고객 추가
    let updatedCustomers = [...customers];
    preview.newCustomers.forEach(nc => {
      if (!updatedCustomers.find(c => c.id === nc.id)) {
        updatedCustomers.push(nc);
      }
    });

    // ② 주문 처리
    // ⚠️ 삭제는 하지 않음 - 모든 과거 기록 보존!
    // - 배차 대상 주문 중 엑셀에 없는 것 → "취소"로 상태 변경 (기록은 유지)
    // - 엑셀에 있는 것 → 업데이트
    // - 그 외 모든 주문 → 그대로 (완료/취소/서비스/픽업/배송중 등)
    const cancelIds = new Set(preview.toDelete.map(d => d.orderId));

    let updatedOrders = orders.map(o => {
      // [A] 유지+업데이트 대상
      const update = preview.orderUpdates[o.id];
      if (update) {
        return { ...o, ...update };
      }
      // [B] 이번 배차 대상이었지만 엑셀에 없음 → "취소" 상태로 (삭제 X, 기록 유지)
      if (cancelIds.has(o.id)) {
        const today = new Date().toISOString().slice(0, 10);
        const tag = `[${today} 엑셀 업로드 시 제외]`;
        return {
          ...o,
          shipStatus: '취소',
          shippingGroup: '',
          sequence: null,
          arrivalTime: '',
          deliveryMemo: o.deliveryMemo
            ? `${o.deliveryMemo} | ${tag}`
            : tag,
        };
      }
      // [C] 영향 없는 주문 (완료/취소/서비스/픽업)은 그대로
      return o;
    });

    // ③ 신규 주문 추가
    preview.newOrders.forEach(no => {
      if (!updatedOrders.find(o => o.id === no.id)) {
        updatedOrders.push(no);
      }
    });

    setCustomers(updatedCustomers);
    setOrders(updatedOrders);

    const keptCount = preview.keptOrderIds.length;
    const updatedCount = Object.keys(preview.orderUpdates).length;
    const newCount = preview.newOrders.length;
    const cancelledCount = preview.toDelete.length;
    const newCustCount = preview.newCustomers.length;

    showToast(
      `✓ 업로드 완료: ` +
      `유지 ${keptCount}건 · ` +
      `신규 ${newCount}건` +
      (cancelledCount > 0 ? ` · 취소처리 ${cancelledCount}건` : '') +
      (newCustCount > 0 ? ` · 신규고객 ${newCustCount}명` : '')
    );
    setPreview(null);
  };

  // 📥 현재 데이터를 기반으로 양식 다운로드
  const handleDownloadTemplate = () => {
    try {
      generateBatchTemplate(customers, items, orders);
      showToast('✓ 배차 양식이 다운로드되었습니다');
    } catch (err) {
      console.error(err);
      showToast('양식 생성 실패', 'error');
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 1. 양식 다운로드 */}
      <button
        onClick={handleDownloadTemplate}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[12px] font-medium transition-colors"
        title="현재 주문관리 + 배송관리 데이터로 엑셀 양식 생성"
      >
        <FileDown size={14} />
        <span className="flex-1 text-left">주문·배송 양식 다운로드</span>
        <span className="text-[10px] opacity-70">.xlsx</span>
      </button>

      {/* 2. 엑셀 업로드 */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={parsing}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-[#FAFAFA] border border-[#09090B] text-[#09090B] rounded-[8px] text-[12px] font-medium transition-colors disabled:opacity-50"
        title="엑셀 업로드: 주문관리 + 배송관리 통합 업데이트"
      >
        <Download size={14} className="rotate-180" />
        <span className="flex-1 text-left">{parsing ? '분석 중...' : '주문·배송 업로드'}</span>
        <span className="text-[10px] opacity-60">.xlsx</span>
      </button>

      {/* 3. 도움말 */}
      <button
        onClick={() => setShowHelp(true)}
        className="w-full flex items-center gap-1.5 px-3 py-1 text-[11px] text-[#71717A] hover:text-[#09090B] transition-colors"
      >
        <span>❓</span>
        <span>업로드 사용법</span>
      </button>

      {showHelp && <ExcelHelpModal onClose={() => setShowHelp(false)} />}

      {preview && (
        <ExcelUploadPreviewModal
          preview={preview}
          onApply={handleApply}
          onCancel={() => setPreview(null)}
        />
      )}
    </>
  );
}

function ExcelUploadPreviewModal({ preview, onApply, onCancel }) {
  const totalUpdates = Object.keys(preview.orderUpdates).length;
  const keptCount = preview.keptOrderIds?.length || 0;
  const newCount = preview.newOrders?.length || 0;
  const newCustCount = preview.newCustomers?.length || 0;
  const cancelledCount = preview.toDelete?.length || 0;
  const unmatchedCount = preview.unmatchedNames?.length || 0;

  // 배송비/비고 업데이트 건수
  const shippingFeeUpdates = Object.values(preview.orderUpdates).filter(u => u.shippingFee > 0).length;
  const memoUpdates = Object.values(preview.orderUpdates).filter(u => u.deliveryMemo).length;

  // Zone 배정 통계
  const zoneAssignCount = Object.values(preview.orderUpdates).filter(u => u.shippingGroup).length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between z-10">
          <div>
            <h2 className="text-[18px] font-semibold text-[#09090B] tracking-tight">엑셀 업로드 미리보기</h2>
            <div className="text-[13px] text-[#71717A] mt-0.5">
              엑셀에서 총 {preview.totalExcelOrders}건의 주문을 읽었습니다
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-[#F4F4F5] rounded-[6px] transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* ⚠️ 데이터 보존 안내 (최상단) */}
          <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px]">
            <div className="flex items-start gap-2">
              <Check size={14} className="text-[#15803D] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <div className="text-[12px] text-[#166534] leading-relaxed">
                <div className="font-semibold mb-1">데이터 보존 모드</div>
                <div>• <strong>배송완료·취소·서비스·픽업</strong> 주문은 <strong>절대 영향받지 않습니다</strong> (과거 기록 보호)</div>
                <div>• 엑셀과 정확히 일치하는 주문은 <strong>유지</strong>, 엑셀에 있지만 시스템에 없는 주문은 <strong>신규 추가</strong></div>
                <div>• 이번 배차 대상 중 엑셀에 없는 주문은 <strong>"취소" 상태로 변경</strong> (기록은 그대로 남음)</div>
              </div>
            </div>
          </div>

          {/* 요약 카드 (4개) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-4">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">기존 유지</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">{keptCount}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">엑셀과 일치</div>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-4">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">신규 주문</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">{newCount}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">엑셀에만 있음</div>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-4">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">신규 고객</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">{newCustCount}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">신규 등록</div>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-[12px] p-4">
              <div className="text-[12px] font-medium text-[#71717A] mb-2">취소 처리</div>
              <div className="text-[24px] font-semibold text-[#09090B] tabular-nums tracking-tight">{cancelledCount}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">엑셀에 없음</div>
            </div>
          </div>

          {/* 배송비/비고/Zone 업데이트 정보 */}
          {(shippingFeeUpdates > 0 || memoUpdates > 0 || zoneAssignCount > 0) && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px]">
              <Package size={14} className="text-[#1D4ED8] flex-shrink-0" strokeWidth={2.5} />
              <div className="text-[12px] text-[#1E3A8A] flex items-center gap-4 flex-wrap">
                {zoneAssignCount > 0 && (
                  <span>Zone 배정 <strong className="tabular-nums">{zoneAssignCount}</strong>건</span>
                )}
                {shippingFeeUpdates > 0 && (
                  <span>배송비 <strong className="tabular-nums">{shippingFeeUpdates}</strong>건</span>
                )}
                {memoUpdates > 0 && (
                  <span>비고 <strong className="tabular-nums">{memoUpdates}</strong>건</span>
                )}
              </div>
            </div>
          )}

          {/* Zone별 배정 현황 */}
          {zoneAssignCount > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#09090B] mb-2">Zone별 배정 현황</div>
              <div className="grid grid-cols-4 gap-2">
                {SHIPPING_ZONES.map(z => {
                  const count = Object.values(preview.orderUpdates).filter(u => u.shippingGroup === z).length;
                  return (
                    <div key={z} className="bg-white border border-[#E4E4E7] rounded-[8px] px-3 py-2 flex items-center justify-between">
                      <div className="text-[12px] font-medium text-[#52525B]">Z{z.replace('Zone', '')}</div>
                      <div className="text-[16px] font-semibold text-[#09090B] tabular-nums">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 신규 고객 섹션 */}
          {newCustCount > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#09090B] mb-2">신규 고객 {newCustCount}명</div>
              <div className="bg-white border border-[#E4E4E7] rounded-[10px] p-3 space-y-1.5 max-h-32 overflow-y-auto scrollbar-slim">
                {preview.newCustomers.map(c => (
                  <div key={c.id} className="text-[12px] flex items-center justify-between">
                    <span className="font-medium text-[#09090B]">{c.name}</span>
                    <span className="text-[11px] text-[#71717A] truncate max-w-xs ml-2">{c.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 취소 처리 대상 주문 */}
          {cancelledCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-semibold text-[#09090B]">
                  취소 처리 예정 <span className="text-[#71717A] ml-1 tabular-nums">{cancelledCount}건</span>
                </div>
              </div>

              <div className="mb-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px]">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-[#B45309] mt-0.5 flex-shrink-0" />
                  <div className="text-[12px] text-[#92400E] leading-relaxed">
                    이번 배차 대상이지만 엑셀에 없는 주문입니다.
                    <div className="mt-1">
                      <strong>삭제하지 않고 "취소" 상태로 변경</strong>되어 주문 기록은 그대로 남습니다.
                      나중에 필요하면 수동으로 복구하거나 검색할 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E4E4E7] rounded-[10px] p-3 space-y-1 max-h-40 overflow-y-auto scrollbar-slim">
                {preview.toDelete.map((c, i) => (
                  <div key={i} className="text-[12px] flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-[#09090B]">{c.customerName}</span>
                      <span className="text-[11px] text-[#71717A] ml-2">
                        {c.itemName}×{c.qty}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#A1A1AA] font-mono ml-2">{c.orderId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매칭 실패 (신규로 처리된 이름) */}
          {unmatchedCount > 0 && (
            <div>
              <div className="text-[13px] font-semibold text-[#09090B] mb-2">
                신규 고객으로 등록된 이름 <span className="text-[#71717A] ml-1 tabular-nums">{unmatchedCount}명</span>
              </div>
              <div className="mb-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] text-[12px] text-[#92400E]">
                기존 고객과 매칭되지 않아 신규로 추가됩니다. 동일 인물인 경우 나중에 고객관리에서 병합할 수 있습니다.
              </div>
              <div className="bg-white border border-[#E4E4E7] rounded-[10px] p-3 space-y-1 max-h-32 overflow-y-auto scrollbar-slim">
                {preview.unmatchedNames.map((u, i) => (
                  <div key={i} className="text-[12px] flex items-center justify-between">
                    <span className="font-medium text-[#09090B]">{u.name}</span>
                    <span className="text-[11px] text-[#71717A]">{u.sheetName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-[#E4E4E7] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] font-medium text-[#52525B] hover:bg-[#F4F4F5] rounded-[8px] transition-colors"
          >
            취소
          </button>
          <button
            onClick={onApply}
            className="px-5 py-2 bg-[#09090B] hover:bg-black text-white rounded-[8px] text-[13px] font-medium transition-colors"
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}


// 엑셀 파싱 로직 - 차량A~F 시트 형식 지원
// ============================================================
// 🎯 통합 엑셀 파싱 - "전체(원본)" + Zone A~H 모두 처리
// - 전체(원본): 주문 데이터 완전 교체 (정확 일치는 유지, 나머지는 교체)
// - Zone A~H: 배송 배정 (순번, 도착시간, Zone)
// ============================================================
function parseFullReplaceExcel(wb, customers, items, orders) {
  // 이름 정규화 함수
  const normalizeName = (name) => {
    if (!name) return '';
    return String(name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[·・•]/g, ' ')
      .replace(/[()（）\[\]【】]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 주소/전화 정규화
  const normalizeAddress = (addr) => {
    if (!addr) return '';
    return String(addr).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[,.]/g, '');
  };
  const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
  };

  // 고객 인덱스 구축
  const customerByName = {};
  const customerByNormalizedName = {};
  const customerByAddress = {};
  const customerByPhone = {};
  customers.forEach(c => {
    if (c.name) {
      customerByName[c.name.trim()] = c;
      const norm = normalizeName(c.name);
      if (norm) {
        customerByNormalizedName[norm] = c;
        const parenMatch = c.name.match(/[(（](.+?)[)）]/);
        if (parenMatch) {
          const inside = normalizeName(parenMatch[1]);
          if (inside) customerByNormalizedName[inside] = c;
        }
        const beforeParen = c.name.split(/[(（]/)[0].trim();
        if (beforeParen && beforeParen !== c.name) {
          const normBefore = normalizeName(beforeParen);
          if (normBefore) customerByNormalizedName[normBefore] = c;
        }
      }
    }
    if (c.address) {
      const normAddr = normalizeAddress(c.address);
      if (normAddr) customerByAddress[normAddr] = c;
    }
    if (c.phone) {
      const normPhone = normalizePhone(c.phone);
      if (normPhone) customerByPhone[normPhone] = c;
    }
  });

  // 고객 매칭 헬퍼
  const findCustomer = (name, address, phone) => {
    if (!name) return null;
    let c = customerByName[name];
    if (c) return c;

    const norm = normalizeName(name);
    if (norm && customerByNormalizedName[norm]) return customerByNormalizedName[norm];

    const parenMatch = name.match(/[(（](.+?)[)）]/);
    if (parenMatch) {
      const inside = normalizeName(parenMatch[1]);
      if (inside && customerByNormalizedName[inside]) return customerByNormalizedName[inside];
    }

    const beforeParen = normalizeName(name.split(/[(（]/)[0]);
    if (beforeParen && customerByNormalizedName[beforeParen]) return customerByNormalizedName[beforeParen];

    const normPhone = normalizePhone(phone);
    if (normPhone && normPhone.length >= 8 && customerByPhone[normPhone]) return customerByPhone[normPhone];

    const normAddr = normalizeAddress(address);
    if (normAddr && normAddr.length > 10 && customerByAddress[normAddr]) return customerByAddress[normAddr];

    return null;
  };

  // 배송비 파싱 (텍스트 섞인 경우 대응)
  const parseShippingFee = (raw) => {
    if (raw == null || raw === '') return { fee: 0, extraMemo: '' };
    if (typeof raw === 'number') return { fee: raw, extraMemo: '' };
    const str = String(raw).trim();
    const match = str.match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      const fee = parseFloat(match[1]);
      const remaining = str.substring(match[1].length).trim();
      return { fee, extraMemo: remaining };
    }
    return { fee: 0, extraMemo: str };
  };

  // 품목 컬럼 → 품목 배열
  const getItemsFromRow = (row, startCol) => {
    const qty4KG = Number(row[startCol]) || 0;
    const qty4KG2 = Number(row[startCol + 1]) || 0;
    const qty4KG3 = Number(row[startCol + 2]) || 0;
    const qtyChonggak = Number(row[startCol + 3]) || 0;
    const qtyChonggak2 = Number(row[startCol + 4]) || 0;
    const qtyMix = Number(row[startCol + 5]) || 0;

    const result = [];
    if (qty4KG) result.push({ itemName: '배추김치 4KG', qty: qty4KG, perBox: 10 });
    if (qty4KG2) result.push({ itemName: '배추김치 4KG - 2세트(할인)', qty: qty4KG2, perBox: 10 });
    if (qty4KG3) result.push({ itemName: '배추김치 4KG - 3세트(할인)', qty: qty4KG3, perBox: 10 });
    if (qtyChonggak) result.push({ itemName: '총각김치 2KG', qty: qtyChonggak, perBox: 10 });
    if (qtyChonggak2) result.push({ itemName: '총각김치 2KG - 2세트(할인)', qty: qtyChonggak2, perBox: 10 });
    if (qtyMix) result.push({ itemName: '혼합세트 (배추4KG + 총각2KG)', qty: qtyMix, perBox: 10 });
    return result;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1️⃣ 전체(원본) 시트 → 주문 데이터 파싱
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 엑셀에서 읽은 주문 후보들 (신규 고객 포함)
  const excelOrders = [];  // { customer: {...} or null, items: [...], memo, shippingFee, needNewCustomer: bool, customerInfo: {...} }
  const unmatchedNames = [];

  if (wb.Sheets['전체(원본)']) {
    const ws = wb.Sheets['전체(원본)'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    // 행4(index 3)가 헤더, 행5~(index 4~)가 데이터
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const no = row[0];
      const name = row[1] ? String(row[1]).trim() : '';
      const address = row[2] ? String(row[2]).trim() : '';
      const phone = row[3] ? String(row[3]).trim() : '';
      // row[4]: 가격 (계산값, 무시)
      // row[5]: 수금액 (무시)
      // row[6~11]: 품목 수량
      // row[12]: 배송비
      // row[13]: 비고

      if (!name) continue;

      const itemsArr = getItemsFromRow(row, 6);
      if (itemsArr.length === 0) continue;  // 품목 없으면 스킵

      const { fee, extraMemo } = parseShippingFee(row[12]);
      let memo = row[13] ? String(row[13]).trim() : '';
      if (extraMemo && !memo.includes(extraMemo)) {
        memo = memo ? `${memo} | ${extraMemo}` : extraMemo;
      }

      const existingCustomer = findCustomer(name, address, phone);

      excelOrders.push({
        name,
        address,
        phone,
        items: itemsArr,
        shippingFee: fee,
        memo,
        customer: existingCustomer,
        needNewCustomer: !existingCustomer,
      });

      if (!existingCustomer) {
        unmatchedNames.push({ name, sheetName: '전체(원본)', zone: '-' });
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2️⃣ Zone A~H 시트 → 배송 배정 (name → zone, sequence 매핑)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const zoneSheetMap = {
    'Zone A': 'Zone1', 'Zone B': 'Zone2', 'Zone C': 'Zone3', 'Zone D': 'Zone4',
    'Zone E': 'Zone5', 'Zone F': 'Zone6', 'Zone G': 'Zone7', 'Zone H': 'Zone8',
  };

  // 이름(정규화) → 배차 정보
  const zoneAssignments = {};  // normalizedName → { zone, sequence, arrivalTime }

  for (const [sheetName, zone] of Object.entries(zoneSheetMap)) {
    if (!wb.Sheets[sheetName]) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    // 행3(index 2)이 헤더, 행4~(index 3~)가 데이터
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const seq = row[0];
      const arrivalTime = row[1];
      const name = row[2] ? String(row[2]).trim() : '';

      const seqNum = typeof seq === 'number' ? seq :
                     (typeof seq === 'string' ? parseInt(seq, 10) : NaN);
      if (isNaN(seqNum) || !name) continue;

      const norm = normalizeName(name);
      if (norm) {
        zoneAssignments[norm] = {
          zone,
          sequence: seqNum,
          arrivalTime: String(arrivalTime || ''),
        };
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3️⃣ 변경사항 계산
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // 3-1. "이번 배차 대상" 기존 주문 ID 수집
  //  ✅ 보호 대상 (절대 건드리지 않음):
  //     - 배송완료: 과거 배송 기록 (데이터 보존)
  //     - 배송중: 이미 차량 출발함 (건드리면 안 됨)
  //     - 취소: 이미 처리됨
  //     - 서비스/픽업: 배차 대상 아님
  //  🔄 배차 대상 (교체 가능):
  //     - 배송준비중
  //     - 출고대기
  //     - 입고대기 (아직 물건 안 들어왔지만 주문 예정)
  const targetOrderIds = new Set();
  orders.forEach(o => {
    // 보호 대상 제외
    if (o.shipStatus === '배송완료') return;
    if (o.shipStatus === '배송중') return;
    if (o.shipStatus === '취소') return;
    if (o.isService) return;
    if (o.isPickup) return;
    // 배차 대상 (배송준비중/출고대기/입고대기)
    targetOrderIds.add(o.id);
  });

  // 3-2. 엑셀 주문을 "고객+품목+수량" 해시로 매칭
  //      기존 주문과 정확히 일치하는 것은 유지, 나머지는 신규로 추가
  const makeOrderKey = (customerId, items) => {
    const sortedItems = [...items].sort((a, b) => a.itemName.localeCompare(b.itemName));
    const itemsStr = sortedItems.map(it => `${it.itemName}×${it.qty}`).join('|');
    return `${customerId}::${itemsStr}`;
  };

  // 기존 주문들의 키 맵 (배송 대상만)
  const existingOrderByKey = {};
  orders.forEach(o => {
    if (!targetOrderIds.has(o.id)) return;
    const itemsList = Array.isArray(o.items) && o.items.length > 0
      ? o.items
      : [{ itemName: o.itemName, qty: o.qty }];
    const key = makeOrderKey(o.customerId, itemsList);
    if (!existingOrderByKey[key]) existingOrderByKey[key] = [];
    existingOrderByKey[key].push(o);
  });

  // 3-3. 각 엑셀 주문에 대한 처리 결정
  const newCustomers = [];
  const newOrders = [];
  const orderUpdates = {};  // 기존 유지될 주문의 배차 정보 업데이트
  const keptOrderIds = new Set();  // 유지될 기존 주문 ID

  let newCustomerCounter = 1;
  const getNextCustomerId = () => {
    while (true) {
      const candidate = `C${String(customers.length + newCustomerCounter).padStart(4, '0')}`;
      newCustomerCounter++;
      if (!customers.find(c => c.id === candidate) && !newCustomers.find(c => c.id === candidate)) {
        return candidate;
      }
    }
  };

  let newOrderCounter = 1;
  const maxOrderNum = orders.reduce((max, o) => {
    const n = parseInt(o.id.replace('ORD-', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const getNextOrderId = () => {
    return `ORD-${String(maxOrderNum + newOrderCounter++).padStart(4, '0')}`;
  };

  excelOrders.forEach(eo => {
    let customer = eo.customer;
    let customerId;

    // 신규 고객 처리
    if (!customer) {
      customerId = getNextCustomerId();
      const newCust = {
        id: customerId,
        name: eo.name,
        phone: eo.phone,
        address: eo.address,
        agedCare: false,
        grade: '일반',
        joinDate: new Date().toISOString().slice(0, 10),
        memo: '엑셀 업로드 신규',
      };
      newCustomers.push(newCust);
      customer = newCust;
    } else {
      customerId = customer.id;
    }

    // 배차 정보 찾기
    const norm = normalizeName(eo.name);
    const zoneInfo = zoneAssignments[norm] || {};

    // 기존 주문과 정확히 일치하는지 확인
    const orderKey = makeOrderKey(customerId, eo.items);
    const matching = existingOrderByKey[orderKey];

    if (matching && matching.length > 0) {
      // 정확히 일치하는 기존 주문 발견 → 유지 + 배차 정보 업데이트
      const existing = matching.shift();  // 하나 꺼냄 (같은 키 여러개 대응)
      keptOrderIds.add(existing.id);

      const update = {};
      if (zoneInfo.zone) {
        update.shippingGroup = zoneInfo.zone;
        update.sequence = zoneInfo.sequence;
        update.arrivalTime = zoneInfo.arrivalTime;
      } else {
        // Zone 시트에 없음 → 배차 해제
        update.shippingGroup = '';
        update.sequence = null;
        update.arrivalTime = '';
      }
      if (eo.shippingFee > 0) update.shippingFee = eo.shippingFee;
      if (eo.memo) update.deliveryMemo = eo.memo;

      orderUpdates[existing.id] = update;
    } else {
      // 기존에 없음 → 신규 주문 생성
      const first = eo.items[0];
      const today = new Date().toISOString().slice(0, 10);

      const newOrder = {
        id: getNextOrderId(),
        date: today,
        customerId,
        itemName: first.itemName,
        qty: first.qty,
        perBox: first.perBox,
        items: eo.items.length > 1 ? eo.items : null,
        shipStatus: '배송준비중',
        deliveryMethod: '',
        paymentType: '',
        paymentStatus: '미결제',
        deliveryMemo: eo.memo || '',
        shippingFee: eo.shippingFee || 0,
        shipDate: '',
        arriveDate: '',
        shippingGroup: zoneInfo.zone || '',
        sequence: zoneInfo.sequence || null,
        arrivalTime: zoneInfo.arrivalTime || '',
        isService: false,
        isPickup: false,
        cashReceived: 0,
      };

      newOrders.push(newOrder);
    }
  });

  // 3-4. 엑셀에 없는 기존 배송 대상 주문 → 삭제 대상
  const toDelete = [];
  orders.forEach(o => {
    if (!targetOrderIds.has(o.id)) return;  // 배송 대상 아니면 건너뜀
    if (keptOrderIds.has(o.id)) return;  // 유지 대상이면 건너뜀
    if (orderUpdates[o.id]) return;  // 업데이트 대상이면 건너뜀

    const c = customers.find(x => x.id === o.customerId);
    toDelete.push({
      orderId: o.id,
      customerName: c?.name || o.customerId,
      itemName: o.itemName,
      qty: o.qty,
    });
  });

  // 디버그 로그
  log('[통합 업로드]', {
    엑셀주문수: excelOrders.length,
    배송대상기존주문: targetOrderIds.size,
    유지될주문: keptOrderIds.size,
    업데이트될주문: Object.keys(orderUpdates).length,
    신규주문: newOrders.length,
    신규고객: newCustomers.length,
    삭제될주문: toDelete.length,
    매칭실패이름: unmatchedNames.length,
  });

  return {
    orderUpdates,
    keptOrderIds: Array.from(keptOrderIds),
    newCustomers,
    newOrders,
    toDelete,
    unmatchedNames,
    totalExcelOrders: excelOrders.length,
  };
}

// ============================================================
// 📥 배차 양식 생성 - 업로드한 0421_updated.xlsx 구조와 동일
// ============================================================
function generateBatchTemplate(customers, items, orders) {
  const wb = XLSX.utils.book_new();

  // 가격 맵
  const priceMap = {};
  items.forEach(i => { priceMap[i.name] = i.price || 0; });
  const customerMap = {};
  customers.forEach(c => { customerMap[c.id] = c; });

  // 품목 → 컬럼 매핑 (0421_Walkerhill_base 형식)
  const getItemColumns = (itemName, qty) => {
    const cols = { '4KG': '', '4KG*2': '', '4KG*3': '', '총각': '', '총긱2': '', '혼합': '' };
    if (itemName.includes('배추김치 4KG - 3세트')) cols['4KG*3'] = qty;
    else if (itemName.includes('배추김치 4KG - 2세트')) cols['4KG*2'] = qty;
    else if (itemName.includes('배추김치 4KG')) cols['4KG'] = qty;
    else if (itemName.includes('총각김치 2KG - 2세트')) cols['총긱2'] = qty;
    else if (itemName.includes('총각김치')) cols['총각'] = qty;
    else if (itemName.includes('혼합세트')) cols['혼합'] = qty;
    return cols;
  };

  // 품목별 단가 (새 양식의 가격 수식에서 사용)
  const unitPrices = {
    '4KG': 70,      // G열 단가
    '4KG*2': 130,   // H열 단가
    '4KG*3': 180,   // I열 단가
    '총각': 55,     // J열 단가
    '총긱2': 100,   // K열 단가
    '혼합': 120,    // L열 단가
  };

  // =============================================
  // 시트 1: 전체(원본) - 모든 주문
  // =============================================
  // 행1: 단가 정보 (G1~L1)
  // 행2: 빈 행
  // 행3: 빈 행
  // 행4: 헤더
  // 행5~: 데이터
  const origData = [
    ['', '', '', '', '', '', 70, 130, 180, 55, 100, 120, '', ''],  // 행1: 단가
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],       // 행2: 빈
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],       // 행3: 빈
    ['No.', '이름', '주소', '연락처', '가격', '수금액', '4KG', '4KG*2', '4KG*3', '총각', '총긱2', '혼합', '배송비', '비고'],  // 행4: 헤더
  ];

  // 주문 정렬 (ORD-0001부터)
  const sortedOrders = [...orders]
    .filter(o => !o.isService && o.shipStatus !== '취소')
    .sort((a, b) => a.id.localeCompare(b.id));

  sortedOrders.forEach((o, idx) => {
    const c = customerMap[o.customerId] || {};
    const cols = getItemColumns(o.itemName, o.qty);
    const customerTotal = orders
      .filter(x => x.customerId === o.customerId && !x.isService)
      .reduce((s, x) => s + (priceMap[x.itemName] || 0) * x.qty, 0);
    const needsShipping = !o.isPickup && customerTotal < SHIPPING_THRESHOLD;
    const rowNum = idx + 5; // 데이터는 5행부터

    // 🆕 배송비: 주문에 설정된 값 우선, 없으면 자동 계산
    const shippingFeeValue = o.shippingFee > 0 ? o.shippingFee : (needsShipping ? SHIPPING_FEE : '');

    origData.push([
      idx + 1,
      c.name || '',
      c.address || '',
      c.phone || '',
      { f: `G${rowNum}*$G$1+H${rowNum}*$H$1+I${rowNum}*$I$1+J${rowNum}*$J$1+K${rowNum}*$K$1+L${rowNum}*$L$1` }, // 가격 수식
      '', // 수금액
      cols['4KG'], cols['4KG*2'], cols['4KG*3'],
      cols['총각'], cols['총긱2'], cols['혼합'],
      shippingFeeValue,
      o.deliveryMemo || c.memo || '',
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(origData);
  // 🎯 업로드 파일과 동일한 컬럼 너비
  ws1['!cols'] = [
    {wch:5.85},   // A: No.
    {wch:15.85},  // B: 이름
    {wch:40.85},  // C: 주소
    {wch:14.85},  // D: 연락처
    {wch:8.85},   // E: 가격
    {wch:8},      // F: 수금액
    {wch:6.85},   // G: 4KG
    {wch:6},      // H: 4KG*2
    {wch:6},      // I: 4KG*3
    {wch:6},      // J: 총각
    {wch:6},      // K: 총긱2
    {wch:6},      // L: 혼합
    {wch:7.85},   // M: 배송비
    {wch:25.85},  // N: 비고
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '전체(원본)');

  // =============================================
  // 시트 2~9: Zone A ~ Zone H
  // =============================================
  const zoneList = [
    { zone: 'Zone1', letter: 'A' },
    { zone: 'Zone2', letter: 'B' },
    { zone: 'Zone3', letter: 'C' },
    { zone: 'Zone4', letter: 'D' },
    { zone: 'Zone5', letter: 'E' },
    { zone: 'Zone6', letter: 'F' },
    { zone: 'Zone7', letter: 'G' },
    { zone: 'Zone8', letter: 'H' },
  ];

  zoneList.forEach(({ zone, letter }) => {
    const region = ZONE_REGIONS[zone] || '';

    const zoneOrders = orders
      .filter(o => o.shippingGroup === zone && o.shipStatus !== '취소' && !o.isService)
      .sort((a, b) => (a.sequence || 999) - (b.sequence || 999));

    // 🎯 업로드 파일과 완전 동일한 양식
    // 행1: 제목 (Zone A  |  차량1 · Day 1  │  서부 (Marsden Park 퇴근)  |  N개  |  시간)
    // 행2: 출발지
    // 행3: 헤더 (순번, 도착시간, 이름, ..., 배송비, 비고)
    // 행4~: 데이터
    // 행62: 단가 (H62~M62: 70, 130, 180, 55, 100, 120)
    const header = ['순번', '도착시간', '이름', '주소', '연락처', '가격', '수금액', '4KG', '4KG*2', '4KG*3', '총각', '총긱2', '혼합', '배송비', '비고'];

    // 총 배송 개수 계산 (업로드 파일처럼)
    const totalCount = zoneOrders.reduce((s, o) => s + (o.qty || 0), 0);

    // 제목 포맷 (Zone G/H는 특별 처리)
    let titleText;
    if (zone === 'Zone7') {
      titleText = `Zone ${letter}  |  ${region}${totalCount > 0 ? `  |  ${totalCount}개` : ''}`;
    } else if (zone === 'Zone8') {
      titleText = `Zone ${letter}  |  ${region}`;
    } else {
      titleText = `Zone ${letter}  |  ${region}${totalCount > 0 ? `  |  ${totalCount}개` : ''}`;
    }

    const rows = [
      [titleText, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`  출발: ${DEPARTURE_ADDRESS}`, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      header,
    ];

    // 데이터 행 (58개까지 채움 - 빈 행 포함)
    const maxDataRows = 58;
    for (let idx = 0; idx < maxDataRows; idx++) {
      const o = zoneOrders[idx];
      const rowNum = idx + 4; // 데이터는 4행부터

      if (o) {
        const c = customerMap[o.customerId] || {};
        const cols = getItemColumns(o.itemName, o.qty);
        const customerTotal = orders
          .filter(x => x.customerId === o.customerId && !x.isService)
          .reduce((s, x) => s + (priceMap[x.itemName] || 0) * x.qty, 0);
        const needsShipping = !o.isPickup && customerTotal < SHIPPING_THRESHOLD;

        // 배송비: 주문 값 우선, 없으면 자동 계산
        const shippingFeeValue = o.shippingFee > 0 ? o.shippingFee : (needsShipping ? SHIPPING_FEE : '');

        rows.push([
          o.sequence || (idx + 1),
          o.arrivalTime || '',
          c.name || '',
          c.address || '',
          c.phone || '',
          // 가격 수식 - 62행의 단가 참조
          { f: `H${rowNum}*$H$62+I${rowNum}*$I$62+J${rowNum}*$J$62+K${rowNum}*$K$62+L${rowNum}*$L$62+M${rowNum}*$M$62` },
          '', // 수금액
          cols['4KG'], cols['4KG*2'], cols['4KG*3'],
          cols['총각'], cols['총긱2'], cols['혼합'],
          shippingFeeValue,
          o.deliveryMemo || c.memo || '',
        ]);
      } else {
        // 빈 행 (배차 가능한 slot)
        rows.push([
          '', '', '', '', '',
          '', // 빈 행은 가격 수식 없음
          '', '', '', '', '', '', '', '', ''
        ]);
      }
    }

    // 행 62: 단가 정보 (H~M: 70, 130, 180, 55, 100, 120)
    rows.push(['', '', '', '', '', '', '', 70, 130, 180, 55, 100, 120, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 🎯 업로드 파일과 동일한 컬럼 너비
    ws['!cols'] = [
      {wch:5.85},   // A: 순번
      {wch:9.85},   // B: 도착시간
      {wch:15.85},  // C: 이름
      {wch:40.85},  // D: 주소
      {wch:14.85},  // E: 연락처
      {wch:8.85},   // F: 가격
      {wch:8},      // G: 수금액
      {wch:6.85},   // H: 4KG
      {wch:6},      // I: 4KG*2
      {wch:6},      // J: 4KG*3
      {wch:6},      // K: 총각
      {wch:6},      // L: 총긱2
      {wch:6},      // M: 혼합
      {wch:7.85},   // N: 배송비
      {wch:25.85},  // O: 비고
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Zone ${letter}`);
  });

  // 파일 다운로드
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `워커힐김치_배차양식_${today}.xlsx`);
}

// ============================================================
// ❓ 엑셀 업로드 사용법 도움말 모달
// ============================================================
function ExcelHelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif-ko text-xl font-bold text-stone-800">📋 엑셀 업로드 사용법</h2>
            <div className="text-xs text-stone-500 mt-0.5">배차 양식으로 주문 일괄 업데이트</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* 3단계 안내 */}
          <div className="space-y-3">
            <div className="flex gap-3 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
              <div className="flex-1">
                <div className="font-bold text-indigo-900 text-sm mb-1">📥 배차 양식 다운로드</div>
                <div className="text-xs text-indigo-700 leading-relaxed">
                  왼쪽 사이드바의 <span className="font-bold bg-white px-1.5 py-0.5 rounded">📥 배차 양식 다운로드</span> 버튼을 클릭해서
                  <br/>현재 주문 데이터가 담긴 엑셀 파일을 받으세요.
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">2</div>
              <div className="flex-1">
                <div className="font-bold text-emerald-900 text-sm mb-1">✏️ 엑셀에서 배차 수정</div>
                <div className="text-xs text-emerald-700 leading-relaxed space-y-1">
                  <div>• <b>차량A ~ 차량F</b> 시트에서 해당 차량의 배송 순서를 조정</div>
                  <div>• <b>순번</b> 컬럼 = 배송 순서 (1번부터)</div>
                  <div>• <b>도착시간</b> 컬럼 = 예상 도착 시간 (예: 08:00)</div>
                  <div>• 고객을 다른 차량으로 옮기려면 해당 시트에 행 추가</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-sky-50 border-2 border-sky-200 rounded-xl">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-sm">3</div>
              <div className="flex-1">
                <div className="font-bold text-sky-900 text-sm mb-1">📤 엑셀 업로드</div>
                <div className="text-xs text-sky-700 leading-relaxed">
                  <span className="font-bold bg-white px-1.5 py-0.5 rounded">📤 엑셀 업로드</span> 버튼 클릭 → 수정한 파일 선택
                  <br/>→ <span className="font-bold">미리보기</span> 확인 후 <span className="font-bold">적용하기</span> 클릭!
                </div>
              </div>
            </div>
          </div>

          {/* 양식 구조 설명 */}
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="font-bold text-stone-800 text-sm mb-2">📊 양식 구조 (시트별)</div>
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-[10px]">📋 요약</span>
                <span>차량별 배송 건수 요약 (자동 생성)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-[10px]">전체(원본)</span>
                <span>전체 주문 목록 (참고용)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-red-700 bg-white px-2 py-0.5 rounded text-[10px]">차량A</span>
                <span>Zone1 · Upper North Shore</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-orange-700 bg-white px-2 py-0.5 rounded text-[10px]">차량B</span>
                <span>Zone2 · Beecroft·Epping·Ryde</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded text-[10px]">차량C</span>
                <span>Zone3 · Kellyville·Castle Hill</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded text-[10px]">차량D</span>
                <span>Zone4 · Parramatta·Burwood</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded text-[10px]">차량E</span>
                <span>Zone5 · Strathfield·Campsie</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-violet-700 bg-white px-2 py-0.5 rounded text-[10px]">차량F</span>
                <span>Zone6 · 서부외곽·City·Hurstville</span>
              </div>
            </div>
          </div>

          {/* 중요 안내 */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="font-bold text-amber-900 text-sm mb-2">⚠️ 중요 안내</div>
            <div className="space-y-1.5 text-xs text-amber-800">
              <div>• <b>시트 이름은 반드시 "차량A", "차량B", ... "차량F"</b>여야 합니다 (공백 없이)</div>
              <div>• <b>No. 컬럼은 고객 번호</b>입니다 (C0001 → 1, C0023 → 23)</div>
              <div>• 엑셀에서 <b>빠진 주문은 자동으로 "취소"</b>로 처리됩니다</div>
              <div>• <b>No.가 없는 신규 고객</b>은 이름+주소+연락처로 자동 추가됩니다</div>
              <div>• 업로드 전 반드시 <b>미리보기로 변경 내역 확인</b>하세요</div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-semibold">
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
