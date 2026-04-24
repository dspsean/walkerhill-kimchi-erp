import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Copy, Check, Package, Users, ShoppingCart, Truck, BarChart3, Download, X, Send, AlertTriangle, TrendingUp, Bell, FileDown, RotateCcw, History, LogOut, Cloud, CloudOff } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  isSupabaseConfigured,
  subscribeToTable,
  saveBatch,
  TABLES,
} from './supabase.js';

const INITIAL_CUSTOMERS = [
  { id: 'C0001', name: '송현숙', phone: '0433 110 140', agedCare: false, address: '2108/3 NETWORK Place North Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0002', name: '정진욱', phone: '0430 152 237', agedCare: false, address: '5 Dairy Farm Way Kellyville NSW 2155', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0003', name: '이성연', phone: '0417 185 558', agedCare: false, address: '#3057 5 Amytis St. Rouse Hill.', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0004', name: '우혜정', phone: '0433 732 432', agedCare: false, address: '1 Ardennes Street Box Hill NSW 2765', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0005', name: 'J eastwood', phone: '0410 448 671', agedCare: false, address: '1 brushbox st sydney olympic park', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0006', name: 'jaemi&ethan', phone: '0431 643 454', agedCare: false, address: '1 Holland st Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0007', name: '양인자', phone: '0410 490 060', agedCare: false, address: '1 Medora Lane Cabarita 2137', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0008', name: '한세라', phone: '0421 989 688', agedCare: false, address: '1 Sherears ave, strathfield', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0009', name: '정연', phone: '0413 096 587', agedCare: false, address: '1/135 ferest rd Arncliffe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0010', name: '최신자 Sin Ja Choi', phone: '0411 261 323', agedCare: true, address: '1/31 Stephen Street, Hornsby, NSW, 2077', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $24/강민경LW코디, 인보이스 2장으로나눠발행' },
  { id: 'C0011', name: '이승희', phone: '0411 248 845', agedCare: false, address: '1/8 marsden road,ermington', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0012', name: '김희정', phone: '0426 294 555', agedCare: false, address: '10 Alonso cr, Schofields', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0013', name: '한정혜(한수)', phone: '0425 154 498', agedCare: false, address: '10 annabelle crescent, kellyville', grade: '일반', joinDate: '2025-04-21', memo: '문자, 카카오채널 중복주문' },
  { id: 'C0014', name: '박향미', phone: '0402 085 437', agedCare: false, address: '10 Diamond Court Newington', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0015', name: '김수현', phone: '0401 939 892', agedCare: false, address: '10 Galahad cres Castle hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0016', name: '이해분', phone: '0450 766 975', agedCare: true, address: '10 Lindsay Street, Campsei NSW 2194', grade: '일반', joinDate: '2025-04-21', memo: 'payments@kagedcare.com.au 인보이스보내기/최영준 KA' },
  { id: 'C0017', name: 'Augustine jang', phone: '0433 763 062', agedCare: false, address: '10/2 trafalgar pl marsfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0018', name: '김수민', phone: '0489 173 040', agedCare: false, address: '100 Fairway Dr Norwest 2153', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0019', name: '조민주', phone: '0433 379 996', agedCare: false, address: '104 Narara valley Drive 2250', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0020', name: '이정애', phone: '0414 784 003', agedCare: false, address: '104 Pretoria Pde. Hornsby', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0021', name: 'nina Yun', phone: '0423 611 548', agedCare: false, address: '107 Palmer street Woolloomooloo', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0022', name: '송은 cathy', phone: '0438560 100', agedCare: false, address: '10A Lawley cres pymble', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0023', name: '김수경', phone: '0413 220 344', agedCare: false, address: '11 Hyland place Minchinbury', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0024', name: '신은주', phone: '0438 123 178', agedCare: false, address: '11/11 Cross St Baulkham Hills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0025', name: '이진형', phone: '0481 226 381', agedCare: false, address: '11/25 wongala cres Beecroft', grade: '일반', joinDate: '2025-04-21', memo: '빌딩 B로 들어가야함, 입구는 Chapman Ave' },
  { id: 'C0026', name: 'kim', phone: '0406 330 005', agedCare: false, address: '11/36-40 Landers rd Lane Cove', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0027', name: '박미자', phone: '0452 431 946', agedCare: false, address: '11/75-79 Fallon St. Rydalmere 2116', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0028', name: '성재니', phone: '0420 824 954', agedCare: false, address: '116 chalmers street Surry hills Blacksmith cafe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0029', name: '이종희', phone: '0451 876 522', agedCare: false, address: '11fourth ave denistone', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0030', name: '홍경희', phone: '0435 624 533', agedCare: false, address: '12 Beverley Crescent, Marsfield 2122', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0031', name: 'Leanne&Wilson', phone: '0416 633 845', agedCare: false, address: '12 buckra st, Turramurra 2074', grade: '일반', joinDate: '2025-04-21', memo: '2건주문, 배송지 다름' },
  { id: 'C0032', name: '이숙진', phone: '0417 293 732', agedCare: false, address: '12 Fairholm street Strathfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0033', name: '안정혜', phone: '0433 174 465', agedCare: false, address: '12 Tathra place, Castle hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0034', name: 'jane hur', phone: '0420 945 972', agedCare: false, address: '12 Water St, Wahroonga', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0035', name: '송미정', phone: '0452 177 909', agedCare: false, address: '122excelsior Ave Castle hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0036', name: '김금진', phone: '0430 574 512', agedCare: true, address: 'U125,208 -226 Pacific Highway, Hornsby', grade: '일반', joinDate: '2025-04-21', memo: '개인부담금 15불/KA지나코디(승조앤코디)' },
  { id: 'C0037', name: '김진', phone: '0430 784 378', agedCare: true, address: 'U125,208 -226 Pacific Highway, Hornsby', grade: '일반', joinDate: '2025-04-21', memo: '개인부담금 15불/KA지나코디(승조앤코디)' },
  { id: 'C0038', name: 'kim yun', phone: '0412-131-581', agedCare: false, address: '128/ 40 Strathalbyn Dr Oatlands', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0039', name: 'anna', phone: '0413 683 572', agedCare: false, address: '1303/11Railway St Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0040', name: '김숙희', phone: '0430 288 033', agedCare: false, address: '14 first Avenue Campsie', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0041', name: '제니정', phone: '0401 343 659', agedCare: false, address: '14 The cloisters St,lves', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0042', name: 'grace park', phone: '0421 134 163', agedCare: false, address: '14 Watt Ave Newingron', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0043', name: '장선경', phone: '0432 342 003', agedCare: false, address: '15 Bellamy farm Rd West pennant hills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0044', name: '김영실', phone: '0426 880 691', agedCare: false, address: '15 Glenrowan Ave Kellyville', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0045', name: '이주현', phone: '0430 597 267', agedCare: false, address: '15 Maida Rd Epping', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0046', name: '최상미', phone: '0481 220 082', agedCare: false, address: '16 Edgbaston rd, North Kellyville NSW 2155', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0047', name: '조앤신', phone: '0411 567 664', agedCare: false, address: '16 EULALIA st West Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0048', name: '유옥자', phone: '0468 683 823', agedCare: false, address: '16 merle st north epping', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0049', name: '김성애', phone: '0418 979 693', agedCare: false, address: '1602/3-5 Albert Rd STRATHFIELD', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0050', name: '정애리', phone: '0433 250 600', agedCare: false, address: '17 bimbil pl, castle hill', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0051', name: '양선화(Sue Yang)', phone: '0433 092 191', agedCare: false, address: '17 Dresden Avenue, Castle Hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0052', name: '안소영', phone: '0424 000 303', agedCare: false, address: '17 Hannah st Beecroft', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0053', name: '김정임(양정임)', phone: '0414 378 065', agedCare: false, address: '17 Teak Pl Cherrybrook', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0054', name: 'Nam Kim', phone: '0424 845 614', agedCare: false, address: '17/1-3 Mary St Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문/빠른 배송 원함' },
  { id: 'C0055', name: '김예림', phone: '0415 441 420', agedCare: false, address: '18 chiltern crescent castle hill NSW 2154', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0056', name: '김양금', phone: '0406 133 021', agedCare: false, address: '18 crest rd Gledswood hills NSW2557', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0057', name: 'Sally Kim', phone: '0433 233 374', agedCare: false, address: '197 Seven Hills Road Baulkham Hills Sally Kim', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0058', name: '김경미', phone: '0430 346 332', agedCare: false, address: '19A Robertson Road Chester Hill 2162', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0059', name: '박기숙(이기숙님)', phone: '0438 244 089', agedCare: false, address: '2 dolphin close Claremont Meadows', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0060', name: '박수영', phone: '0427 420 387', agedCare: false, address: '2 James st CARLINGFORD', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0061', name: '유옥심', phone: '0423 693 566', agedCare: false, address: '2 Olive St Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0062', name: 'cho ja si(ka)', phone: '0426 961 004', agedCare: false, address: '20 second av Epping', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0063', name: '서자영', phone: '0430 125 357', agedCare: false, address: '21 Malvern Ave Roseville', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0064', name: '한미', phone: '0425 885 557', agedCare: false, address: '21 ZappiastRiverstone 2765', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0065', name: 'Seungwoo Kang(강승우)', phone: '0401 419 730', agedCare: false, address: '21A Gormley St, Lidcome 2141', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0066', name: '한혜선', phone: '0414 367 738', agedCare: false, address: '22 Huntingdale cir Castle Hill', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0067', name: '김지연', phone: '0404 005 122', agedCare: false, address: '22 Kooba ave Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0068', name: '이혜명', phone: '0425 435 469', agedCare: false, address: '22 Kristy Court,Kellyville', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0069', name: '김미진', phone: '0403 474 111', agedCare: false, address: '22/61peninsula Dr breakfastpoint', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0070', name: '박옥선', phone: '0420 854 700', agedCare: false, address: '22-26 ANN STREET LIDCOMBE', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0071', name: 'Anna Hyatt', phone: '0423 886 856', agedCare: false, address: '23 steward st, Lilyfield NSW 2040', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0072', name: '이희경', phone: '0434 619 618', agedCare: false, address: '24 windermere ave northmead', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0073', name: 'young', phone: '0402 005 190', agedCare: false, address: '25 Cumberlamb st, epping', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0074', name: '김봉두', phone: '0409 207 807', agedCare: false, address: '25 meredith st Bankstown building 1 1002호', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0075', name: '김현진', phone: '0433 933 800', agedCare: false, address: '26 Tomah st Carlingford nsw 2118', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0076', name: '안지연', phone: '0430 482 944', agedCare: false, address: '26/1-9 Mark st Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0077', name: '이은정', phone: '0421 728 072', agedCare: false, address: '26A Alice St. Turramurra', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0078', name: '이상미', phone: '0425 249 123', agedCare: false, address: '26A South Parade Campsie', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0079', name: '강인희', phone: '0402 851 926', agedCare: false, address: '27 Rondelay Dr castle hill 2154', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0080', name: '이은성', phone: '0434 584 737', agedCare: false, address: '289-295 Sussex St, Sydney NSW 2000', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0081', name: '문경희', phone: '0421 289 029', agedCare: false, address: '28Barney st. North parramatta', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0082', name: '홍수정', phone: '0431 770 022', agedCare: false, address: '29 apps ave, north turramurra', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0083', name: 'kun young kang(강건영)', phone: '0430 102 854', agedCare: false, address: '2A/ 2b help st, chatswood NSW 2067', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0084', name: '세라 콜린스(정원미)', phone: '0418 379 124', agedCare: false, address: '3 Murray rose ave, sydney Olympic Park', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0085', name: '올리비아전', phone: '0420 961 010', agedCare: false, address: '3 Sommer Street, Gables NSW 2765', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0086', name: '박영미', phone: '0449 936 368', agedCare: false, address: '3/26 East Parade Eastwood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0087', name: 'soungheeyi', phone: '0409 700 688', agedCare: false, address: '303 A Warringah rd Beacon hill 2100 Nsw', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0088', name: '티파니맘', phone: '0424 838 092', agedCare: false, address: '30A kelvin rd st ives', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0089', name: '박정선', phone: '0414 382 662', agedCare: false, address: '31 beechworth road pymble', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0090', name: '조정미', phone: '0424 930 015', agedCare: false, address: '33 CRITERION CRES DOONSIDE', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0091', name: '권현숙', phone: '0433 894 833', agedCare: false, address: '33/4-6 Mercer St, Castlehills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0092', name: 'June Jeong', phone: '0422 523 566', agedCare: false, address: '34 lona Avenue, North Rocks 2151', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0093', name: '의전모피', phone: '0416 412 100', agedCare: false, address: '35-39 brodie st Rydalmere 2116', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0094', name: '임은정', phone: '0410 618 945', agedCare: false, address: '37 Kissing Point Road Turramurra Nsw 2074', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0095', name: 'jenna lee', phone: '0404 832 283', agedCare: false, address: '37 tooth ave Newington', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0096', name: '김정자', phone: '0400 459 429', agedCare: false, address: '4 Gillian Pde West Pymble', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0097', name: '신현자', phone: '0435 735 010', agedCare: false, address: '4 willandra rd, woongarrh', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0098', name: '오영주', phone: '0425 222 150', agedCare: false, address: '4/10-12 beamish st. Campsie NSW 2194', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0099', name: 'Sonia Young', phone: '0400 826 411', agedCare: false, address: '4/8 Sybil st. Eastwood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0100', name: '클레어윤', phone: '0410 800 999', agedCare: false, address: '40 nelson st Gordon', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0101', name: '송효정', phone: '0438 285 375', agedCare: false, address: '41 Perry St North Rocks 2151', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0102', name: '소니아', phone: '0412 234 341', agedCare: false, address: '414/20 Railway st Lidcomebe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0103', name: '다이나(김순옥)', phone: '0423 926 900', agedCare: false, address: '43yates avenue Dundas Valley', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0104', name: 'soon', phone: '0423 788 911', agedCare: false, address: '44 Pennant Pde Caringford', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0105', name: 'Julie Kim', phone: '0452 380 432', agedCare: false, address: '45/3-7 Taylor Street Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0106', name: '진성숙', phone: '0433 080 778', agedCare: false, address: '5 Africa Way Colebee', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0107', name: '김희숙', phone: '0415 106 819', agedCare: true, address: '5 Mcdonald way, greenacre NSW2190', grade: '일반', joinDate: '2025-04-21', memo: 'payments@kagedcare.com.au 인보이스보내기' },
  { id: 'C0108', name: 'jessica J', phone: '0430 790 727', agedCare: false, address: '5/25 Livingstone Rd. Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0109', name: '최남순', phone: '0430 704 719', agedCare: true, address: '55 Third Ave, Campsie NSW 2194', grade: '일반', joinDate: '2025-04-21', memo: 'payments@kagedcare.com.au 인보이스보내기' },
  { id: 'C0110', name: '지현 김영옥 시누', phone: '0432 711 789', agedCare: false, address: '56 Linden Way, Castlecrag', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0111', name: '박태경', phone: '0415 762 153', agedCare: false, address: '56 Morshead st North Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0112', name: '이영은', phone: '0405 196 375', agedCare: false, address: '56 Reilleys road Winston Hills 2153', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0113', name: '죠엔', phone: '0486 350 080', agedCare: false, address: '56 Reilleys road Winston Hills 2153', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문, 카톡중복주문 확인' },
  { id: 'C0114', name: '민혜진', phone: '0451 995 382', agedCare: false, address: '59 the parkway beaumont hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0115', name: '서경미', phone: '0455 999 061', agedCare: false, address: '6 bond place kellyville 2155 NSW', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0116', name: '소이맘', phone: '0415 288 757', agedCare: false, address: '6 Dunbar cl. Normanhurst. 2076', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0117', name: '장혜선', phone: '0404 978 929', agedCare: false, address: '6 imperial rd, castlehill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0118', name: '누나', phone: '0434 197 016', agedCare: false, address: '6 kirriford way, carlingford', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0119', name: '문애령', phone: '0433 840 224', agedCare: false, address: '6 Shakespeare st Compsie', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0120', name: 'grace kim', phone: '0434 585 737', agedCare: false, address: '61 grose st. North Parramatta', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0121', name: '곽수연', phone: '0423 338 085', agedCare: false, address: '63 Belmont Street Merrylands', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0122', name: '윤성원', phone: '0433 001 499', agedCare: false, address: '68 De Castella Dr. Blacktown', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0123', name: '김은경', phone: '0422 124 485', agedCare: false, address: '6a culgoa Av, eastwood,NSW 2123', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0124', name: '강명준', phone: '0450 027 548', agedCare: false, address: '7 julian place sefton', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0125', name: '이수연', phone: '0413 991 662', agedCare: false, address: '7 Lynette Ave Carlingford.', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0126', name: '이서연', phone: '0433 528 383', agedCare: false, address: '7 narelle ave pymble', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0127', name: '윤경', phone: '0402 754 676', agedCare: false, address: '7 Railway Street Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0128', name: '문환할머니(Moon Hwan Yea)', phone: '0422 880 594', agedCare: false, address: '7 Telfer pl. westtmead 2145', grade: '일반', joinDate: '2025-04-21', memo: '36(김치값 20%)' },
  { id: 'C0129', name: '피터할아버지(Peter Yea)', phone: '0422 880 594', agedCare: false, address: '7 Telfer pl. westtmead 2145', grade: '일반', joinDate: '2025-04-21', memo: '20(김치값 20%)' },
  { id: 'C0130', name: '이주연', phone: '0400 234 052', agedCare: false, address: '7 Vincent St Baulkham Hills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0131', name: '송미현', phone: '0420 907 879', agedCare: false, address: '702/63 west parade west Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0132', name: '이소연', phone: '0424 472 361', agedCare: false, address: '73 Middle Harbour Road, Linfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0133', name: '차홍주', phone: '0468 481 583', agedCare: false, address: '76 water street Strathfield south', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0134', name: '박정주', phone: '0430 918 875', agedCare: false, address: '76A Avon rd North ryde 2113', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문/베송비' },
  { id: 'C0135', name: '장휘자', phone: '0426 067 715', agedCare: true, address: '7a Burke st Concord west', grade: '일반', joinDate: '2025-04-21', memo: '코디/장보은' },
  { id: 'C0136', name: 'Felicity(이정임)', phone: '0405 106 908', agedCare: false, address: '7A Hollis Ave Denistone East', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0137', name: 'Leanne&Wilson(Miyoung Seong)', phone: '0416 633 845', agedCare: false, address: '8 Ashburton ave South Turramurra 2074', grade: '일반', joinDate: '2025-04-21', memo: '1인, 2건주문, 배송지 다름' },
  { id: 'C0138', name: '노희왕', phone: '0403 156 438', agedCare: true, address: '8 Fairview Street, Concord', grade: '일반', joinDate: '2025-04-21', memo: '수건 3개지급,개인부담 $36 /강민경LW코디' },
  { id: 'C0139', name: '김지선', phone: '0488 995 377', agedCare: false, address: '8/8 Field pl Telopea nsw2117', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0140', name: '주희', phone: '0404 767 215', agedCare: false, address: '8-10 Cambridge Street, Cammeray', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0141', name: '제니남', phone: '0410 480 090', agedCare: false, address: '85 Juno Pde, Greenacre Nsw 2190', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0142', name: '김미리', phone: '0415 186 972', agedCare: false, address: '9 Macmahon Street Hurstville 2220', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0143', name: '박은', phone: '0405 141 062', agedCare: false, address: '9 William Place north rocks', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0144', name: '이병일', phone: '0402 254 346', agedCare: false, address: '9 windermere rd Epping 2121 nsw', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0145', name: '백현주', phone: '0434 261 314', agedCare: false, address: '90A Lucinda Avenue South Wahroonga', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0146', name: 'jay', phone: '0433 499 611', agedCare: false, address: '99/22 gadigal ave zetland NSW 2017', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0147', name: '이아가다', phone: '0414 967 858', agedCare: false, address: 'APT 806, 26 Cambridge Street, Epping 2121', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0148', name: '벨라 윤', phone: '0431 638 679', agedCare: false, address: 'Block B.Unit 67/132 killeaton St.STIVES', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0149', name: 'Kong Duck Sung', phone: '0414 942 405', agedCare: false, address: 'C4/4 C Ennis RD Mildons Point NSW 2061', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0150', name: '이진주', phone: '0433 022 306', agedCare: false, address: 'Central Coast: 6 Kalua drive chittaway', grade: '일반', joinDate: '2025-04-21', memo: '수목금 혼스비로/나머지는 센트럴코스트로 1012/135-137 Pacific Highway, Hornsby,Nsw 2077' },
  { id: 'C0151', name: '이영수', phone: '0435 836 177', agedCare: false, address: 'J602 27-28 George Street North Strathfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0152', name: 'Eddie', phone: '0451 236 322', agedCare: false, address: 'Shop 2 77 Berry Street North Sydney. Yurica Japanese Kitchen', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0153', name: '강민경', phone: '0433 662 723', agedCare: true, address: 'Suite 112B/20 Lexington Dr, Bella Vista NSW 2153', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $72/강민경LW코디/인보이스 2장으로나눠발행' },
  { id: 'C0154', name: 'J burwood 타꾸미스시', phone: '0430 706 452', agedCare: false, address: 'U G24,1 Kingfisher Street Lidcombe 2141', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0155', name: 'office next', phone: '0402 474 478', agedCare: false, address: 'U13 231 Queen St Concord West', grade: '일반', joinDate: '2025-04-21', memo: '게이트에서 13# 누르면 됨' },
  { id: 'C0156', name: 'Joanne', phone: '0430 016 312', agedCare: false, address: 'U1608 2B Help Street Chatwood', grade: '일반', joinDate: '2025-04-21', memo: '카톡 중복 신청 체크' },
  { id: 'C0157', name: '김윤정', phone: '0434 162 835', agedCare: false, address: 'U223/20-34 albert road strathfield nsw', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0158', name: '송수영', phone: '0405 310 880', agedCare: false, address: 'U4, 20 dora crescent dundas NSW 2117', grade: '일반', joinDate: '2025-04-21', memo: '문자주문/픽업가능/배송여부확인' },
  { id: 'C0159', name: '정은령', phone: '0413 789 641', agedCare: false, address: 'U701/2f Appleroth street Melrose Park', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0160', name: '김준경', phone: '0481 248 164', agedCare: false, address: 'U90 6-10 Ramsey street waitara', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0161', name: '미카엘라', phone: '0434 311 688', agedCare: false, address: 'Unit 1 1236-1244 Canterbury Rd Roselands 2196', grade: '일반', joinDate: '2025-04-21', memo: '5/10일전 배송' },
  { id: 'C0162', name: '박종철', phone: '0425 833 510', agedCare: false, address: 'unit 1, 10-12 Carrington St, Wahroonga NSW 2076', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0163', name: 'BYOUNGHOI CHO', phone: '0451 057 995', agedCare: false, address: 'unit 1, 25-29, Nancarrow Ave. Ryde 2112', grade: '일반', joinDate: '2025-04-21', memo: '대표님 명함 전달' },
  { id: 'C0164', name: '손규미', phone: '0424 393 500', agedCare: false, address: 'Unit 20/4-8 bobbin head road Pymble', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0165', name: '이슬기', phone: '0432 115 986', agedCare: false, address: 'Unit 311 2C appleroth st Melrose park 2114', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0166', name: '김문수 삼대한의원', phone: '0481 252 425', agedCare: false, address: 'Unit 35/11 epping Park Drive Epping', grade: '일반', joinDate: '2025-04-21', memo: '한의원아님' },
  { id: 'C0167', name: '이청(Ken)', phone: '0410 346 413', agedCare: false, address: 'Unit 6/24 Skarratt Street , silverwater', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0168', name: '이호준', phone: '0424 240 516', agedCare: false, address: 'unit 602. 42-50 Parramatta rd. Homebush', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0169', name: '이종순', phone: '0433 124 843', agedCare: true, address: 'unit 614/15 Barton Road, Artarmon', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $36 /강민경LW코디' },
  { id: 'C0170', name: 'sue(조숙자)', phone: '0416 22 5757', agedCare: false, address: 'Unit 8/ 40-44 Fullers Road, Chatswood.', grade: '일반', joinDate: '2025-04-21', memo: '문자, 카톡 주문' },
  { id: 'C0171', name: '손수미', phone: '0433 751 996', agedCare: false, address: 'Unit4/14-16 Station st. Homebush', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0172', name: '안젤라', phone: '0421 699 805', agedCare: false, address: 'Unit6/3Arthersleigh St. Burwood NSW2134', grade: '일반', joinDate: '2025-04-21', memo: '계좌이체' },
  { id: 'C0173', name: '원영자', phone: '042 578 8500', agedCare: false, address: '픽업', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0174', name: '김혜자', phone: '0431 688 008', agedCare: false, address: '70 Victoria rd, Ermington', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0175', name: '김훈(대표님)', phone: '', agedCare: false, address: '', grade: '일반', joinDate: '2025-04-21', memo: '대표님 예약' },
  { id: 'C0176', name: '선우성 Hurstville(대표님)', phone: '', agedCare: false, address: '', grade: '일반', joinDate: '2025-04-21', memo: '대표님 예약' },
  { id: 'C0177', name: '엄주일(대표님)', phone: '', agedCare: false, address: '', grade: '일반', joinDate: '2025-04-21', memo: '대표님 예약' },
  { id: 'C0178', name: '유진배', phone: '0415 701 340', agedCare: false, address: '502/17 Barton Rd, Artarmon', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0179', name: '유한관', phone: '0406 288 303', agedCare: true, address: '2/8-12 Fitzwilliam Rd.Toongabbie', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 19.50/ ka지나코디(승조앤코디)' },
  { id: 'C0180', name: '이카타리나', phone: '0413 223 447', agedCare: false, address: '4 Dalmar Place, Carlingford', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0181', name: '이풍자', phone: '0433 968 785', agedCare: false, address: '11 princess st, lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0182', name: '손용주 (Yong Joo Son)', phone: '0411 793 733', agedCare: true, address: 'unit 217/2B Help Street, Chatswood, NSW, 2067', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $24/강민경LW코디' },
  { id: 'C0183', name: '이명희', phone: '', agedCare: false, address: 'Campsie', grade: '일반', joinDate: '2025-04-22', memo: '신규-차량E' },
  { id: 'C0184', name: '이성자', phone: '', agedCare: false, address: 'Five Dock', grade: '일반', joinDate: '2025-04-22', memo: '신규-차량D' }
];

const INITIAL_ITEMS = [
  { code: 'P001', name: '배추김치 4KG', spec: '배추김치 4kg', price: 70, realStock: 300, baechu: 1, chonggak: 0, memo: '냉장배송 / 기본상품', isSet: false },
  { code: 'P002', name: '총각김치 2KG', spec: '총각김치 2kg', price: 55, realStock: 150, baechu: 0, chonggak: 1, memo: '냉장배송 / 기본상품', isSet: false },
  { code: 'P003', name: '혼합세트 (배추4KG + 총각2KG)', spec: '배추김치4kg + 총각김치2kg', price: 120, realStock: null, baechu: 1, chonggak: 1, memo: '냉장배송 / 세트할인', isSet: true },
  { code: 'P004', name: '배추김치 4KG - 2세트(할인)', spec: '배추김치 4kg x 2', price: 130, realStock: null, baechu: 2, chonggak: 0, memo: '냉장배송 / 세트할인', isSet: true },
  { code: 'P005', name: '배추김치 4KG - 3세트(할인)', spec: '배추김치 4kg x 3', price: 180, realStock: null, baechu: 3, chonggak: 0, memo: '냉장배송 / 세트할인', isSet: true },
  { code: 'P006', name: '총각김치 2KG - 2세트(할인)', spec: '총각김치 2kg x 2', price: 100, realStock: null, baechu: 0, chonggak: 2, memo: '냉장배송 / 세트할인', isSet: true },
];

const INITIAL_ORDERS = [
  { id: 'ORD-0001', date: '2025-04-21', customerId: 'C0001', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '10:28' },
  { id: 'ORD-0002', date: '2025-04-21', customerId: 'C0002', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 2, arrivalTime: '08:08' },
  { id: 'ORD-0003', date: '2025-04-21', customerId: 'C0003', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 5, arrivalTime: '08:40' },
  { id: 'ORD-0004', date: '2025-04-21', customerId: 'C0004', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 4, arrivalTime: '08:33' },
  { id: 'ORD-0005', date: '2025-04-21', customerId: 'C0005', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 29, arrivalTime: '12:40' },
  { id: 'ORD-0006', date: '2025-04-21', customerId: 'C0006', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 24, arrivalTime: '11:46' },
  { id: 'ORD-0007', date: '2025-04-21', customerId: 'C0007', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 22, arrivalTime: '11:26' },
  { id: 'ORD-0008', date: '2025-04-21', customerId: 'C0008', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 29, arrivalTime: '12:18' },
  { id: 'ORD-0009', date: '2025-04-21', customerId: 'C0009', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 13, arrivalTime: '11:12' },
  { id: 'ORD-0010', date: '2025-04-21', customerId: 'C0010', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 2, arrivalTime: '08:08' },
  { id: 'ORD-0011', date: '2025-04-21', customerId: 'C0011', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 26, arrivalTime: '12:05' },
  { id: 'ORD-0012', date: '2025-04-21', customerId: 'C0012', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:58' },
  { id: 'ORD-0013', date: '2025-04-21', customerId: 'C0013', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 2, arrivalTime: '08:08' },
  { id: 'ORD-0014', date: '2025-04-21', customerId: 'C0014', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '09:49' },
  { id: 'ORD-0015', date: '2025-04-21', customerId: 'C0015', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '10:11' },
  { id: 'ORD-0016', date: '2025-04-21', customerId: 'C0016', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 26, arrivalTime: '11:49' },
  { id: 'ORD-0017', date: '2025-04-21', customerId: 'C0017', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '10:08' },
  { id: 'ORD-0018', date: '2025-04-21', customerId: 'C0018', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '09:13' },
  { id: 'ORD-0019', date: '2025-04-21', customerId: 'C0018', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '09:13' },
  { id: 'ORD-0020', date: '2025-04-21', customerId: 'C0019', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '취소', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: '', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0021', date: '2025-04-21', customerId: 'C0020', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0022', date: '2025-04-21', customerId: 'C0020', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0023', date: '2025-04-21', customerId: 'C0021', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '11:37' },
  { id: 'ORD-0024', date: '2025-04-21', customerId: 'C0022', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 29, arrivalTime: '12:39' },
  { id: 'ORD-0025', date: '2025-04-21', customerId: 'C0023', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '09:38' },
  { id: 'ORD-0026', date: '2025-04-21', customerId: 'C0024', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 21, arrivalTime: '11:06' },
  { id: 'ORD-0027', date: '2025-04-21', customerId: 'C0025', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0028', date: '2025-04-21', customerId: 'C0026', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '10:24' },
  { id: 'ORD-0029', date: '2025-04-21', customerId: 'C0027', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:23' },
  { id: 'ORD-0030', date: '2025-04-21', customerId: 'C0027', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:23' },
  { id: 'ORD-0031', date: '2025-04-21', customerId: 'C0028', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 16, arrivalTime: '11:58' },
  { id: 'ORD-0032', date: '2025-04-21', customerId: 'C0029', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 29, arrivalTime: '12:30' },
  { id: 'ORD-0033', date: '2025-04-21', customerId: 'C0030', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 16, arrivalTime: '10:18' },
  { id: 'ORD-0034', date: '2025-04-21', customerId: 'C0031', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 10, arrivalTime: '09:12' },
  { id: 'ORD-0035', date: '2025-04-21', customerId: 'C0032', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:10' },
  { id: 'ORD-0036', date: '2025-04-21', customerId: 'C0032', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:10' },
  { id: 'ORD-0037', date: '2025-04-21', customerId: 'C0033', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '10:03' },
  { id: 'ORD-0038', date: '2025-04-21', customerId: 'C0034', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '08:56' },
  { id: 'ORD-0039', date: '2025-04-21', customerId: 'C0035', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:23' },
  { id: 'ORD-0040', date: '2025-04-21', customerId: 'C0036', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 3, arrivalTime: '08:16' },
  { id: 'ORD-0041', date: '2025-04-21', customerId: 'C0037', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 4, arrivalTime: '08:24' },
  { id: 'ORD-0042', date: '2025-04-21', customerId: 'C0038', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:42' },
  { id: 'ORD-0043', date: '2025-04-21', customerId: 'C0039', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 29, arrivalTime: '12:36' },
  { id: 'ORD-0044', date: '2025-04-21', customerId: 'C0040', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '11:01' },
  { id: 'ORD-0045', date: '2025-04-21', customerId: 'C0041', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 27, arrivalTime: '12:21' },
  { id: 'ORD-0046', date: '2025-04-21', customerId: 'C0042', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '09:41' },
  { id: 'ORD-0047', date: '2025-04-21', customerId: 'C0043', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 30, arrivalTime: '13:07' },
  { id: 'ORD-0048', date: '2025-04-21', customerId: 'C0044', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0049', date: '2025-04-21', customerId: 'C0045', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '12:59' },
  { id: 'ORD-0050', date: '2025-04-21', customerId: 'C0046', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 3, arrivalTime: '08:18' },
  { id: 'ORD-0051', date: '2025-04-21', customerId: 'C0047', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '12:45' },
  { id: 'ORD-0052', date: '2025-04-21', customerId: 'C0048', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 3, arrivalTime: '08:18' },
  { id: 'ORD-0053', date: '2025-04-21', customerId: 'C0049', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '10:16' },
  { id: 'ORD-0054', date: '2025-04-21', customerId: 'C0050', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '10:35' },
  { id: 'ORD-0055', date: '2025-04-21', customerId: 'C0050', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '10:35' },
  { id: 'ORD-0056', date: '2025-04-21', customerId: 'C0051', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '10:27' },
  { id: 'ORD-0057', date: '2025-04-21', customerId: 'C0051', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '10:27' },
  { id: 'ORD-0058', date: '2025-04-21', customerId: 'C0052', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 2, arrivalTime: '08:08' },
  { id: 'ORD-0059', date: '2025-04-21', customerId: 'C0053', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0060', date: '2025-04-21', customerId: 'C0054', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '10:33' },
  { id: 'ORD-0061', date: '2025-04-21', customerId: 'C0054', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '10:33' },
  { id: 'ORD-0062', date: '2025-04-21', customerId: 'C0055', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 16, arrivalTime: '10:19' },
  { id: 'ORD-0063', date: '2025-04-21', customerId: 'C0056', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '취소', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: '', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0064', date: '2025-04-21', customerId: 'C0057', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 22, arrivalTime: '11:14' },
  { id: 'ORD-0065', date: '2025-04-21', customerId: 'C0058', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 26, arrivalTime: '12:04' },
  { id: 'ORD-0066', date: '2025-04-21', customerId: 'C0059', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 7, arrivalTime: '09:20' },
  { id: 'ORD-0067', date: '2025-04-21', customerId: 'C0060', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '09:04' },
  { id: 'ORD-0068', date: '2025-04-21', customerId: 'C0061', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '10:52' },
  { id: 'ORD-0069', date: '2025-04-21', customerId: 'C0062', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '09:58' },
  { id: 'ORD-0070', date: '2025-04-21', customerId: 'C0063', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '10:14' },
  { id: 'ORD-0071', date: '2025-04-21', customerId: 'C0064', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 5, arrivalTime: '08:48' },
  { id: 'ORD-0072', date: '2025-04-21', customerId: 'C0065', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 13, arrivalTime: '09:49' },
  { id: 'ORD-0073', date: '2025-04-21', customerId: 'C0066', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 13, arrivalTime: '09:55' },
  { id: 'ORD-0074', date: '2025-04-21', customerId: 'C0067', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 23, arrivalTime: '11:36' },
  { id: 'ORD-0075', date: '2025-04-21', customerId: 'C0068', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0076', date: '2025-04-21', customerId: 'C0068', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0077', date: '2025-04-21', customerId: 'C0069', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 21, arrivalTime: '11:18' },
  { id: 'ORD-0078', date: '2025-04-21', customerId: 'C0070', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '09:33' },
  { id: 'ORD-0079', date: '2025-04-21', customerId: 'C0071', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '11:00' },
  { id: 'ORD-0080', date: '2025-04-21', customerId: 'C0072', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 4, arrivalTime: '08:41' },
  { id: 'ORD-0081', date: '2025-04-21', customerId: 'C0073', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 5, arrivalTime: '08:38' },
  { id: 'ORD-0082', date: '2025-04-21', customerId: 'C0074', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 16, arrivalTime: '10:22' },
  { id: 'ORD-0083', date: '2025-04-21', customerId: 'C0075', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:12' },
  { id: 'ORD-0084', date: '2025-04-21', customerId: 'C0076', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 10, arrivalTime: '09:25' },
  { id: 'ORD-0085', date: '2025-04-21', customerId: 'C0077', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 31, arrivalTime: '12:55' },
  { id: 'ORD-0086', date: '2025-04-21', customerId: 'C0078', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 21, arrivalTime: '11:09' },
  { id: 'ORD-0087', date: '2025-04-21', customerId: 'C0079', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 10, arrivalTime: '09:31' },
  { id: 'ORD-0088', date: '2025-04-21', customerId: 'C0080', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '11:48' },
  { id: 'ORD-0089', date: '2025-04-21', customerId: 'C0081', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 5, arrivalTime: '08:49' },
  { id: 'ORD-0090', date: '2025-04-21', customerId: 'C0082', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '09:20' },
  { id: 'ORD-0091', date: '2025-04-21', customerId: 'C0083', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 2, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 25, arrivalTime: '11:56' },
  { id: 'ORD-0092', date: '2025-04-21', customerId: 'C0084', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:32' },
  { id: 'ORD-0093', date: '2025-04-21', customerId: 'C0085', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 4, arrivalTime: '08:30' },
  { id: 'ORD-0094', date: '2025-04-21', customerId: 'C0086', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 30, arrivalTime: '12:40' },
  { id: 'ORD-0095', date: '2025-04-21', customerId: 'C0087', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 25, arrivalTime: '11:52' },
  { id: 'ORD-0096', date: '2025-04-21', customerId: 'C0088', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:29' },
  { id: 'ORD-0097', date: '2025-04-21', customerId: 'C0088', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:29' },
  { id: 'ORD-0098', date: '2025-04-21', customerId: 'C0089', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 30, arrivalTime: '12:47' },
  { id: 'ORD-0099', date: '2025-04-21', customerId: 'C0090', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:48' },
  { id: 'ORD-0100', date: '2025-04-21', customerId: 'C0091', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '09:39' },
  { id: 'ORD-0101', date: '2025-04-21', customerId: 'C0092', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 3, arrivalTime: '08:16' },
  { id: 'ORD-0102', date: '2025-04-21', customerId: 'C0093', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '09:15' },
  { id: 'ORD-0103', date: '2025-04-21', customerId: 'C0094', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '09:28' },
  { id: 'ORD-0104', date: '2025-04-21', customerId: 'C0095', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 13, arrivalTime: '09:57' },
  { id: 'ORD-0105', date: '2025-04-21', customerId: 'C0096', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 33, arrivalTime: '13:11' },
  { id: 'ORD-0106', date: '2025-04-21', customerId: 'C0097', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '취소', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: '', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0107', date: '2025-04-21', customerId: 'C0098', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 22, arrivalTime: '11:17' },
  { id: 'ORD-0108', date: '2025-04-21', customerId: 'C0099', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 31, arrivalTime: '12:50' },
  { id: 'ORD-0109', date: '2025-04-21', customerId: 'C0100', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '09:53' },
  { id: 'ORD-0110', date: '2025-04-21', customerId: 'C0101', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 2, arrivalTime: '08:08' },
  { id: 'ORD-0111', date: '2025-04-21', customerId: 'C0102', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 8, arrivalTime: '09:09' },
  { id: 'ORD-0112', date: '2025-04-21', customerId: 'C0103', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 5, arrivalTime: '08:34' },
  { id: 'ORD-0113', date: '2025-04-21', customerId: 'C0104', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:48' },
  { id: 'ORD-0114', date: '2025-04-21', customerId: 'C0105', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '09:41' },
  { id: 'ORD-0115', date: '2025-04-21', customerId: 'C0106', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:50' },
  { id: 'ORD-0116', date: '2025-04-21', customerId: 'C0106', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:50' },
  { id: 'ORD-0117', date: '2025-04-21', customerId: 'C0107', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '10:30' },
  { id: 'ORD-0118', date: '2025-04-21', customerId: 'C0108', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '09:57' },
  { id: 'ORD-0119', date: '2025-04-21', customerId: 'C0108', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '09:57' },
  { id: 'ORD-0120', date: '2025-04-21', customerId: 'C0109', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 24, arrivalTime: '11:33' },
  { id: 'ORD-0121', date: '2025-04-21', customerId: 'C0109', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 24, arrivalTime: '11:33' },
  { id: 'ORD-0122', date: '2025-04-21', customerId: 'C0110', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 23, arrivalTime: '11:20' },
  { id: 'ORD-0123', date: '2025-04-21', customerId: 'C0111', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 22, arrivalTime: '11:12' },
  { id: 'ORD-0124', date: '2025-04-21', customerId: 'C0112', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 23, arrivalTime: '11:22' },
  { id: 'ORD-0125', date: '2025-04-21', customerId: 'C0113', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 24, arrivalTime: '11:30' },
  { id: 'ORD-0126', date: '2025-04-21', customerId: 'C0114', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 7, arrivalTime: '09:02' },
  { id: 'ORD-0127', date: '2025-04-21', customerId: 'C0115', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 3, arrivalTime: '08:16' },
  { id: 'ORD-0128', date: '2025-04-21', customerId: 'C0116', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:40' },
  { id: 'ORD-0129', date: '2025-04-21', customerId: 'C0116', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:40' },
  { id: 'ORD-0130', date: '2025-04-21', customerId: 'C0117', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '09:47' },
  { id: 'ORD-0131', date: '2025-04-21', customerId: 'C0117', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '09:47' },
  { id: 'ORD-0132', date: '2025-04-21', customerId: 'C0118', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 7, arrivalTime: '08:56' },
  { id: 'ORD-0133', date: '2025-04-21', customerId: 'C0119', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 23, arrivalTime: '11:25' },
  { id: 'ORD-0134', date: '2025-04-21', customerId: 'C0120', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 7, arrivalTime: '09:05' },
  { id: 'ORD-0135', date: '2025-04-21', customerId: 'C0121', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 25, arrivalTime: '11:50' },
  { id: 'ORD-0136', date: '2025-04-21', customerId: 'C0122', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 10, arrivalTime: '09:59' },
  { id: 'ORD-0137', date: '2025-04-21', customerId: 'C0123', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 32, arrivalTime: '13:00' },
  { id: 'ORD-0138', date: '2025-04-21', customerId: 'C0124', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 27, arrivalTime: '12:13' },
  { id: 'ORD-0139', date: '2025-04-21', customerId: 'C0125', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 11, arrivalTime: '09:28' },
  { id: 'ORD-0140', date: '2025-04-21', customerId: 'C0126', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 13, arrivalTime: '09:36' },
  { id: 'ORD-0141', date: '2025-04-21', customerId: 'C0127', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 30, arrivalTime: '12:46' },
  { id: 'ORD-0142', date: '2025-04-21', customerId: 'C0128', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 6, arrivalTime: '08:57' },
  { id: 'ORD-0143', date: '2025-04-21', customerId: 'C0129', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 3, arrivalTime: '08:33' },
  { id: 'ORD-0144', date: '2025-04-21', customerId: 'C0130', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '10:58' },
  { id: 'ORD-0145', date: '2025-04-21', customerId: 'C0130', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '10:58' },
  { id: 'ORD-0146', date: '2025-04-21', customerId: 'C0131', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '10:36' },
  { id: 'ORD-0147', date: '2025-04-21', customerId: 'C0132', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 16, arrivalTime: '10:02' },
  { id: 'ORD-0148', date: '2025-04-21', customerId: 'C0133', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '10:36' },
  { id: 'ORD-0149', date: '2025-04-21', customerId: 'C0134', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 21, arrivalTime: '11:02' },
  { id: 'ORD-0150', date: '2025-04-21', customerId: 'C0135', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 24, arrivalTime: '11:42' },
  { id: 'ORD-0151', date: '2025-04-21', customerId: 'C0136', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:22' },
  { id: 'ORD-0152', date: '2025-04-21', customerId: 'C0136', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:22' },
  { id: 'ORD-0153', date: '2025-04-21', customerId: 'C0137', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 32, arrivalTime: '13:03' },
  { id: 'ORD-0154', date: '2025-04-21', customerId: 'C0138', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 23, arrivalTime: '11:34' },
  { id: 'ORD-0155', date: '2025-04-21', customerId: 'C0139', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 7, arrivalTime: '08:50' },
  { id: 'ORD-0156', date: '2025-04-21', customerId: 'C0140', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 21, arrivalTime: '10:57' },
  { id: 'ORD-0157', date: '2025-04-21', customerId: 'C0141', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '10:38' },
  { id: 'ORD-0158', date: '2025-04-21', customerId: 'C0142', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '10:58' },
  { id: 'ORD-0159', date: '2025-04-21', customerId: 'C0143', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 1, arrivalTime: '08:00' },
  { id: 'ORD-0160', date: '2025-04-21', customerId: 'C0144', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 13, arrivalTime: '09:48' },
  { id: 'ORD-0161', date: '2025-04-21', customerId: 'C0145', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:04' },
  { id: 'ORD-0162', date: '2025-04-21', customerId: 'C0146', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0, sequence: 17, arrivalTime: '12:10' },
  { id: 'ORD-0163', date: '2025-04-21', customerId: 'C0147', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 4, arrivalTime: '08:28' },
  { id: 'ORD-0164', date: '2025-04-21', customerId: 'C0148', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 26, arrivalTime: '12:13' },
  { id: 'ORD-0165', date: '2025-04-21', customerId: 'C0149', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '10:46' },
  { id: 'ORD-0166', date: '2025-04-21', customerId: 'C0149', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '10:46' },
  { id: 'ORD-0167', date: '2025-04-21', customerId: 'C0150', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '취소', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: '', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0168', date: '2025-04-21', customerId: 'C0151', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 30, arrivalTime: '12:26' },
  { id: 'ORD-0169', date: '2025-04-21', customerId: 'C0152', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '10:38' },
  { id: 'ORD-0170', date: '2025-04-21', customerId: 'C0153', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 3, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone3', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '10:47' },
  { id: 'ORD-0171', date: '2025-04-21', customerId: 'C0154', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '10:05' },
  { id: 'ORD-0172', date: '2025-04-21', customerId: 'C0154', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 15, arrivalTime: '10:05' },
  { id: 'ORD-0173', date: '2025-04-21', customerId: 'C0155', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 25, arrivalTime: '11:50' },
  { id: 'ORD-0174', date: '2025-04-21', customerId: 'C0156', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 26, arrivalTime: '12:06' },
  { id: 'ORD-0175', date: '2025-04-21', customerId: 'C0157', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 27, arrivalTime: '12:02' },
  { id: 'ORD-0176', date: '2025-04-21', customerId: 'C0158', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 4, arrivalTime: '08:26' },
  { id: 'ORD-0177', date: '2025-04-21', customerId: 'C0159', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 32, arrivalTime: '12:52' },
  { id: 'ORD-0178', date: '2025-04-21', customerId: 'C0160', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 5, arrivalTime: '08:32' },
  { id: 'ORD-0179', date: '2025-04-21', customerId: 'C0161', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '10:49' },
  { id: 'ORD-0180', date: '2025-04-21', customerId: 'C0162', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 7, arrivalTime: '08:48' },
  { id: 'ORD-0181', date: '2025-04-21', customerId: 'C0163', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '10:44' },
  { id: 'ORD-0182', date: '2025-04-21', customerId: 'C0163', itemName: '배추김치 4KG - 3세트(할인)', qty: 2, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '10:44' },
  { id: 'ORD-0183', date: '2025-04-21', customerId: 'C0163', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 19, arrivalTime: '10:44' },
  { id: 'ORD-0184', date: '2025-04-21', customerId: 'C0164', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '09:44' },
  { id: 'ORD-0185', date: '2025-04-21', customerId: 'C0165', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 31, arrivalTime: '12:44' },
  { id: 'ORD-0186', date: '2025-04-21', customerId: 'C0166', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 12, arrivalTime: '09:38' },
  { id: 'ORD-0187', date: '2025-04-21', customerId: 'C0167', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 10, arrivalTime: '09:32' },
  { id: 'ORD-0188', date: '2025-04-21', customerId: 'C0168', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 14, arrivalTime: '10:08' },
  { id: 'ORD-0189', date: '2025-04-21', customerId: 'C0169', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 22, arrivalTime: '11:10' },
  { id: 'ORD-0190', date: '2025-04-21', customerId: 'C0170', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 27, arrivalTime: '12:16' },
  { id: 'ORD-0191', date: '2025-04-21', customerId: 'C0171', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 16, arrivalTime: '10:24' },
  { id: 'ORD-0192', date: '2025-04-21', customerId: 'C0172', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 18, arrivalTime: '10:46' },
  { id: 'ORD-0193', date: '2025-04-21', customerId: 'C0173', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0194', date: '2025-04-21', customerId: 'C0174', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 27, arrivalTime: '12:13' },
  { id: 'ORD-0195', date: '2025-04-21', customerId: 'C0175', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0196', date: '2025-04-21', customerId: 'C0176', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0197', date: '2025-04-21', customerId: 'C0177', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone6', isService: false, isPickup: false, cashReceived: 0 },
  { id: 'ORD-0198', date: '2025-04-21', customerId: 'C0178', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone1', isService: false, isPickup: false, cashReceived: 0, sequence: 24, arrivalTime: '11:30' },
  { id: 'ORD-0199', date: '2025-04-21', customerId: 'C0179', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 2, arrivalTime: '08:23' },
  { id: 'ORD-0200', date: '2025-04-21', customerId: 'C0180', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 10, arrivalTime: '09:20' },
  { id: 'ORD-0201', date: '2025-04-21', customerId: 'C0181', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 9, arrivalTime: '09:17' },
  { id: 'ORD-0202', date: '2025-04-21', customerId: 'C0182', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: 'Zone2', isService: false, isPickup: false, cashReceived: 0, sequence: 28, arrivalTime: '12:26' },
  { id: 'ORD-0203', date: '2025-04-22', customerId: 'C0183', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '신규 고객', shipDate: '', arriveDate: '', shippingGroup: 'Zone5', isService: false, isPickup: false, cashReceived: 0, sequence: 25, arrivalTime: '' },
  { id: 'ORD-0204', date: '2025-04-22', customerId: 'C0184', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '신규 고객', shipDate: '', arriveDate: '', shippingGroup: 'Zone4', isService: false, isPickup: false, cashReceived: 0, sequence: 20, arrivalTime: '' }
];

const STORAGE_KEYS = { customers: 'wh:v6:customers', items: 'wh:v6:items', orders: 'wh:v6:orders' };

// 크롬/공유링크에서는 localStorage 사용, Claude 환경에서는 window.storage 사용
async function loadData(key, fallback) {
  // 먼저 localStorage 시도 (크롬에서 잘 작동)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = window.localStorage.getItem(key);
      if (local) return JSON.parse(local);
    }
  } catch (e) { console.warn('localStorage read failed', e); }
  // Claude의 window.storage 시도
  try {
    if (typeof window !== 'undefined' && window.storage && window.storage.get) {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : fallback;
    }
  } catch (e) { console.warn('window.storage read failed', e); }
  return fallback;
}

async function saveData(key, data) {
  const jsonStr = JSON.stringify(data);
  // localStorage에 저장 (크롬에서 잘 작동)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, jsonStr);
    }
  } catch (e) { console.warn('localStorage write failed', e); }
  // window.storage에도 저장 (Claude 환경 호환)
  try {
    if (typeof window !== 'undefined' && window.storage && window.storage.set) {
      await window.storage.set(key, jsonStr);
    }
  } catch (e) { console.warn('window.storage write failed', e); }
}

async function deleteData(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) { console.warn('localStorage delete failed', e); }
  try {
    if (typeof window !== 'undefined' && window.storage && window.storage.delete) {
      await window.storage.delete(key);
    }
  } catch (e) { console.warn('window.storage delete failed', e); }
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
// ============================================================
const GRADE_VIP_THRESHOLD = 2000;
const GRADE_PREMIUM_THRESHOLD = 500;

function calcCustomerGrade(customerId, orders, items) {
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
  'Zone1': 'Upper North Shore',
  'Zone2': 'Beecroft·Epping·Ryde',
  'Zone3': 'Kellyville·Castle Hill',
  'Zone4': 'Parramatta·Burwood',
  'Zone5': 'Strathfield·Campsie',
  'Zone6': '서부 외곽·City',
  'Zone7': 'Hurstville·Kogarah',
  'Zone8': 'Eastwood·Chatswood',
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
    // 자동등급 계산
    const autoGrade = totalSpent >= GRADE_VIP_THRESHOLD ? 'VIP' : totalSpent >= GRADE_PREMIUM_THRESHOLD ? '우수' : '일반';
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
  const totalBaechu = orders.reduce((s, o) => {
    const it = items.find(i => i.name === o.itemName);
    return s + (it ? it.baechu * o.qty : 0);
  }, 0);
  const totalChonggak = orders.reduce((s, o) => {
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
const SESSION_HOURS = 24; // 1일 자동로그인
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

// 🔐 관리자 비밀번호 변경
function setAdminPassword(newPassword) {
  try {
    if (newPassword === DEFAULT_PASSWORD) {
      // 기본값과 같으면 저장 안 하고 삭제 (깔끔하게)
      localStorage.removeItem(PASSWORD_KEY);
    } else {
      localStorage.setItem(PASSWORD_KEY, newPassword);
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

function getAuthSession() {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) return null;
    const session = JSON.parse(data);
    if (Date.now() > session.expires) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function saveAuthSession(sessionData = {}) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ expires, ...sessionData }));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
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
// 🔐 관리자 비밀번호 변경 모달
// ============================================================
function ChangePasswordModal({ onClose, showToast }) {
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

    // 1. 현재 비밀번호 확인
    if (currentPwd !== getAdminPassword()) {
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

    // 저장
    if (setAdminPassword(newPwd)) {
      showToast('🔐 비밀번호가 변경되었습니다');
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
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(getAttempts());
  const [timeLeft, setTimeLeft] = useState(0);

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

    // 1. 관리자 비밀번호 확인
    if (input === getAdminPassword()) {
      saveAuthSession({ role: 'admin' });
      saveAttempts({ count: 0, lockedUntil: 0 });
      onSuccess({ role: 'admin' });
      return;
    }

    // 2. 배송기사 비밀번호 확인
    const driver = verifyDriver(input, drivers);
    if (driver) {
      saveAuthSession({ role: 'driver', driverId: driver.id, driverName: driver.name });
      saveAttempts({ count: 0, lockedUntil: 0 });
      onSuccess({ role: 'driver', driver });
      return;
    }

    // 3. 실패
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
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-stone-900 flex items-center justify-center p-4"
      style={{ fontFamily: "'Pretendard', -apple-system, 'Malgun Gothic', sans-serif" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap');
        .font-serif-ko { font-family: 'Gowun Batang', serif; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .shake { animation: shake 0.5s; }
      `}</style>

      <div className={`w-full max-w-md ${shake ? 'shake' : ''}`}>
        {/* 로고 + 타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur mb-4 text-5xl">
            🥬
          </div>
          <h1 className="font-serif-ko text-3xl font-bold text-white mb-2">워커힐김치</h1>
          <div className="text-sm tracking-[0.5em] text-red-200/80 font-semibold pl-2">OMS</div>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          {isLocked ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="font-serif-ko text-xl font-bold text-red-800 mb-2">접속 차단됨</h2>
              <p className="text-sm text-stone-600 mb-4">
                비밀번호를 너무 많이 틀렸습니다.
              </p>
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="text-xs text-red-600 mb-1">차단 해제까지</div>
                <div className="text-3xl font-bold text-red-800 tabular-nums">
                  {formatTimeLeft(timeLeft)}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="font-serif-ko text-xl font-bold text-stone-800 mb-1">로그인</h2>
              <p className="text-xs text-stone-500 mb-5">비밀번호를 입력해주세요</p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">비밀번호</label>
                <input
                  type="password"
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  autoFocus
                  placeholder="••••••••••••"
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
                    error ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-red-700 focus:ring-2 focus:ring-red-100'
                  }`}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!input}
                className="w-full py-3 bg-gradient-to-br from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg transition-all"
              >
                🔓 로그인
              </button>

              <div className="mt-5 pt-4 border-t border-stone-100 space-y-1.5">
                <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
                  <span className="text-base">👔</span>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-stone-700">관리자</div>
                    <div className="text-[10px] text-stone-500">전체 시스템 접근 가능</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-sky-50 rounded-lg">
                  <span className="text-base">🚚</span>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-sky-800">배송기사</div>
                    <div className="text-[10px] text-sky-600">담당 Zone 배송 확인 전용</div>
                  </div>
                </div>
                <div className="text-[10px] text-stone-400 text-center pt-1">
                  🔐 24시간 자동로그인 · 5회 오류 시 10분 차단
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-6 text-[11px] text-red-200/60">
          © 2026 워커힐김치 OMS
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'driver'
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

  // 로그인 체크 (앱 시작 시)
  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setIsAuthed(true);
      setUserRole(session.role || 'admin');
      if (session.role === 'driver' && session.driverId) {
        setCurrentDriver({ id: session.driverId, name: session.driverName });
      }
    }
    setAuthChecked(true);
  }, []);

  // 🔥 Firebase 연결 상태
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'connecting' : 'local');
  const initialSyncDoneRef = useRef(false);
  // Firebase에서 받은 데이터로 업데이트 중인지 여부 (무한루프 방지)
  const isReceivingFromFirebaseRef = useRef(false);

  // ⚡ 데이터 로드 - Firebase 연결된 경우 실시간 구독, 아니면 localStorage
  useEffect(() => {
    let unsubCustomers = null;
    let unsubItems = null;
    let unsubOrders = null;
    let unsubDrivers = null;

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
              console.warn('⚠️ Firebase 오류 - 로컬 모드로 전환:', errCode);
              setSyncStatus('error');
            }
          };

          // 5초 내 연결 확인 안 되면 오프라인 처리
          const connectionTimeout = setTimeout(() => {
            setSyncStatus(current => current === 'connecting' ? 'error' : current);
          }, 5000);

          unsubCustomers = subscribeToTable(TABLES.customers, (data) => {
            clearTimeout(connectionTimeout);
            if (data.length === 0 && !initialSyncDoneRef.current) {
              // Firestore 비어있음 → 초기 마이그레이션 (최초 1회만)
              console.log('🔄 초기 데이터 마이그레이션 중...');
              saveBatch(TABLES.customers, localC);
              saveBatch(TABLES.items, localI);
              saveBatch(TABLES.orders, localO);
              saveBatch(TABLES.drivers, localD);
              initialSyncDoneRef.current = true;
            } else if (data.length > 0) {
              // 🔑 핵심: 현재 state와 내용이 실제로 다를 때만 업데이트
              _setCustomersInternal(current => {
                if (arraysEqual(current, data)) return current; // 같으면 참조 그대로 유지
                saveData(STORAGE_KEYS.customers, data);
                return data;
              });
              initialSyncDoneRef.current = true;
            }
            setSyncStatus('synced');
          }, handleFirebaseError);

          unsubItems = subscribeToTable(TABLES.items, (data) => {
            if (data.length > 0) {
              _setItemsInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(STORAGE_KEYS.items, data);
                return data;
              });
            }
          }, handleFirebaseError);

          unsubOrders = subscribeToTable(TABLES.orders, (data) => {
            if (data.length > 0) {
              _setOrdersInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(STORAGE_KEYS.orders, data);
                return data;
              });
            }
          }, handleFirebaseError);

          unsubDrivers = subscribeToTable(TABLES.drivers, (data) => {
            if (data.length > 0) {
              _setDriversInternal(current => {
                if (arraysEqual(current, data)) return current;
                saveData(DRIVERS_KEY, data);
                return data;
              });
            }
          }, handleFirebaseError);
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
    };
  }, []);

  // 🔧 공개 setter들 - 로컬 저장 + Firebase 저장
  // (Firestore onSnapshot은 내용 비교로 무한루프 방지)
  const setCustomers = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(customers) : newValue;
    _setCustomersInternal(resolved);
    saveData(STORAGE_KEYS.customers, resolved);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      saveBatch(TABLES.customers, resolved);
    }
  };

  const setItems = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(items) : newValue;
    // availStock은 계산된 값이므로 저장 시 제거 (Supabase 스키마에 없음)
    const cleaned = resolved.map(item => {
      const { availStock, ...clean } = item;
      return clean;
    });
    _setItemsInternal(cleaned);
    saveData(STORAGE_KEYS.items, cleaned);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      saveBatch(TABLES.items, cleaned);
    }
  };

  const setOrders = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(orders) : newValue;
    _setOrdersInternal(resolved);
    saveData(STORAGE_KEYS.orders, resolved);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      saveBatch(TABLES.orders, resolved);
    }
  };

  const setDrivers = (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(drivers) : newValue;
    _setDriversInternal(resolved);
    saveData(DRIVERS_KEY, resolved);
    if (isSupabaseConfigured && initialSyncDoneRef.current) {
      saveBatch(TABLES.drivers, resolved);
    }
  };

  // 🎁 사은품 저장 래퍼 (localStorage만)
  const saveGifts = (newGifts) => {
    const resolved = typeof newGifts === 'function' ? newGifts(gifts) : newGifts;
    setGifts(resolved);
    saveData(GIFT_STORAGE_KEY, resolved);
  };

  const itemsWithStock = useMemo(() => calcAvailStock(items, orders), [items, orders]);

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthed(false);
    setUserRole(null);
    setCurrentDriver(null);
  };

  const handleLoginSuccess = (result) => {
    setIsAuthed(true);
    setUserRole(result.role);
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
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'orders', label: '주문관리', icon: ShoppingCart },
    { id: 'customers', label: '고객관리', icon: Users },
    { id: 'items', label: '품목/재고', icon: Package },
    { id: 'gifts', label: '사은품', icon: Package },
    { id: 'shipping', label: '배송관리', icon: Truck },
    { id: 'drivers', label: '기사관리', icon: Truck },
  ];

  const lowStockCount = itemsWithStock.filter(i => i.availStock <= 20).length;

  return (
    <div className="min-h-screen bg-[#FAF7F2]" style={{ fontFamily: "'Pretendard', -apple-system, 'Malgun Gothic', sans-serif" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap');
        .font-serif-ko { font-family: 'Gowun Batang', serif; }
        .scrollbar-slim::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-slim::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-slim::-webkit-scrollbar-thumb { background: #D4C9B8; border-radius: 3px; }
      `}</style>

      <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-stone-200 flex flex-col z-20">
        <button
          onClick={() => {
            // 대시보드로 이동 후 페이지 새로고침
            setView('dashboard');
            // 짧은 지연 후 새로고침 (view 전환이 먼저 반영되도록)
            setTimeout(() => window.location.reload(), 50);
          }}
          className="px-5 pt-6 pb-4 border-b border-stone-100 hover:bg-stone-50 active:bg-stone-100 transition-all group text-left w-full"
          title="대시보드로 이동 + 새로고침"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-white text-lg group-hover:scale-105 group-active:scale-95 transition-transform">🥬</div>
            <div>
              <div className="font-serif-ko text-lg font-bold text-stone-800 leading-tight group-hover:text-red-800 transition-colors">워커힐김치</div>
              <div className="text-xs tracking-[0.4em] text-stone-400 font-semibold pl-1">OMS</div>
            </div>
          </div>
        </button>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                view === id ? 'bg-red-50 text-red-800 ring-1 ring-red-100' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === 'items' && lowStockCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-600 text-white">{lowStockCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-stone-100 space-y-3">
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 🗂️ 섹션 1: 전체 데이터 백업 */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">💾 전체 데이터 백업</span>
            </div>
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
            <BackupRestoreButton
              setCustomers={setCustomers}
              setItems={setItems}
              setOrders={setOrders}
              showToast={showToast}
            />
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* 🚚 섹션 2: 배차 관리 (통합) */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">🚚 배차 관리</span>
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

      <main className="ml-60 min-h-screen">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-stone-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif-ko text-2xl font-bold text-stone-800">
              {nav.find(n => n.id === view)?.label}
            </h1>
            <div className="text-xs text-stone-500 mt-0.5">
              {view === 'dashboard' && '매출·주문·배송 현황을 한눈에'}
              {view === 'orders' && '주문을 등록하고 카톡 메시지를 생성하세요'}
              {view === 'customers' && '고객 정보를 관리하세요 (최대 5,000명)'}
              {view === 'items' && '품목과 재고를 관리하세요'}
              {view === 'gifts' && '사은품 이벤트와 자동 지급 기준을 관리하세요'}
              {view === 'shipping' && '배송 상태를 업데이트하세요'}
              {view === 'drivers' && '배송기사 계정을 관리하고 담당 Zone을 지정하세요'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 🔥 실시간 동기화 상태 */}
            {isSupabaseConfigured ? (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ring-1 ${
                syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                syncStatus === 'connecting' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                'bg-red-50 text-red-700 ring-red-200'
              }`} title={syncStatus === 'synced' ? '실시간 동기화 중 (Firebase)' : syncStatus === 'connecting' ? '연결 중...' : '오프라인'}>
                {syncStatus === 'synced' ? (
                  <>
                    <Cloud size={12} />
                    <span className="tabular-nums">실시간 연결됨</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </>
                ) : syncStatus === 'connecting' ? (
                  <>
                    <Cloud size={12} />
                    <span>연결 중...</span>
                  </>
                ) : (
                  <>
                    <CloudOff size={12} />
                    <span>오프라인</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-600 ring-1 ring-stone-200" title="Firebase 미설정 - 로컬 저장 모드">
                <CloudOff size={12} />
                <span>로컬 모드</span>
              </div>
            )}
            {lowStockCount > 0 && (
              <button onClick={() => setView('items')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium ring-1 ring-amber-200 hover:bg-amber-100">
                <Bell size={13} />
                재고 경보 {lowStockCount}건
              </button>
            )}
            <div className="text-right">
              <div className="text-xs text-stone-500">오늘</div>
              <div className="text-sm font-semibold text-stone-800">{new Date().toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {view === 'dashboard' && <Dashboard customers={customers} items={itemsWithStock} orders={orders} gifts={gifts} setView={setView} />}
          {view === 'orders' && <Orders customers={customers} items={itemsWithStock} orders={orders} setOrders={setOrders} gifts={gifts} setGifts={saveGifts} showToast={showToast} />}
          {view === 'customers' && <Customers customers={customers} setCustomers={setCustomers} items={itemsWithStock} orders={orders} showToast={showToast} />}
          {view === 'items' && <Items items={itemsWithStock} setItems={setItems} showToast={showToast} />}
          {view === 'gifts' && <Gifts gifts={gifts} setGifts={saveGifts} orders={orders} setOrders={setOrders} customers={customers} items={itemsWithStock} showToast={showToast} setView={setView} />}
          {view === 'shipping' && <Shipping customers={customers} orders={orders} setOrders={setOrders} showToast={showToast} />}
          {view === 'drivers' && <DriversManagement drivers={drivers} setDrivers={setDrivers} orders={orders} showToast={showToast} />}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          showToast={showToast}
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
    // 자동등급 계산
    const customerGrades = {};
    customers.forEach(c => {
      const total = customerTotalMap[c.id] || 0;
      customerGrades[c.id] = total >= GRADE_VIP_THRESHOLD ? 'VIP' : total >= GRADE_PREMIUM_THRESHOLD ? '우수' : '일반';
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
      const relevant = orders.filter(o => o.itemName === it.name && !o.isService);
      const count = relevant.length;
      const qty = relevant.reduce((s, o) => s + o.qty, 0);
      const sales = qty * it.price;
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
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════ */}
      {/* 🚨 섹션 1: 오늘 확인할 알림 (최우선) */}
      {/* ══════════════════════════════════════════════════ */}
      {(() => {
        const unpaidCount = orders.filter(o => o.paymentStatus === '미결제' && o.shipStatus !== '취소' && !o.isService).length;
        const waitingCount = waitingStockCount;
        const lowStockCount = stats.lowStock;
        const prepareCount = orders.filter(o => o.shipStatus === '배송준비중').length;
        const hasAlerts = unpaidCount > 0 || waitingCount > 0 || lowStockCount > 0 || prepareCount > 0;

        if (!hasAlerts) {
          return (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-bold text-emerald-900 text-sm">모든 것이 순조롭습니다</div>
                <div className="text-xs text-emerald-700">현재 처리할 긴급 사항이 없습니다</div>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-r from-amber-50 via-red-50 to-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔔</span>
              <h3 className="font-bold text-stone-800 text-sm">확인이 필요한 항목</h3>
              <span className="text-[10px] text-stone-500 ml-auto">클릭하여 이동</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {prepareCount > 0 && (
                <button
                  onClick={() => setView('shipping')}
                  className="bg-white hover:bg-blue-50 border border-blue-200 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">📦</span>
                    <span className="text-[10px] font-bold text-blue-700">배송 대기</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 tabular-nums">{prepareCount}<span className="text-xs text-blue-500 ml-0.5">건</span></div>
                  <div className="text-[10px] text-blue-600 mt-0.5 group-hover:underline">→ 배송관리</div>
                </button>
              )}
              {unpaidCount > 0 && (
                <button
                  onClick={() => setView('orders')}
                  className="bg-white hover:bg-red-50 border border-red-200 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">💳</span>
                    <span className="text-[10px] font-bold text-red-700">미결제</span>
                  </div>
                  <div className="text-2xl font-bold text-red-900 tabular-nums">{unpaidCount}<span className="text-xs text-red-500 ml-0.5">건</span></div>
                  <div className="text-[10px] text-red-600 mt-0.5 group-hover:underline">→ 수금 필요</div>
                </button>
              )}
              {waitingCount > 0 && (
                <button
                  onClick={() => setView('orders')}
                  className="bg-white hover:bg-purple-50 border border-purple-200 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">⏳</span>
                    <span className="text-[10px] font-bold text-purple-700">입고대기</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 tabular-nums">{waitingCount}<span className="text-xs text-purple-500 ml-0.5">건</span></div>
                  <div className="text-[10px] text-purple-600 mt-0.5 group-hover:underline">→ 선주문</div>
                </button>
              )}
              {lowStockCount > 0 && (
                <button
                  onClick={() => setView('items')}
                  className="bg-white hover:bg-amber-50 border border-amber-200 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">⚠️</span>
                    <span className="text-[10px] font-bold text-amber-700">재고 부족</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-900 tabular-nums">{lowStockCount}<span className="text-xs text-amber-500 ml-0.5">종</span></div>
                  <div className="text-[10px] text-amber-600 mt-0.5 group-hover:underline">→ 입고 필요</div>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════ */}
      {/* 📊 섹션 2: 핵심 KPI (매출/주문/완료율) */}
      {/* ══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
            <span>📊</span>
            <span>핵심 실적</span>
          </h2>
          <div className="text-[10px] text-stone-400">전체 누적 기준 · 서비스/취소 제외</div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {/* 총 매출 (가장 크게) */}
          <div className="col-span-2 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="opacity-80" />
                <span className="text-xs font-semibold opacity-90">총 매출</span>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-semibold">실매출</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums">${formatNum(stats.totalSales)}</span>
            </div>
            <div className="text-[11px] opacity-80 mt-2 flex items-center gap-3">
              <span>주문 {stats.totalOrders}건</span>
              <span className="opacity-40">|</span>
              <span>평균 ${formatNum(stats.avgOrder)}</span>
            </div>
          </div>

          {/* 배송 완료율 */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Truck size={13} className="text-emerald-600" />
              <span className="text-xs font-semibold text-stone-600">배송 완료율</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-emerald-700 tabular-nums">{stats.deliveryRate.toFixed(1)}</span>
              <span className="text-xs text-stone-400">%</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{width: `${stats.deliveryRate}%`}} />
            </div>
          </div>

          {/* VIP 고객 */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={13} className="text-rose-600" />
              <span className="text-xs font-semibold text-stone-600">고객 현황</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-stone-800 tabular-nums">{customers.length}</span>
              <span className="text-xs text-stone-400">명</span>
            </div>
            <div className="text-[10px] text-rose-700">
              <span className="font-bold">VIP {stats.vipCount}</span>명
              <span className="text-stone-400 mx-1">·</span>
              <span>B2B {customers.filter(c => c.isB2B).length}곳</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 🚚 섹션 3: 배송 현황 + Zone별 (실무 핵심) */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-4">
        {/* 배송 상태 (2/3) */}
        <div className="col-span-2 bg-white border border-stone-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
              <span>🚚</span>
              <span>배송 현황</span>
              {cancelCount > 0 && (
                <span className="text-[10px] text-stone-400 font-normal">(취소 {cancelCount}건 제외)</span>
              )}
            </h2>
            <button onClick={() => setView('shipping')} className="text-[11px] text-stone-500 hover:text-stone-800 font-medium">자세히 →</button>
          </div>

          {/* 4개 상태 한 줄로 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {shipStats.map(s => {
              const activeTotal = orders.filter(o => o.shipStatus !== '취소').length;
              const pct = activeTotal > 0 ? (s.count / activeTotal) * 100 : 0;
              const colors = {
                '배송준비중': 'bg-stone-50 border-stone-200 text-stone-800',
                '출고대기': 'bg-amber-50 border-amber-200 text-amber-900',
                '배송중': 'bg-blue-50 border-blue-200 text-blue-900',
                '배송완료': 'bg-emerald-50 border-emerald-200 text-emerald-900',
              };
              return (
                <div key={s.status} className={`p-3 rounded-xl border-2 ${colors[s.status]}`}>
                  <div className="text-[10px] font-semibold opacity-80 mb-1">{s.status}</div>
                  <div className="text-2xl font-bold tabular-nums leading-tight">{s.count}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>

          {/* Zone별 배송 */}
          <div className="pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-stone-600">Zone별 배송 (취소 제외)</h3>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {SHIPPING_ZONES.map(z => {
                const cnt = orders.filter(o => o.shippingGroup === z && o.shipStatus !== '취소').length;
                return (
                  <div key={z} className={`px-2 py-2 rounded-lg text-center ${ZONE_COLORS[z]}`}>
                    <div className="text-[9px] font-bold opacity-80">{z.replace('Zone', 'Z')}</div>
                    <div className="text-sm font-bold tabular-nums leading-tight">{cnt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* B2B 현황 (1/3) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-700 text-sm flex items-center gap-2">
              <span>🏢</span>
              <span>B2B 거래처</span>
            </h2>
            <button onClick={() => setView('customers')} className="text-[11px] text-stone-500 hover:text-stone-800 font-medium">관리 →</button>
          </div>
          {customers.filter(c => c.isB2B).length > 0 ? (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <div className="text-[10px] text-indigo-700 mb-0.5">거래처 수</div>
                <div className="text-2xl font-bold text-indigo-900 tabular-nums">
                  {customers.filter(c => c.isB2B).length}<span className="text-xs font-normal text-indigo-500 ml-0.5">곳</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="text-[10px] text-red-700 mb-0.5">미수금 합계</div>
                <div className="text-xl font-bold text-red-800 tabular-nums">
                  ${formatNum(customers.filter(c => c.isB2B).reduce((s, c) => s + calcB2BReceivable(c.id, orders, items), 0))}
                </div>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                <div className="text-[10px] text-indigo-700 mb-0.5">B2B 주문</div>
                <div className="text-xl font-bold text-indigo-900 tabular-nums">
                  {orders.filter(o => customers.find(c => c.id === o.customerId)?.isB2B && o.shipStatus !== '취소').length}<span className="text-xs font-normal text-indigo-500 ml-0.5">건</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <span className="text-4xl mb-2 opacity-30">🏢</span>
              <div className="text-xs text-stone-400 mb-3">등록된 거래처가 없습니다</div>
              <button
                onClick={() => setView('customers')}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
              >
                거래처 등록하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 🎁 섹션 3.5: 진행 중 사은품 이벤트 */}
      {/* ══════════════════════════════════════════════════ */}
      {(() => {
        const activeGift = gifts.find(g => g.active);
        if (!activeGift) return null;

        // 지급 현황 계산
        const linkedOrders = orders.filter(o => o.giftId === activeGift.id && o.giftQty > 0 && o.shipStatus !== '취소');
        const givenQty = linkedOrders.reduce((s, o) => s + (o.giftQty || 0), 0);
        const recipientCount = new Set(linkedOrders.map(o => o.customerId)).size;
        const remaining = Math.max(0, (activeGift.totalStock || 0) - givenQty);
        const pct = activeGift.totalStock > 0 ? (givenQty / activeGift.totalStock) * 100 : 0;

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
              {/* 남은 재고 */}
              <div className="bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1">남은 재고</div>
                <div className={`text-2xl font-bold tabular-nums ${
                  remaining === 0 ? 'text-red-700' :
                  remaining <= 50 ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {remaining}<span className="text-xs font-normal text-stone-400 ml-0.5">/{activeGift.totalStock}개</span>
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
              </div>

              {/* 지급 건수 */}
              <div className="bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1">지급 완료</div>
                <div className="text-2xl font-bold text-stone-800 tabular-nums">
                  {recipientCount}<span className="text-xs font-normal text-stone-400 ml-0.5">명</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-2">{givenQty}개 지급됨</div>
              </div>

              {/* 지급 기준 */}
              <div className="col-span-2 bg-white rounded-xl p-3 border border-pink-100">
                <div className="text-[10px] font-bold text-pink-700 mb-1.5">📋 자동 지급 기준</div>
                <div className="space-y-1">
                  {(activeGift.tiers || DEFAULT_GIFT_TIERS).sort((a, b) => a.minAmount - b.minAmount).map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-700">${tier.minAmount} 이상 주문</span>
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
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [msgTarget, setMsgTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
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
  }, [orders, search, yearFilter, monthFilter, zoneFilter, orderTypeFilter, sortKey, sortDir, customerMap, priceMap]);

  useEffect(() => { setDisplayLimit(50); }, [search, yearFilter, monthFilter, zoneFilter, orderTypeFilter]);

  const nextOrderId = () => {
    const nums = orders.map(o => parseInt(o.id.replace('ORD-',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'ORD-' + String(max + 1).padStart(4, '0');
  };

  const handleSave = (order) => {
    if (editTarget) {
      setOrders(orders.map(o => o.id === editTarget.id ? { ...o, ...order, id: editTarget.id } : o));
      showToast('주문이 수정되었습니다');
    } else {
      setOrders([...orders, { id: nextOrderId(), shipStatus: '배송준비중', deliveryMethod: '', paymentType: '', paymentStatus: '미결제', deliveryMemo: '', shipDate: '', arriveDate: '', shippingGroup: '', isService: false, isPickup: false, cashReceived: 0, ...order }]);
      showToast('주문이 등록되었습니다');
    }
    setShowForm(false);
    setEditTarget(null);
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="주문번호, 고객명, 품목 검색..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 shadow-sm"
        >
          <Plus size={16} /> 새 주문 등록
        </button>
      </div>

      {/* 주문 유형 필터 탭 */}
      <div className="bg-white rounded-xl border border-stone-200 p-1 flex items-center gap-1 flex-wrap">
        {[
          { id: 'all', label: '전체', icon: '📋', count: orders.length, activeClass: 'bg-stone-800 text-white' },
          { id: 'b2c', label: '개인 (B2C)', icon: '🏠', count: orders.filter(o => !customerMap[o.customerId]?.isB2B).length, activeClass: 'bg-red-800 text-white' },
          { id: 'b2b', label: '거래처 (B2B)', icon: '🏢', count: orders.filter(o => customerMap[o.customerId]?.isB2B).length, activeClass: 'bg-indigo-700 text-white' },
          { id: 'waiting', label: '입고대기', icon: '⏳', count: orders.filter(o => o.shipStatus === '입고대기').length, activeClass: 'bg-purple-700 text-white' },
          { id: 'split', label: '분할 배송', icon: '📦', count: orders.filter(o => o.splitDeliveries?.length > 0).length, activeClass: 'bg-teal-700 text-white' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setOrderTypeFilter(tab.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              orderTypeFilter === tab.id ? tab.activeClass : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
            <span className={`ml-1.5 text-[10px] ${orderTypeFilter === tab.id ? 'opacity-90' : 'opacity-60'}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* 기간 & Zone 필터 */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-600">📅 기간:</span>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="px-2 py-1.5 border border-stone-200 rounded text-xs bg-white focus:outline-none focus:border-red-700"
          >
            <option value="">전체 년도</option>
            {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-2 py-1.5 border border-stone-200 rounded text-xs bg-white focus:outline-none focus:border-red-700"
          >
            <option value="">전체 월</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m =>
              <option key={m} value={m}>{parseInt(m)}월</option>
            )}
          </select>
        </div>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-stone-600 mr-1">🗺️ Zone:</span>
          <button
            onClick={() => setZoneFilter('')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
              zoneFilter === '' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}>
            전체
          </button>
          {SHIPPING_ZONES.map(z => (
            <button key={z} onClick={() => setZoneFilter(zoneFilter === z ? '' : z)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                zoneFilter === z
                  ? 'bg-stone-800 text-white border-stone-800'
                  : `border-stone-200 ${ZONE_COLORS[z]} hover:opacity-80`
              }`}>
              {z.replace('Zone', 'Z')}
            </button>
          ))}
        </div>
        {(yearFilter || monthFilter || zoneFilter) && (
          <button
            onClick={() => { setYearFilter(''); setMonthFilter(''); setZoneFilter(''); }}
            className="ml-auto text-xs text-stone-500 hover:text-stone-700 underline">
            필터 초기화
          </button>
        )}
        <div className={(yearFilter || monthFilter || zoneFilter) ? "" : "ml-auto"}>
          <span className="text-xs text-stone-500">
            <span className="font-bold text-stone-800">{filtered.length}</span>건 표시
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <SortHeader label="주문번호" field="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="주문일" field="date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="Zone" field="zone" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="고객" field="customer" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="품목" field="item" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="수량" field="qty" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="금액" field="amount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="상태" field="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(o => {
                const c = customerMap[o.customerId];
                const basePrice = priceMap[o.itemName] || 0;
                const isB2B_o = !!c?.isB2B;
                const discount_o = c?.b2bDiscount || 0;
                const unitPrice_o = isB2B_o ? getB2BPrice(basePrice, discount_o) : basePrice;
                const total = unitPrice_o * o.qty;
                // 서비스면 배송료/금액 없음
                const isServ = !!o.isService;
                const isWaitingStock = o.shipStatus === '입고대기';
                const customerTotal = customerTotalMap[o.customerId] || 0;
                const needsShipping = !isServ && !o.isPickup && !isB2B_o && customerTotal < SHIPPING_THRESHOLD;
                const finalTotal = isServ ? 0 : total + (needsShipping ? SHIPPING_FEE : 0);
                return (
                  <tr key={o.id} className={`border-b border-stone-100 hover:bg-stone-50 ${
                    isServ ? 'bg-amber-50/40' :
                    isWaitingStock ? 'bg-purple-50/40' :
                    isB2B_o ? 'bg-indigo-50/30' :
                    c?.agedCare ? 'bg-amber-50/20' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-red-800">{o.id}</span>
                        {isServ && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500 text-white font-bold">🎁 서비스</span>}
                        {o.isPickup && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500 text-white font-bold">📍 픽업</span>}
                        {isWaitingStock && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500 text-white font-bold">⏳ 입고대기</span>}
                        {o.splitDeliveries?.length > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-500 text-white font-bold">📦 분할{o.splitDeliveries.length}회</span>}
                        {o.giftQty > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-pink-500 text-white font-bold" title={o.giftName || '사은품'}>🎁 {o.giftQty}</span>}
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
                    <td className="px-4 py-3 text-stone-700">{o.itemName}</td>
                    <td className="px-4 py-3 text-right text-stone-700 tabular-nums">
                      <div>{o.qty}</div>
                      {isB2B_o && o.qty >= 10 && (
                        <div className="text-[10px] text-indigo-700 font-bold">{Math.ceil(o.qty / 10)}박스</div>
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
    </div>
  );
}

function OrderFormModal({ customers, items, editTarget, gifts = [], orders = [], onSave, onClose }) {
  const [date, setDate] = useState(editTarget?.date || new Date().toISOString().slice(0,10));
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState(editTarget?.customerId || '');
  const [itemName, setItemName] = useState(editTarget?.itemName || '');
  const [qty, setQty] = useState(editTarget?.qty || 1);
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
  ); // null = 자동 계산, 숫자 = 수동 지정

  const matchedCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 8);
    const s = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.id.toLowerCase().includes(s) ||
      c.phone.includes(s)
    ).slice(0, 8);
  }, [customerSearch, customers]);

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedItem = items.find(i => i.name === itemName);
  const isB2B = !!selectedCustomer?.isB2B;
  const discountRate = selectedCustomer?.b2bDiscount || 0;
  const basePrice = selectedItem?.price || 0;
  // 🎯 실제 적용 단가 (오버라이드 > 기본 B2B가 > 할인율 순)
  const unitPrice = selectedItem ? getEffectivePrice(selectedItem, selectedCustomer) : 0;
  const total = unitPrice * qty;
  const savedAmount = (basePrice - unitPrice) * qty;
  // 가격이 어떻게 결정되었는지 추적 (UI 표시용)
  const priceSource = selectedItem && selectedCustomer?.isB2B
    ? (selectedCustomer.itemPriceOverrides?.[selectedItem.code] !== undefined ? 'override'
      : selectedItem.b2bPrice > 0 ? 'itemB2B'
      : discountRate > 0 ? 'discount'
      : 'base')
    : 'base';

  // 박스 단위 표시 (대량 주문)
  const isBulkOrder = isB2B && qty >= 10;

  // 분할 배송 유효성 체크
  const splitTotal = splitDeliveries.reduce((s, d) => s + (Number(d.qty) || 0), 0);
  const splitValid = !showSplitUI || splitTotal === qty;

  const canSubmit = customerId && itemName && qty > 0 && splitValid &&
    (!isPreOrder || !!expectedStockDate);

  // 🎁 사은품 자동 계산 (주문 합계 기반)
  // 같은 고객의 다른 주문 + 현재 주문 합산
  const customerOtherOrdersTotal = useMemo(() => {
    if (!customerId) return 0;
    return orders
      .filter(o => o.customerId === customerId && !o.isService && o.shipStatus !== '취소' && (!editTarget || o.id !== editTarget.id))
      .reduce((s, o) => {
        const it = items.find(i => i.name === o.itemName);
        return s + (it?.price || 0) * o.qty;
      }, 0);
  }, [customerId, orders, items, editTarget]);

  const currentOrderTotal = isService ? 0 : (unitPrice * qty);
  const totalForGift = customerOtherOrdersTotal + currentOrderTotal;
  const autoGiftQty = activeGift ? calcGiftQtyByAmount(totalForGift, activeGift.tiers) : 0;
  // giftQty가 null이면 자동, 숫자면 수동
  const effectiveGiftQty = giftQty === null ? autoGiftQty : giftQty;

  // 분할 배송 추가/제거
  const addSplit = () => {
    setSplitDeliveries([...splitDeliveries, { date: '', qty: 0 }]);
  };
  const removeSplit = (idx) => {
    setSplitDeliveries(splitDeliveries.filter((_, i) => i !== idx));
  };
  const updateSplit = (idx, key, value) => {
    const next = [...splitDeliveries];
    next[idx] = { ...next[idx], [key]: value };
    setSplitDeliveries(next);
  };

  const handleSave = () => {
    if (!canSubmit) return;
    const data = { date, customerId, itemName, qty, isService, isPickup };
    if (isPreOrder) {
      data.shipStatus = '입고대기';
      data.expectedStockDate = expectedStockDate;
    }
    if (showSplitUI && splitDeliveries.length > 0) {
      data.splitDeliveries = splitDeliveries;
    }
    // 🎁 사은품 정보 저장
    if (activeGift && effectiveGiftQty > 0) {
      data.giftId = activeGift.id;
      data.giftName = activeGift.name;
      data.giftQty = effectiveGiftQty;
    } else if (giftQty !== null) {
      // 수동으로 0으로 설정한 경우
      data.giftQty = 0;
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between shadow-sm">
          <h2 className="font-serif-ko text-lg font-bold text-stone-800">
            {editTarget ? '주문 수정' : '새 주문 등록'}
            {isB2B && <span className="ml-2 text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-full font-bold">🏢 B2B</span>}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!canSubmit}
              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              💾 저장
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">주문일</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              고객 조회 {selectedCustomer && <span className="text-red-700 ml-1">✓ {selectedCustomer.name}</span>}
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="이름, 고객ID, 전화번호로 검색..."
                className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto border border-stone-100 rounded-lg divide-y divide-stone-100">
              {matchedCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCustomerId(c.id); setCustomerSearch(''); }}
                  className={`w-full text-left px-3 py-2 hover:bg-stone-50 ${customerId === c.id ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-stone-800">{c.name}</span>
                      {c.isB2B && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">🏢 B2B</span>}
                      {c.isB2B && c.b2bDiscount > 0 && <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">-{c.b2bDiscount}%</span>}
                      {!c.isB2B && <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${gradeStyle(c.grade)}`}>{c.grade}</span>}
                    </div>
                    <span className="text-xs text-stone-500 font-mono">{c.id}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{c.phone} · {c.address}</div>
                </button>
              ))}
              {matchedCustomers.length === 0 && <div className="text-center py-4 text-xs text-stone-400">고객이 없습니다</div>}
            </div>
          </div>

          {/* 🏢 B2B 정보 표시 */}
          {isB2B && selectedCustomer && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-900">🏢 거래처 정보</span>
                <span className="text-[10px] text-indigo-700">{selectedCustomer.b2bPaymentTerms || '즉시결제'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-500">담당자</span>
                  <div className="font-semibold text-stone-800">{selectedCustomer.b2bContact || '-'}</div>
                </div>
                <div>
                  <span className="text-stone-500">할인율</span>
                  <div className="font-bold text-indigo-700">{discountRate}%</div>
                </div>
                <div>
                  <span className="text-stone-500">미수금</span>
                  <div className="font-bold text-red-700">${formatNum(calcB2BReceivable(selectedCustomer.id, [], items))}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">품목</label>
              <select value={itemName} onChange={e => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 bg-white">
                <option value="">선택하세요</option>
                {items.map(i => (
                  <option key={i.code} value={i.name} disabled={i.availStock <= 0 && !isB2B}>
                    {i.name} ({formatWon(i.price)}) {i.availStock <= 0 ? '- 품절' : i.availStock <= 20 ? `- 재고 ${i.availStock}개` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                수량 {isBulkOrder && <span className="ml-1 text-[10px] text-indigo-700 font-bold">({Math.ceil(qty / 10)}박스)</span>}
              </label>
              <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
            </div>
          </div>

          {/* 재고 부족 경고 + 선주문 옵션 */}
          {selectedItem && qty > selectedItem.availStock && (
            <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900">
                  <strong>재고 부족:</strong> 요청 수량 {qty}개 &gt; 가용재고 {selectedItem.availStock}개
                  <br/>선주문으로 등록하면 입고 후 자동 처리됩니다.
                </div>
              </div>
              <label className="flex items-center gap-2 p-2 bg-white rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPreOrder}
                  onChange={e => setIsPreOrder(e.target.checked)}
                  className="w-4 h-4 accent-purple-700"
                />
                <span className="text-xs font-bold text-purple-900">⏳ 선주문으로 등록 (입고 대기)</span>
              </label>
              {isPreOrder && (
                <div>
                  <label className="block text-[10px] font-semibold text-purple-700 mb-1">예상 입고일 *</label>
                  <input
                    type="date"
                    value={expectedStockDate}
                    onChange={e => setExpectedStockDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              )}
            </div>
          )}

          {/* 🏢 B2B 전용: 분할 배송 */}
          {isB2B && qty >= 5 && (
            <div className={`p-3 rounded-xl border-2 ${showSplitUI ? 'bg-indigo-50 border-indigo-300' : 'bg-stone-50 border-stone-200'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSplitUI}
                  onChange={e => {
                    setShowSplitUI(e.target.checked);
                    if (e.target.checked && splitDeliveries.length === 0) {
                      setSplitDeliveries([{ date: '', qty: Math.ceil(qty / 2) }, { date: '', qty: Math.floor(qty / 2) }]);
                    }
                  }}
                  className="w-4 h-4 accent-indigo-700"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-indigo-900">📦 분할 배송</div>
                  <div className="text-[10px] text-indigo-700">한 주문을 여러 날에 나눠 배송</div>
                </div>
              </label>

              {showSplitUI && (
                <div className="mt-3 space-y-2">
                  {splitDeliveries.map((split, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                      <span className="text-xs font-bold text-indigo-700 w-8">{idx + 1}회</span>
                      <input
                        type="date"
                        value={split.date}
                        onChange={e => updateSplit(idx, 'date', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-stone-200 rounded text-xs focus:outline-none focus:border-indigo-700"
                      />
                      <input
                        type="number"
                        min="1"
                        max={qty}
                        value={split.qty}
                        onChange={e => updateSplit(idx, 'qty', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 border border-stone-200 rounded text-xs focus:outline-none focus:border-indigo-700"
                      />
                      <span className="text-[10px] text-stone-500">개</span>
                      <button
                        onClick={() => removeSplit(idx)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={addSplit}
                      className="text-xs text-indigo-700 hover:underline font-semibold"
                    >
                      + 배송일 추가
                    </button>
                    <div className={`text-xs font-bold ${splitTotal === qty ? 'text-emerald-700' : 'text-red-700'}`}>
                      합계: {splitTotal} / {qty}개 {splitTotal === qty ? '✓' : '⚠️ 수량 일치 필요'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isService}
                  onChange={e => setIsService(e.target.checked)}
                  className="w-5 h-5 accent-amber-600"
                />
                <div>
                  <div className="text-sm font-bold text-amber-900">🎁 서비스 주문</div>
                  <div className="text-[10px] text-amber-700">무료 · 매출 제외</div>
                </div>
              </label>
            </div>
            <div className="p-4 bg-sky-50 border-2 border-sky-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPickup}
                  onChange={e => setIsPickup(e.target.checked)}
                  className="w-5 h-5 accent-sky-600"
                />
                <div>
                  <div className="text-sm font-bold text-sky-900">📍 픽업 주문</div>
                  <div className="text-[10px] text-sky-700">배송료 면제</div>
                </div>
              </label>
            </div>
          </div>

          {/* 합계 - B2B 도매가 표시 */}
          <div className={`p-4 rounded-xl ${isService ? 'bg-amber-50 border-2 border-amber-200' : isB2B ? 'bg-indigo-50 border-2 border-indigo-200' : isPickup ? 'bg-sky-50 border-2 border-sky-200' : 'bg-stone-50'}`}>
            {isB2B && !isService && discountRate > 0 && (
              <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-indigo-200">
                <span className="text-stone-600">정가 {formatWon(basePrice)} × {qty}</span>
                <span className="text-stone-400 line-through">{formatWon(basePrice * qty)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className={isService ? 'text-amber-900 font-semibold' : isB2B ? 'text-indigo-900 font-semibold' : isPickup ? 'text-sky-900 font-semibold' : 'text-stone-600'}>
                {isService ? '🎁 서비스 (무료)' : isB2B ? (
                  <span className="flex items-center gap-1.5">
                    🏢 B2B 적용가
                    {priceSource === 'override' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-700 text-white font-bold">🎯 개별가</span>}
                    {priceSource === 'itemB2B' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500 text-white font-bold">📦 상품B2B</span>}
                    {priceSource === 'discount' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-400 text-white font-bold">-{discountRate}%</span>}
                  </span>
                ) : isPickup ? '📍 픽업 (배송료 없음)' : '합계'}
              </span>
              <span className={`text-2xl font-bold tabular-nums ${isService ? 'text-amber-700 line-through' : isB2B ? 'text-indigo-700' : isPickup ? 'text-sky-800' : 'text-red-800'}`}>
                {formatWon(total)}
              </span>
            </div>
            {isB2B && savedAmount > 0 && !isService && (
              <div className="text-[10px] text-indigo-700 text-right mt-1">
                💰 절약 금액: ${formatNum(savedAmount)}
              </div>
            )}
            {isBulkOrder && (
              <div className="text-[10px] text-indigo-700 text-right mt-0.5">
                📦 대량주문: {qty}개 ({Math.ceil(qty / 10)}박스 기준)
              </div>
            )}
            {isService && (
              <div className="text-[10px] text-amber-700 text-right mt-1">
                실제 청구액: $0 · 매출 제외
              </div>
            )}
            {!isService && isPickup && (
              <div className="text-[10px] text-sky-700 text-right mt-1">
                📍 직접 픽업 · 배송료 $10 부과 안 됨
              </div>
            )}
          </div>

          {/* 🎁 사은품 섹션 */}
          {activeGift && !isService && customerId && (
            <div className={`p-4 rounded-xl border-2 transition-all ${
              effectiveGiftQty > 0
                ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300'
                : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <div>
                    <div className="text-sm font-bold text-stone-800">
                      {activeGift.name}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      현재 진행 중 이벤트 · 남은 재고: {activeGift.remaining || activeGift.totalStock}개
                    </div>
                  </div>
                </div>
                {giftQty !== null && (
                  <button
                    type="button"
                    onClick={() => setGiftQty(null)}
                    className="text-[10px] text-stone-500 hover:text-stone-800 underline"
                  >
                    자동으로 되돌리기
                  </button>
                )}
              </div>

              {/* 자동 계산 정보 */}
              <div className="bg-white rounded-lg p-2.5 mb-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-600">고객 총 주문액:</span>
                  <span className="font-bold text-stone-800 tabular-nums">{formatWon(totalForGift)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-0.5">
                  <span className="text-stone-600">자동 계산:</span>
                  <span className="font-bold text-pink-700">
                    {autoGiftQty > 0 ? `${autoGiftQty}개 지급` : '지급 없음 (기준 미달)'}
                  </span>
                </div>
              </div>

              {/* 수량 조정 */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-700 flex-shrink-0">지급 수량:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGiftQty(Math.max(0, effectiveGiftQty - 1))}
                    className="w-8 h-8 bg-white hover:bg-stone-100 border-2 border-stone-300 rounded-lg font-bold text-stone-700"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={effectiveGiftQty}
                    onChange={e => setGiftQty(Number(e.target.value) || 0)}
                    className="w-14 h-8 text-center bg-white border-2 border-pink-300 rounded-lg font-bold text-pink-700 tabular-nums focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setGiftQty(effectiveGiftQty + 1)}
                    className="w-8 h-8 bg-white hover:bg-stone-100 border-2 border-stone-300 rounded-lg font-bold text-stone-700"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-stone-500">개</span>
                {giftQty !== null && giftQty !== autoGiftQty && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                    ⚙️ 수동 조정됨
                  </span>
                )}
              </div>

              {/* 결과 표시 */}
              {effectiveGiftQty > 0 && (
                <div className="mt-3 p-2 bg-pink-100 rounded-lg text-xs text-pink-900 font-semibold text-center">
                  ✨ {activeGift.name} × {effectiveGiftQty}개 지급
                  {giftQty !== null && giftQty > autoGiftQty && (
                    <span className="ml-1 text-amber-700">(VIP/단골 특별 지급)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button
            onClick={handleSave}
            disabled={!canSubmit}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 active:scale-95 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            💾 {editTarget ? '수정' : '등록'}
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

  const orderMsg = `[워커힐김치 주문 안내] ${c?.name}고객님, ${koDate(order.date)}에 ${order.itemName} ${order.qty}개 주문해주셨습니다. 총 $${formatNum(finalTotal)}${shippingLine} 입니다.${giftLine ? ' ' + giftLine.replace(/\n/g, ' ') : ''} 감사합니다~♥`;
  const confirmMsg = `[워커힐김치 배송 전 확인] ${c?.name}고객님, 곧 배송 예정인 주문 내역을 확인 부탁드립니다.\n- 품목: ${order.itemName}\n- 수량: ${order.qty}개\n- 금액: $${formatNum(finalTotal)}${shippingLine}${giftLine}\n- 배송지: ${c?.address}\n내역이 맞으시면 "확인" 답장 부탁드려요~♥`;
  const shipMsg = (order.shipStatus === '배송완료' || order.shipStatus === '배송중') ? `[워커힐김치 배송 안내] ${c?.name}고객님, 주문하신 ${order.itemName} x${order.qty}${giftLine ? ` + ${order.giftName} ${order.giftQty}개(사은품)` : ''}이(가) ${order.shipDate ? order.shipDate + ' 출고되었습니다. ' : '배송 중입니다. '}${order.deliveryMethod ? '(' + order.deliveryMethod + ') ' : ''}감사합니다~♥` : null;

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

function Customers({ customers, setCustomers, items, orders, showToast }) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [agedCareFilter, setAgedCareFilter] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all'); // 'all' | 'b2c' | 'b2b'
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // 성능 최적화: 고객ID → 주문 배열 + 자동등급 미리 계산 (서비스 제외)
  const ordersByCustomer = useMemo(() => {
    const map = {};
    const priceMap = {};
    items.forEach(i => { priceMap[i.name] = i.price || 0; });
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
      const total = map[cid].totalSpent;
      if (total >= GRADE_VIP_THRESHOLD) map[cid].autoGrade = 'VIP';
      else if (total >= GRADE_PREMIUM_THRESHOLD) map[cid].autoGrade = '우수';
      else map[cid].autoGrade = '일반';
    });
    return map;
  }, [orders, items]);

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
    if (search) {
      const s = search.toLowerCase();
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
      {/* 🏷 고객 유형 탭 */}
      <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1">
        {[
          { id: 'all', label: '전체', icon: '👥', count: customers.length, activeClass: 'bg-stone-800 text-white' },
          { id: 'b2c', label: '개인 고객', icon: '🏠', count: customers.filter(c => !c.isB2B).length, activeClass: 'bg-red-800 text-white' },
          { id: 'b2b', label: '거래처 (B2B)', icon: '🏢', count: customers.filter(c => c.isB2B).length, activeClass: 'bg-indigo-700 text-white' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCustomerTypeFilter(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              customerTypeFilter === tab.id ? tab.activeClass : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
            <span className={`ml-2 text-[10px] font-semibold ${customerTypeFilter === tab.id ? 'opacity-90' : 'opacity-60'}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 고객ID, 전화, 주소 검색..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {['', 'VIP', '우수', '일반'].map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${gradeFilter === g ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
              {g || '전체등급'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAgedCareFilter(!agedCareFilter)}
          className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
            agedCareFilter
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
          }`}>
          🏥 Aged Care만 ({customers.filter(c => c.agedCare).length})
        </button>
        <div className="text-xs text-stone-500">
          총 <span className="font-bold text-stone-800">{filtered.length}</span>명 / 전체 <span className="font-bold text-stone-800">{customers.length}</span>명
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 shadow-sm"
        >
          <Plus size={16} /> 고객 추가
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <SortHeader label="고객ID" field="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="성함" field="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="연락처" field="phone" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주소</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문 품목</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">구분</th>
                <SortHeader label="등급(자동)" field="grade" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="주문" field="orderCount" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="구매액" field="totalSpent" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
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
                  <tr key={c.id} className={`border-b border-stone-100 hover:bg-stone-50 ${c.agedCare ? 'bg-amber-50/30' : ''}`}>
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
              <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">품목코드</th>
              <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">품목명</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">💰 원가</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">🏠 B2C 판매가</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">🏢 B2B 도매가</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">마진율</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">실재고</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">가용재고</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">상태</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
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
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(statusCounts).map(([k, v]) => (
          <button key={k} onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              statusFilter === k ? 'border-red-700 bg-red-50' : 'border-stone-200 bg-white hover:border-stone-300'
            }`}>
            <div className="text-xs text-stone-500 font-medium mb-1">{k}</div>
            <div className="text-2xl font-bold text-stone-800 tabular-nums">{v}</div>
          </button>
        ))}
      </div>

      {/* Zone 필터 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-stone-700">🗺️ 배송 Zone별 필터</span>
          </div>
          {(zoneFilter || paymentFilter || statusFilter || pickupFilter) && (
            <button
              onClick={() => { setZoneFilter(''); setPaymentFilter(''); setStatusFilter(''); setPickupFilter(false); }}
              className="text-xs text-stone-500 hover:text-stone-700 underline">
              모든 필터 해제
            </button>
          )}
        </div>
        {/* 전체 버튼 (윗줄 풀 너비) */}
        <button
          onClick={() => setZoneFilter('')}
          className={`w-full px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all mb-2 ${
            zoneFilter === '' ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}>
          전체 <span className="font-normal opacity-80 ml-1">{orders.length}건</span>
        </button>
        {/* Zone 1~8 버튼 (4x2 배열) */}
        <div className="grid grid-cols-4 gap-2">
          {SHIPPING_ZONES.map(z => (
            <button key={z} onClick={() => setZoneFilter(zoneFilter === z ? '' : z)}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                zoneFilter === z
                  ? 'border-stone-800 bg-stone-800 text-white'
                  : `border-stone-200 ${ZONE_COLORS[z]} hover:opacity-80`
              }`}>
              {z.replace('Zone', 'Zone ')}
              <div className="text-[10px] font-normal opacity-70 mt-0.5">{zoneCounts[z]}건</div>
            </button>
          ))}
        </div>
        {/* 결제상태 / 픽업 필터 */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-stone-600">💳 결제상태:</span>
          <button
            onClick={() => setPaymentFilter(paymentFilter === '결제완료' ? '' : '결제완료')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              paymentFilter === '결제완료' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}>
            ✓ 결제완료 {orders.filter(o => o.paymentStatus === '결제완료').length}건
          </button>
          <button
            onClick={() => setPaymentFilter(paymentFilter === '미결제' ? '' : '미결제')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              paymentFilter === '미결제' ? 'bg-red-700 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}>
            ✗ 미결제 {unpaidCount}건
          </button>
          <div className="w-px h-4 bg-stone-200 mx-1" />
          <span className="text-xs font-semibold text-stone-600">📍 픽업:</span>
          <button
            onClick={() => setPickupFilter(!pickupFilter)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              pickupFilter ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}>
            📍 픽업만 {orders.filter(o => o.isPickup).length}건
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <SortHeader label="주문번호" field="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="Zone" field="zone" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <SortHeader label="고객" field="customer" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문내역</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">배송지</th>
                <SortHeader label="출고일" field="shipDate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">배송방법</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">결제방식</th>
                <SortHeader label="결제상태" field="payment" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">메모</th>
                <SortHeader label="상태" field="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="center" />
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(o => {
                const c = customerMap[o.customerId];
                const isServ = !!o.isService;
                return (
                  <tr key={o.id} className={`border-b border-stone-100 hover:bg-stone-50 ${isServ ? 'bg-amber-50/40' : o.isPickup ? 'bg-sky-50/40' : ''}`}>
                    <td className="px-4 py-3">
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

  // 각 이벤트별 지급 현황 계산
  const giftStats = useMemo(() => {
    return gifts.map(g => {
      // 이 사은품이 지급된 주문들
      const linkedOrders = orders.filter(o => o.giftId === g.id && o.giftQty > 0 && o.shipStatus !== '취소');
      const givenQty = linkedOrders.reduce((s, o) => s + (o.giftQty || 0), 0);
      const recipientCount = new Set(linkedOrders.map(o => o.customerId)).size;
      return {
        ...g,
        givenQty,
        recipientCount,
        remaining: Math.max(0, (g.totalStock || 0) - givenQty),
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
            {activeGifts.map(g => (
              <GiftCard
                key={g.id}
                gift={g}
                onEdit={() => { setEditTarget(g); setShowForm(true); }}
                onToggle={() => handleToggleActive(g.id)}
                onDelete={() => handleDelete(g.id)}
              />
            ))}
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
            {inactiveGifts.map(g => (
              <GiftCard
                key={g.id}
                gift={g}
                onEdit={() => { setEditTarget(g); setShowForm(true); }}
                onToggle={() => handleToggleActive(g.id)}
                onDelete={() => handleDelete(g.id)}
                inactive
              />
            ))}
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
  const pct = gift.totalStock > 0 ? (gift.givenQty / gift.totalStock) * 100 : 0;

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
            <span className="text-red-800">{gift.givenQty}</span>
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
        워커힐김치 OMS · 배송기사 앱<br/>
        © 2026 Walkerhill Kimchi
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">
              {isFullyPaid ? '✅' : isPartialPaid ? '🔶' : '⚠️'}
            </span>
            <div>
              <div className={`text-[10px] font-bold ${isFullyPaid ? 'text-emerald-800' : isPartialPaid ? 'text-amber-800' : 'text-red-800'}`}>
                {isFullyPaid ? '결제 완료' : isPartialPaid ? `부분 결제 (${paymentPercent}%)` : '미결제'}
              </div>
              <div className={`text-[11px] font-mono tabular-nums ${isFullyPaid ? 'text-emerald-700' : isPartialPaid ? 'text-amber-700' : 'text-red-700'}`}>
                받은 금액: <span className="font-bold">${group.totalPaid}</span> / ${group.finalTotal}
              </div>
            </div>
          </div>
          {!group.hasService || group.finalTotal > 0 ? (
            <button
              onClick={() => onCashClick(group)}
              className="px-3 py-1.5 bg-white border-2 border-current rounded-lg text-xs font-bold active:scale-95 transition-all"
              style={{ color: isFullyPaid ? '#059669' : isPartialPaid ? '#b45309' : '#b91c1c' }}
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
              href={`sms:${phone}?body=${encodeURIComponent(`[워커힐김치] ${customer?.name || ''}고객님, 주문하신 ${group.orders[0]?.itemName || ''} 외 ${group.orders.length - 1}건 배송 중입니다. 잠시 후 도착 예정입니다.`)}`}
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

      const result = parseUploadedExcel(wb, customers, items, orders);

      // 결과가 비어있으면 에러 표시
      if (Object.keys(result.orderUpdates).length === 0 && result.newCustomers.length === 0) {
        showToast('데이터를 찾을 수 없습니다. 양식이 올바른지 확인해주세요.', 'error');
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

    let updatedCustomers = [...customers];
    preview.newCustomers.forEach(nc => {
      if (!updatedCustomers.find(c => c.id === nc.id)) {
        updatedCustomers.push(nc);
      }
    });

    let updatedOrders = orders.map(o => {
      const update = preview.orderUpdates[o.id];
      if (update) {
        return { ...o, ...update };
      }
      const cancel = preview.cancelled.find(c => c.orderId === o.id);
      if (cancel) {
        return { ...o, shipStatus: '취소', shippingGroup: '' };
      }
      return o;
    });

    preview.newOrders.forEach(no => {
      if (!updatedOrders.find(o => o.id === no.id)) {
        updatedOrders.push(no);
      }
    });

    setCustomers(updatedCustomers);
    setOrders(updatedOrders);
    showToast(`✓ 업데이트 완료: 주문 ${Object.keys(preview.orderUpdates).length}건 · 취소 ${preview.cancelled.length}건 · 신규 ${preview.newOrders.length}건`);
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
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        title="현재 주문 데이터로 배차 엑셀 양식 생성"
      >
        <FileDown size={14} />
        <span className="flex-1 text-left">양식 다운로드</span>
        <span className="text-[9px] opacity-80">.xlsx</span>
      </button>

      {/* 2. 엑셀 업로드 */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={parsing}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-indigo-50 border-2 border-indigo-600 text-indigo-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
        title="수정한 배차 엑셀을 업로드하여 배송 정보 적용"
      >
        <Download size={14} className="rotate-180" />
        <span className="flex-1 text-left">{parsing ? '분석 중...' : '배차 업로드'}</span>
        <span className="text-[9px] opacity-60">.xlsx</span>
      </button>

      {/* 3. 도움말 */}
      <button
        onClick={() => setShowHelp(true)}
        className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] text-stone-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
      >
        <span>❓</span>
        <span>배차 업로드 사용법</span>
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
  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif-ko text-xl font-bold text-stone-800">📤 엑셀 업로드 미리보기</h2>
            <div className="text-xs text-stone-500 mt-0.5">변경 내역을 확인하고 적용하세요</div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-800 tabular-nums">{totalUpdates}</div>
              <div className="text-[10px] font-semibold text-blue-700">주문 업데이트</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-800 tabular-nums">{preview.newCustomers.length}</div>
              <div className="text-[10px] font-semibold text-emerald-700">신규 고객</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-800 tabular-nums">{preview.newOrders.length}</div>
              <div className="text-[10px] font-semibold text-amber-700">신규 주문</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-800 tabular-nums">{preview.cancelled.length}</div>
              <div className="text-[10px] font-semibold text-red-700">취소 주문</div>
            </div>
          </div>

          {/* 차량별 배정 요약 */}
          <div>
            <div className="text-sm font-bold text-stone-700 mb-2">🗺️ Zone별 배정 현황</div>
            <div className="grid grid-cols-4 gap-2">
              {SHIPPING_ZONES.map(z => {
                const count = Object.values(preview.orderUpdates).filter(u => u.shippingGroup === z).length;
                return (
                  <div key={z} className={`p-2.5 rounded-lg ${ZONE_COLORS[z]} flex items-center justify-between`}>
                    <div>
                      <div className="text-[11px] font-bold opacity-90">{z.replace('Zone', 'Zone ')}</div>
                    </div>
                    <div className="text-lg font-bold tabular-nums">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 신규 고객 */}
          {preview.newCustomers.length > 0 && (
            <div>
              <div className="text-sm font-bold text-emerald-700 mb-2">✨ 신규 고객</div>
              <div className="bg-emerald-50 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                {preview.newCustomers.map(c => (
                  <div key={c.id} className="text-xs flex items-center justify-between">
                    <span className="font-bold text-emerald-900">{c.name}</span>
                    <span className="text-emerald-600 text-[10px]">{c.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 취소 주문 */}
          {preview.cancelled.length > 0 && (
            <div>
              <div className="text-sm font-bold text-red-700 mb-2">❌ 취소 주문</div>
              <div className="bg-red-50 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                {preview.cancelled.map((c, i) => (
                  <div key={i} className="text-xs flex items-center justify-between">
                    <span className="font-bold text-red-900">{c.customerName || c.orderId}</span>
                    <span className="text-red-600 text-[10px]">{c.reason || '엑셀에서 제외됨'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button onClick={onApply} className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-semibold">
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}

// 엑셀 파싱 로직 - 차량A~F 시트 형식 지원
function parseUploadedExcel(wb, customers, items, orders) {
  const orderUpdates = {}; // orderId -> {shippingGroup, sequence, arrivalTime}
  const newCustomers = [];
  const newOrders = [];
  const cancelled = [];

  // 새 양식: Zone A ~ Zone H 시트명 → Zone1 ~ Zone8
  const zoneSheetMap = {
    'Zone A': 'Zone1', 'Zone B': 'Zone2', 'Zone C': 'Zone3', 'Zone D': 'Zone4',
    'Zone E': 'Zone5', 'Zone F': 'Zone6', 'Zone G': 'Zone7', 'Zone H': 'Zone8',
    // 구 양식 호환 (차량A~F)
    '차량A': 'Zone1', '차량B': 'Zone2', '차량C': 'Zone3',
    '차량D': 'Zone4', '차량E': 'Zone5', '차량F': 'Zone6',
  };

  // 엑셀 No. → 시스템 customerId (C0XXX) 매핑
  const noToCustomerId = (no) => `C${String(no).padStart(4, '0')}`;

  // 이름 → 기존 고객 찾기 (새 양식은 No. 컬럼이 없을 수 있음)
  const customerByName = {};
  customers.forEach(c => {
    if (c.name) customerByName[c.name.trim()] = c;
  });

  // Zone별 시트 파싱
  const processedCustomerIds = new Set();
  for (const [sheetName, zone] of Object.entries(zoneSheetMap)) {
    if (!wb.Sheets[sheetName]) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // 새 양식: 행 0: 제목, 행 1: 출발지, 행 2: 헤더, 행 3+: 데이터
    // 구 양식: 행 0: 제목, 행 1: 출발 정보, 행 2: 헤더, 행 3+: 데이터
    // 컬럼: [순번, 도착시간, 이름, 주소, 연락처, ...]
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const seq = row[0];
      const arrivalTime = row[1];
      const name = row[2] ? String(row[2]).trim() : '';

      // 순번이 있고 이름이 있는 행만 처리
      if (typeof seq !== 'number') continue;
      if (!name) continue;  // 빈 slot 건너뛰기

      // 이름으로 기존 고객 찾기
      const existingCustomer = customerByName[name];

      if (existingCustomer) {
        // 기존 고객의 모든 주문에 배정
        processedCustomerIds.add(existingCustomer.id);
        const custOrders = orders.filter(o => o.customerId === existingCustomer.id && !o.isService);
        if (custOrders.length > 0) {
          custOrders.forEach(o => {
            orderUpdates[o.id] = {
              shippingGroup: zone,
              sequence: Math.floor(seq),
              arrivalTime: String(arrivalTime || ''),
            };
          });
        }
      } else {
        // 신규 고객 + 신규 주문
        const address = String(row[3] || '');
        const phone = String(row[4] || '');
        const newCid = `C${String(customers.length + newCustomers.length + 1).padStart(4, '0')}`;
        newCustomers.push({
          id: newCid,
          name,
          phone,
          agedCare: false,
          address,
          grade: '일반',
          joinDate: new Date().toISOString().slice(0, 10),
          memo: `엑셀 신규 ${sheetName}`,
        });
        processedCustomerIds.add(newCid);

        // 엑셀 품목 수량 읽기 (H~M 컬럼)
        // 새 양식 컬럼: [순번, 도착시간, 이름, 주소, 연락처, 가격, 수금액, 4KG, 4KG*2, 4KG*3, 총각, 총긱2, 혼합]
        const qty4KG = Number(row[7]) || 0;
        const qty4KG2 = Number(row[8]) || 0;
        const qty4KG3 = Number(row[9]) || 0;
        const qtyChonggak = Number(row[10]) || 0;
        const qtyChonggak2 = Number(row[11]) || 0;
        const qtyMix = Number(row[12]) || 0;

        const maxOrderNum = orders.reduce((max, o) => {
          const n = parseInt(o.id.replace('ORD-', ''), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);

        // 품목별로 주문 생성
        const itemQtyPairs = [
          { name: '배추김치 4KG', qty: qty4KG },
          { name: '배추김치 4KG - 2세트(할인)', qty: qty4KG2 },
          { name: '배추김치 4KG - 3세트(할인)', qty: qty4KG3 },
          { name: '총각김치 2KG', qty: qtyChonggak },
          { name: '총각김치 2KG - 2세트(할인)', qty: qtyChonggak2 },
          { name: '혼합세트 (배추4KG + 총각2KG)', qty: qtyMix },
        ];

        const orderedItems = itemQtyPairs.filter(x => x.qty > 0);

        if (orderedItems.length === 0) {
          // 품목 미지정 → 혼합세트 기본값
          const newOrderId = `ORD-${String(maxOrderNum + newOrders.length + 1).padStart(4, '0')}`;
          newOrders.push({
            id: newOrderId,
            date: new Date().toISOString().slice(0, 10),
            customerId: newCid,
            itemName: '혼합세트 (배추4KG + 총각2KG)',
            qty: 1,
            shipStatus: '배송준비중',
            deliveryMethod: '',
            paymentType: '',
            paymentStatus: '미결제',
            deliveryMemo: `엑셀 신규 고객`,
            shipDate: '',
            arriveDate: '',
            shippingGroup: zone,
            isService: false,
            isPickup: false,
            sequence: Math.floor(seq),
            arrivalTime: String(arrivalTime || ''),
          });
        } else {
          orderedItems.forEach(it => {
            const newOrderId = `ORD-${String(maxOrderNum + newOrders.length + 1).padStart(4, '0')}`;
            newOrders.push({
              id: newOrderId,
              date: new Date().toISOString().slice(0, 10),
              customerId: newCid,
              itemName: it.name,
              qty: it.qty,
              shipStatus: '배송준비중',
              deliveryMethod: '',
              paymentType: '',
              paymentStatus: '미결제',
              deliveryMemo: `엑셀 신규 고객`,
              shipDate: '',
              arriveDate: '',
              shippingGroup: zone,
              isService: false,
              isPickup: false,
              sequence: Math.floor(seq),
              arrivalTime: String(arrivalTime || ''),
            });
          });
        }
      }
    }
  }

  // 배정받지 못한 주문 = 취소 (기존 취소/서비스 제외)
  orders.forEach(o => {
    if (!processedCustomerIds.has(o.customerId) && !orderUpdates[o.id] && o.shipStatus !== '취소' && !o.isService) {
      cancelled.push({
        orderId: o.id,
        customerName: customers.find(c => c.id === o.customerId)?.name || o.customerId,
        reason: '엑셀에서 제외됨',
      });
    }
  });

  return { orderUpdates, newCustomers, newOrders, cancelled };
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

    origData.push([
      idx + 1,
      c.name || '',
      c.address || '',
      c.phone || '',
      { f: `G${rowNum}*$G$1+H${rowNum}*$H$1+I${rowNum}*$I$1+J${rowNum}*$J$1+K${rowNum}*$K$1+L${rowNum}*$L$1` }, // 가격 수식
      '', // 수금액
      cols['4KG'], cols['4KG*2'], cols['4KG*3'],
      cols['총각'], cols['총긱2'], cols['혼합'],
      needsShipping ? SHIPPING_FEE : '',
      c.memo || (o.deliveryMemo || ''),
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(origData);
  ws1['!cols'] = [
    {wch:5},{wch:15},{wch:40},{wch:14},{wch:8},{wch:8},
    {wch:6},{wch:6},{wch:6},{wch:6},{wch:6},{wch:6},
    {wch:7},{wch:25}
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

    // 행1: 제목 (Zone A  |  지역명)
    // 행2: 출발지
    // 행3: 헤더
    // 행4~: 데이터
    // 행62: 단가 (H62~N62)
    const header = ['순번', '도착시간', '이름', '주소', '연락처', '가격', '수금액', '4KG', '4KG*2', '4KG*3', '총각', '총긱2', '혼합', '배송비', '비고'];

    const rows = [
      [`Zone ${letter}  |  ${region}`, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
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
          needsShipping ? SHIPPING_FEE : '',
          c.memo || (o.deliveryMemo || ''),
        ]);
      } else {
        // 빈 행 (배차 가능한 slot)
        rows.push([
          idx + 1, '', '', '', '',
          { f: `H${rowNum}*$H$62+I${rowNum}*$I$62+J${rowNum}*$J$62+K${rowNum}*$K$62+L${rowNum}*$L$62+M${rowNum}*$M$62` },
          '', '', '', '', '', '', '', '', ''
        ]);
      }
    }

    // 행 62: 단가 정보
    rows.push(['', '', '', '', '', '', '', 70, 130, 180, 55, 100, 120, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      {wch:5},{wch:9},{wch:15},{wch:40},{wch:14},{wch:8},{wch:8},
      {wch:6},{wch:6},{wch:6},{wch:6},{wch:6},{wch:6},
      {wch:7},{wch:25}
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
