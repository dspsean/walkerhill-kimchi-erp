import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Copy, Check, Package, Users, ShoppingCart, Truck, BarChart3, Download, X, Send, AlertTriangle, TrendingUp, Bell, FileDown, RotateCcw, History } from 'lucide-react';
import * as XLSX from 'xlsx';

const INITIAL_CUSTOMERS = [
  { id: 'C0001', name: '송현숙', phone: '0433 110 140', email: '', address: '2108/3 NETWORK Place North Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0002', name: '정진욱', phone: '0430 152 237', email: '', address: '5 Dairy Farm Way Kellyville NSW 2155', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0003', name: '이성연', phone: '0417 185 558', email: '', address: '#3057 5 Amytis St. Rouse Hill.', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0004', name: '우혜정', phone: '0433 732 432', email: '', address: '1 Ardennes Street Box Hill NSW 2765', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0005', name: 'J eastwood', phone: '0410 448 671', email: '', address: '1 brushbox st sydney olympic park', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0006', name: 'jaemi&ethan', phone: '0431 643 454', email: '', address: '1 Holland st Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0007', name: '양인자', phone: '0410 490 060', email: '', address: '1 Medora Lane Cabarita 2137', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0008', name: '한세라', phone: '0421 989 688', email: '', address: '1 Sherears ave, strathfield', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0009', name: '정연', phone: '0413 096 587', email: '', address: '1/135 ferest rd Arncliffe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0010', name: '최신자 Sin Ja Choi', phone: '0411 261 323', email: '', address: '1/31 Stephen Street, Hornsby, NSW, 2077', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $24/강민경LW코디, 인보이스 2장으로나눠발행' },
  { id: 'C0011', name: '이승희', phone: '0411 248 845', email: '', address: '1/8 marsden road,ermington', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0012', name: '김희정', phone: '0426 294 555', email: '', address: '10 Alonso cr, Schofields', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0013', name: '한정혜(한수)', phone: '0425 154 498', email: '', address: '10 annabelle crescent, kellyville', grade: '일반', joinDate: '2025-04-21', memo: '문자, 카카오채널 중복주문' },
  { id: 'C0014', name: '박향미', phone: '0402 085 437', email: '', address: '10 Diamond Court Newington', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0015', name: '김수현', phone: '0401 939 892', email: '', address: '10 Galahad cres Castle hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0016', name: '이해분', phone: '0450 766 975', email: '', address: '10 Lindsay Street, Campsei NSW 2194', grade: '일반', joinDate: '2025-04-21', memo: 'payments@kagedcare.com.au 인보이스보내기/최영준 KA' },
  { id: 'C0017', name: 'Augustine jang', phone: '0433 763 062', email: '', address: '10/2 trafalgar pl marsfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0018', name: '김수민', phone: '0489 173 040', email: '', address: '100 Fairway Dr Norwest 2153', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0019', name: '조민주', phone: '0433 379 996', email: '', address: '104 Narara valley Drive 2250', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0020', name: '이정애', phone: '0414 784 003', email: '', address: '104 Pretoria Pde. Hornsby', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0021', name: 'nina Yun', phone: '0423 611 548', email: '', address: '107 Palmer street Woolloomooloo', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0022', name: '송은 cathy', phone: '0438560 100', email: '', address: '10A Lawley cres pymble', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0023', name: '김수경', phone: '0413 220 344', email: '', address: '11 Hyland place Minchinbury', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0024', name: '신은주', phone: '0438 123 178', email: '', address: '11/11 Cross St Baulkham Hills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0025', name: '이진형', phone: '0481 226 381', email: '', address: '11/25 wongala cres Beecroft', grade: '일반', joinDate: '2025-04-21', memo: '빌딩 B로 들어가야함, 입구는 Chapman Ave' },
  { id: 'C0026', name: 'kim', phone: '0406 330 005', email: '', address: '11/36-40 Landers rd Lane Cove', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0027', name: '박미자', phone: '0452 431 946', email: '', address: '11/75-79 Fallon St. Rydalmere 2116', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0028', name: '성재니', phone: '0420 824 954', email: '', address: '116 chalmers street Surry hills Blacksmith cafe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0029', name: '이종희', phone: '0451 876 522', email: '', address: '11fourth ave denistone', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0030', name: '홍경희', phone: '0435 624 533', email: '', address: '12 Beverley Crescent, Marsfield 2122', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0031', name: 'Leanne&Wilson', phone: '0416 633 845', email: '', address: '12 buckra st, Turramurra 2074', grade: '일반', joinDate: '2025-04-21', memo: '2건주문, 배송지 다름' },
  { id: 'C0032', name: '이숙진', phone: '0417 293 732', email: '', address: '12 Fairholm street Strathfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0033', name: '안정혜', phone: '0433 174 465', email: '', address: '12 Tathra place, Castle hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0034', name: 'jane hur', phone: '0420 945 972', email: '', address: '12 Water St, Wahroonga', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0035', name: '송미정', phone: '0452 177 909', email: '', address: '122excelsior Ave Castle hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0036', name: '김금진', phone: '0430 574 512', email: '', address: 'U125,208 -226 Pacific Highway, Hornsby', grade: '일반', joinDate: '2025-04-21', memo: '개인부담금 15불/KA지나코디(승조앤코디)' },
  { id: 'C0037', name: '김진', phone: '0430 784 378', email: '', address: 'U125,208 -226 Pacific Highway, Hornsby', grade: '일반', joinDate: '2025-04-21', memo: '개인부담금 15불/KA지나코디(승조앤코디)' },
  { id: 'C0038', name: 'kim yun', phone: '0412-131-581', email: '', address: '128/ 40 Strathalbyn Dr Oatlands', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0039', name: 'anna', phone: '0413 683 572', email: '', address: '1303/11Railway St Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0040', name: '김숙희', phone: '0430 288 033', email: '', address: '14 first Avenue Campsie', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0041', name: '제니정', phone: '0401 343 659', email: '', address: '14 The cloisters St,lves', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0042', name: 'grace park', phone: '0421 134 163', email: '', address: '14 Watt Ave Newingron', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0043', name: '장선경', phone: '0432 342 003', email: '', address: '15 Bellamy farm Rd West pennant hills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0044', name: '김영실', phone: '0426 880 691', email: '', address: '15 Glenrowan Ave Kellyville', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0045', name: '이주현', phone: '0430 597 267', email: '', address: '15 Maida Rd Epping', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0046', name: '최상미', phone: '0481 220 082', email: '', address: '16 Edgbaston rd, North Kellyville NSW 2155', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0047', name: '조앤신', phone: '0411 567 664', email: '', address: '16 EULALIA st West Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0048', name: '유옥자', phone: '0468 683 823', email: '', address: '16 merle st north epping', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0049', name: '김성애', phone: '0418 979 693', email: '', address: '1602/3-5 Albert Rd STRATHFIELD', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0050', name: '정애리', phone: '0433 250 600', email: '', address: '17 bimbil pl, castle hill', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0051', name: '양선화(Sue Yang)', phone: '0433 092 191', email: '', address: '17 Dresden Avenue, Castle Hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0052', name: '안소영', phone: '0424 000 303', email: '', address: '17 Hannah st Beecroft', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0053', name: '김정임(양정임)', phone: '0414 378 065', email: '', address: '17 Teak Pl Cherrybrook', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0054', name: 'Nam Kim', phone: '0424 845 614', email: '', address: '17/1-3 Mary St Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문/빠른 배송 원함' },
  { id: 'C0055', name: '김예림', phone: '0415 441 420', email: '', address: '18 chiltern crescent castle hill NSW 2154', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0056', name: '김양금', phone: '0406 133 021', email: '', address: '18 crest rd Gledswood hills NSW2557', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0057', name: 'Sally Kim', phone: '0433 233 374', email: '', address: '197 Seven Hills Road Baulkham Hills Sally Kim', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0058', name: '김경미', phone: '0430 346 332', email: '', address: '19A Robertson Road Chester Hill 2162', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0059', name: '박기숙(이기숙님)', phone: '0438 244 089', email: '', address: '2 dolphin close Claremont Meadows', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0060', name: '박수영', phone: '0427 420 387', email: '', address: '2 James st CARLINGFORD', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0061', name: '유옥심', phone: '0423 693 566', email: '', address: '2 Olive St Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0062', name: 'cho ja si(ka)', phone: '0426 961 004', email: '', address: '20 second av Epping', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0063', name: '서자영', phone: '0430 125 357', email: '', address: '21 Malvern Ave Roseville', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0064', name: '한미', phone: '0425 885 557', email: '', address: '21 ZappiastRiverstone 2765', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0065', name: 'Seungwoo Kang(강승우)', phone: '0401 419 730', email: '', address: '21A Gormley St, Lidcome 2141', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0066', name: '한혜선', phone: '0414 367 738', email: '', address: '22 Huntingdale cir Castle Hill', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0067', name: '김지연', phone: '0404 005 122', email: '', address: '22 Kooba ave Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0068', name: '이혜명', phone: '0425 435 469', email: '', address: '22 Kristy Court,Kellyville', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0069', name: '김미진', phone: '0403 474 111', email: '', address: '22/61peninsula Dr breakfastpoint', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0070', name: '박옥선', phone: '0420 854 700', email: '', address: '22-26 ANN STREET LIDCOMBE', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0071', name: 'Anna Hyatt', phone: '0423 886 856', email: '', address: '23 steward st, Lilyfield NSW 2040', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0072', name: '이희경', phone: '0434 619 618', email: '', address: '24 windermere ave northmead', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0073', name: 'young', phone: '0402 005 190', email: '', address: '25 Cumberlamb st, epping', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0074', name: '김봉두', phone: '0409 207 807', email: '', address: '25 meredith st Bankstown building 1 1002호', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0075', name: '김현진', phone: '0433 933 800', email: '', address: '26 Tomah st Carlingford nsw 2118', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0076', name: '안지연', phone: '0430 482 944', email: '', address: '26/1-9 Mark st Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0077', name: '이은정', phone: '0421 728 072', email: '', address: '26A Alice St. Turramurra', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0078', name: '이상미', phone: '0425 249 123', email: '', address: '26A South Parade Campsie', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0079', name: '강인희', phone: '0402 851 926', email: '', address: '27 Rondelay Dr castle hill 2154', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0080', name: '이은성', phone: '0434 584 737', email: '', address: '289-295 Sussex St, Sydney NSW 2000', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0081', name: '문경희', phone: '0421 289 029', email: '', address: '28Barney st. North parramatta', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0082', name: '홍수정', phone: '0431 770 022', email: '', address: '29 apps ave, north turramurra', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0083', name: 'kun young kang(강건영)', phone: '0430 102 854', email: '', address: '2A/ 2b help st, chatswood NSW 2067', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0084', name: '세라 콜린스(정원미)', phone: '0418 379 124', email: '', address: '3 Murray rose ave, sydney Olympic Park', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0085', name: '올리비아전', phone: '0420 961 010', email: '', address: '3 Sommer Street, Gables NSW 2765', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0086', name: '박영미', phone: '0449 936 368', email: '', address: '3/26 East Parade Eastwood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0087', name: 'soungheeyi', phone: '0409 700 688', email: '', address: '303 A Warringah rd Beacon hill 2100 Nsw', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0088', name: '티파니맘', phone: '0424 838 092', email: '', address: '30A kelvin rd st ives', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0089', name: '박정선', phone: '0414 382 662', email: '', address: '31 beechworth road pymble', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0090', name: '조정미', phone: '0424 930 015', email: '', address: '33 CRITERION CRES DOONSIDE', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0091', name: '권현숙', phone: '0433 894 833', email: '', address: '33/4-6 Mercer St, Castlehills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0092', name: 'June Jeong', phone: '0422 523 566', email: '', address: '34 lona Avenue, North Rocks 2151', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0093', name: '의전모피', phone: '0416 412 100', email: '', address: '35-39 brodie st Rydalmere 2116', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0094', name: '임은정', phone: '0410 618 945', email: '', address: '37 Kissing Point Road Turramurra Nsw 2074', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0095', name: 'jenna lee', phone: '0404 832 283', email: '', address: '37 tooth ave Newington', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0096', name: '김정자', phone: '0400 459 429', email: '', address: '4 Gillian Pde West Pymble', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0097', name: '신현자', phone: '0435 735 010', email: '', address: '4 willandra rd, woongarrh', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0098', name: '오영주', phone: '0425 222 150', email: '', address: '4/10-12 beamish st. Campsie NSW 2194', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0099', name: 'Sonia Young', phone: '0400 826 411', email: '', address: '4/8 Sybil st. Eastwood', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0100', name: '클레어윤', phone: '0410 800 999', email: '', address: '40 nelson st Gordon', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0101', name: '송효정', phone: '0438 285 375', email: '', address: '41 Perry St North Rocks 2151', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0102', name: '소니아', phone: '0412 234 341', email: '', address: '414/20 Railway st Lidcomebe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0103', name: '다이나(김순옥)', phone: '0423 926 900', email: '', address: '43yates avenue Dundas Valley', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0104', name: 'soon', phone: '0423 788 911', email: '', address: '44 Pennant Pde Caringford', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0105', name: 'Julie Kim', phone: '0452 380 432', email: '', address: '45/3-7 Taylor Street Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0106', name: '진성숙', phone: '0433 080 778', email: '', address: '5 Africa Way Colebee', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0107', name: '김희숙', phone: '0415 106 819', email: '', address: '5 Mcdonald way, greenacre NSW2190', grade: '일반', joinDate: '2025-04-21', memo: 'payments@kagedcare.com.au 인보이스보내기' },
  { id: 'C0108', name: 'jessica J', phone: '0430 790 727', email: '', address: '5/25 Livingstone Rd. Lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0109', name: '최남순', phone: '0430 704 719', email: '', address: '55 Third Ave, Campsie NSW 2194', grade: '일반', joinDate: '2025-04-21', memo: 'payments@kagedcare.com.au 인보이스보내기' },
  { id: 'C0110', name: '지현 김영옥 시누', phone: '0432 711 789', email: '', address: '56 Linden Way, Castlecrag', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0111', name: '박태경', phone: '0415 762 153', email: '', address: '56 Morshead st North Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0112', name: '이영은', phone: '0405 196 375', email: '', address: '56 Reilleys road Winston Hills 2153', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0113', name: '죠엔', phone: '0486 350 080', email: '', address: '56 Reilleys road Winston Hills 2153', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문, 카톡중복주문 확인' },
  { id: 'C0114', name: '민혜진', phone: '0451 995 382', email: '', address: '59 the parkway beaumont hill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0115', name: '서경미', phone: '0455 999 061', email: '', address: '6 bond place kellyville 2155 NSW', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0116', name: '소이맘', phone: '0415 288 757', email: '', address: '6 Dunbar cl. Normanhurst. 2076', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0117', name: '장혜선', phone: '0404 978 929', email: '', address: '6 imperial rd, castlehill', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0118', name: '누나', phone: '0434 197 016', email: '', address: '6 kirriford way, carlingford', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0119', name: '문애령', phone: '0433 840 224', email: '', address: '6 Shakespeare st Compsie', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0120', name: 'grace kim', phone: '0434 585 737', email: '', address: '61 grose st. North Parramatta', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0121', name: '곽수연', phone: '0423 338 085', email: '', address: '63 Belmont Street Merrylands', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0122', name: '윤성원', phone: '0433 001 499', email: '', address: '68 De Castella Dr. Blacktown', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0123', name: '김은경', phone: '0422 124 485', email: '', address: '6a culgoa Av, eastwood,NSW 2123', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0124', name: '강명준', phone: '0450 027 548', email: '', address: '7 julian place sefton', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0125', name: '이수연', phone: '0413 991 662', email: '', address: '7 Lynette Ave Carlingford.', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0126', name: '이서연', phone: '0433 528 383', email: '', address: '7 narelle ave pymble', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0127', name: '윤경', phone: '0402 754 676', email: '', address: '7 Railway Street Chatswood', grade: '일반', joinDate: '2025-04-21', memo: '현금' },
  { id: 'C0128', name: '문환할머니(Moon Hwan Yea)', phone: '0422 880 594', email: '', address: '7 Telfer pl. westtmead 2145', grade: '일반', joinDate: '2025-04-21', memo: '36(김치값 20%)' },
  { id: 'C0129', name: '피터할아버지(Peter Yea)', phone: '0422 880 594', email: '', address: '7 Telfer pl. westtmead 2145', grade: '일반', joinDate: '2025-04-21', memo: '20(김치값 20%)' },
  { id: 'C0130', name: '이주연', phone: '0400 234 052', email: '', address: '7 Vincent St Baulkham Hills', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0131', name: '송미현', phone: '0420 907 879', email: '', address: '702/63 west parade west Ryde', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0132', name: '이소연', phone: '0424 472 361', email: '', address: '73 Middle Harbour Road, Linfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0133', name: '차홍주', phone: '0468 481 583', email: '', address: '76 water street Strathfield south', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0134', name: '박정주', phone: '0430 918 875', email: '', address: '76A Avon rd North ryde 2113', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문/베송비' },
  { id: 'C0135', name: '장휘자', phone: '0426 067 715', email: '', address: '7a Burke st Concord west', grade: '일반', joinDate: '2025-04-21', memo: '코디/장보은' },
  { id: 'C0136', name: 'Felicity(이정임)', phone: '0405 106 908', email: '', address: '7A Hollis Ave Denistone East', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0137', name: 'Leanne&Wilson(Miyoung Seong)', phone: '0416 633 845', email: '', address: '8 Ashburton ave South Turramurra 2074', grade: '일반', joinDate: '2025-04-21', memo: '1인, 2건주문, 배송지 다름' },
  { id: 'C0138', name: '노희왕', phone: '0403 156 438', email: '', address: '8 Fairview Street, Concord', grade: '일반', joinDate: '2025-04-21', memo: '수건 3개지급,개인부담 $36 /강민경LW코디' },
  { id: 'C0139', name: '김지선', phone: '0488 995 377', email: '', address: '8/8 Field pl Telopea nsw2117', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0140', name: '주희', phone: '0404 767 215', email: '', address: '8-10 Cambridge Street, Cammeray', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0141', name: '제니남', phone: '0410 480 090', email: '', address: '85 Juno Pde, Greenacre Nsw 2190', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0142', name: '김미리', phone: '0415 186 972', email: '', address: '9 Macmahon Street Hurstville 2220', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0143', name: '박은', phone: '0405 141 062', email: '', address: '9 William Place north rocks', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0144', name: '이병일', phone: '0402 254 346', email: '', address: '9 windermere rd Epping 2121 nsw', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0145', name: '백현주', phone: '0434 261 314', email: '', address: '90A Lucinda Avenue South Wahroonga', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0146', name: 'jay', phone: '0433 499 611', email: '', address: '99/22 gadigal ave zetland NSW 2017', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0147', name: '이아가다', phone: '0414 967 858', email: '', address: 'APT 806, 26 Cambridge Street, Epping 2121', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0148', name: '벨라 윤', phone: '0431 638 679', email: '', address: 'Block B.Unit 67/132 killeaton St.STIVES', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0149', name: 'Kong Duck Sung', phone: '0414 942 405', email: '', address: 'C4/4 C Ennis RD Mildons Point NSW 2061', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0150', name: '이진주', phone: '0433 022 306', email: '', address: 'Central Coast: 6 Kalua drive chittaway', grade: '일반', joinDate: '2025-04-21', memo: '수목금 혼스비로/나머지는 센트럴코스트로 1012/135-137 Pacific Highway, Hornsby,Nsw 2077' },
  { id: 'C0151', name: '이영수', phone: '0435 836 177', email: '', address: 'J602 27-28 George Street North Strathfield', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0152', name: 'Eddie', phone: '0451 236 322', email: '', address: 'Shop 2 77 Berry Street North Sydney. Yurica Japanese Kitchen', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0153', name: '강민경', phone: '0433 662 723', email: '', address: 'Suite 112B/20 Lexington Dr, Bella Vista NSW 2153', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $72/강민경LW코디/인보이스 2장으로나눠발행' },
  { id: 'C0154', name: 'J burwood 타꾸미스시', phone: '0430 706 452', email: '', address: 'U G24,1 Kingfisher Street Lidcombe 2141', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0155', name: 'office next', phone: '0402 474 478', email: '', address: 'U13 231 Queen St Concord West', grade: '일반', joinDate: '2025-04-21', memo: '게이트에서 13# 누르면 됨' },
  { id: 'C0156', name: 'Joanne', phone: '0430 016 312', email: '', address: 'U1608 2B Help Street Chatwood', grade: '일반', joinDate: '2025-04-21', memo: '카톡 중복 신청 체크' },
  { id: 'C0157', name: '김윤정', phone: '0434 162 835', email: '', address: 'U223/20-34 albert road strathfield nsw', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0158', name: '송수영', phone: '0405 310 880', email: '', address: 'U4, 20 dora crescent dundas NSW 2117', grade: '일반', joinDate: '2025-04-21', memo: '문자주문/픽업가능/배송여부확인' },
  { id: 'C0159', name: '정은령', phone: '0413 789 641', email: '', address: 'U701/2f Appleroth street Melrose Park', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0160', name: '김준경', phone: '0481 248 164', email: '', address: 'U90 6-10 Ramsey street waitara', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0161', name: '미카엘라', phone: '0434 311 688', email: '', address: 'Unit 1 1236-1244 Canterbury Rd Roselands 2196', grade: '일반', joinDate: '2025-04-21', memo: '5/10일전 배송' },
  { id: 'C0162', name: '박종철', phone: '0425 833 510', email: '', address: 'unit 1, 10-12 Carrington St, Wahroonga NSW 2076', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0163', name: 'BYOUNGHOI CHO', phone: '0451 057 995', email: '', address: 'unit 1, 25-29, Nancarrow Ave. Ryde 2112', grade: '일반', joinDate: '2025-04-21', memo: '대표님 명함 전달' },
  { id: 'C0164', name: '손규미', phone: '0424 393 500', email: '', address: 'Unit 20/4-8 bobbin head road Pymble', grade: '일반', joinDate: '2025-04-21', memo: '카카오채널주문' },
  { id: 'C0165', name: '이슬기', phone: '0432 115 986', email: '', address: 'Unit 311 2C appleroth st Melrose park 2114', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0166', name: '김문수 삼대한의원', phone: '0481 252 425', email: '', address: 'Unit 35/11 epping Park Drive Epping', grade: '일반', joinDate: '2025-04-21', memo: '한의원아님' },
  { id: 'C0167', name: '이청(Ken)', phone: '0410 346 413', email: '', address: 'Unit 6/24 Skarratt Street , silverwater', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0168', name: '이호준', phone: '0424 240 516', email: '', address: 'unit 602. 42-50 Parramatta rd. Homebush', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0169', name: '이종순', phone: '0433 124 843', email: '', address: 'unit 614/15 Barton Road, Artarmon', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $36 /강민경LW코디' },
  { id: 'C0170', name: 'sue(조숙자)', phone: '0416 22 5757', email: '', address: 'Unit 8/ 40-44 Fullers Road, Chatswood.', grade: '일반', joinDate: '2025-04-21', memo: '문자, 카톡 주문' },
  { id: 'C0171', name: '손수미', phone: '0433 751 996', email: '', address: 'Unit4/14-16 Station st. Homebush', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0172', name: '안젤라', phone: '0421 699 805', email: '', address: 'Unit6/3Arthersleigh St. Burwood NSW2134', grade: '일반', joinDate: '2025-04-21', memo: '계좌이체' },
  { id: 'C0173', name: '원영자', phone: '042 578 8500', email: '', address: '픽업', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0174', name: '김혜자', phone: '0431 688 008', email: '', address: '70 Victoria rd, Ermington', grade: '일반', joinDate: '2025-04-21', memo: '문자주문' },
  { id: 'C0175', name: '김훈(대표님)', phone: '', email: '', address: '', grade: '일반', joinDate: '2025-04-21', memo: '대표님 예약' },
  { id: 'C0176', name: '선우성 Hurstville(대표님)', phone: '', email: '', address: '', grade: '일반', joinDate: '2025-04-21', memo: '대표님 예약' },
  { id: 'C0177', name: '엄주일(대표님)', phone: '', email: '', address: '', grade: '일반', joinDate: '2025-04-21', memo: '대표님 예약' },
  { id: 'C0178', name: '유진배', phone: '0415 701 340', email: '', address: '502/17 Barton Rd, Artarmon', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0179', name: '유한관', phone: '0406 288 303', email: '', address: '2/8-12 Fitzwilliam Rd.Toongabbie', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 19.50/ ka지나코디(승조앤코디)' },
  { id: 'C0180', name: '이카타리나', phone: '0413 223 447', email: '', address: '4 Dalmar Place, Carlingford', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0181', name: '이풍자', phone: '0433 968 785', email: '', address: '11 princess st, lidcombe', grade: '일반', joinDate: '2025-04-21', memo: '' },
  { id: 'C0182', name: '손용주 (Yong Joo Son)', phone: '0411 793 733', email: '', address: 'unit 217/2B Help Street, Chatswood, NSW, 2067', grade: '일반', joinDate: '2025-04-21', memo: '개인부담 $24/강민경LW코디' }
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
  { id: 'ORD-0001', date: '2025-04-21', customerId: 'C0001', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0002', date: '2025-04-21', customerId: 'C0002', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0003', date: '2025-04-21', customerId: 'C0003', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0004', date: '2025-04-21', customerId: 'C0004', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0005', date: '2025-04-21', customerId: 'C0005', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0006', date: '2025-04-21', customerId: 'C0006', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0007', date: '2025-04-21', customerId: 'C0007', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0008', date: '2025-04-21', customerId: 'C0008', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0009', date: '2025-04-21', customerId: 'C0009', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0010', date: '2025-04-21', customerId: 'C0010', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0011', date: '2025-04-21', customerId: 'C0011', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0012', date: '2025-04-21', customerId: 'C0012', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0013', date: '2025-04-21', customerId: 'C0013', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0014', date: '2025-04-21', customerId: 'C0014', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0015', date: '2025-04-21', customerId: 'C0015', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0016', date: '2025-04-21', customerId: 'C0016', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0017', date: '2025-04-21', customerId: 'C0017', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0018', date: '2025-04-21', customerId: 'C0018', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0019', date: '2025-04-21', customerId: 'C0018', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0020', date: '2025-04-21', customerId: 'C0019', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0021', date: '2025-04-21', customerId: 'C0020', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0022', date: '2025-04-21', customerId: 'C0020', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0023', date: '2025-04-21', customerId: 'C0021', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0024', date: '2025-04-21', customerId: 'C0022', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0025', date: '2025-04-21', customerId: 'C0023', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0026', date: '2025-04-21', customerId: 'C0024', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0027', date: '2025-04-21', customerId: 'C0025', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0028', date: '2025-04-21', customerId: 'C0026', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0029', date: '2025-04-21', customerId: 'C0027', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0030', date: '2025-04-21', customerId: 'C0027', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0031', date: '2025-04-21', customerId: 'C0028', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0032', date: '2025-04-21', customerId: 'C0029', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0033', date: '2025-04-21', customerId: 'C0030', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0034', date: '2025-04-21', customerId: 'C0031', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0035', date: '2025-04-21', customerId: 'C0032', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0036', date: '2025-04-21', customerId: 'C0032', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0037', date: '2025-04-21', customerId: 'C0033', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0038', date: '2025-04-21', customerId: 'C0034', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0039', date: '2025-04-21', customerId: 'C0035', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0040', date: '2025-04-21', customerId: 'C0036', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0041', date: '2025-04-21', customerId: 'C0037', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0042', date: '2025-04-21', customerId: 'C0038', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0043', date: '2025-04-21', customerId: 'C0039', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0044', date: '2025-04-21', customerId: 'C0040', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0045', date: '2025-04-21', customerId: 'C0041', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0046', date: '2025-04-21', customerId: 'C0042', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0047', date: '2025-04-21', customerId: 'C0043', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0048', date: '2025-04-21', customerId: 'C0044', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0049', date: '2025-04-21', customerId: 'C0045', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0050', date: '2025-04-21', customerId: 'C0046', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0051', date: '2025-04-21', customerId: 'C0047', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0052', date: '2025-04-21', customerId: 'C0048', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0053', date: '2025-04-21', customerId: 'C0049', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0054', date: '2025-04-21', customerId: 'C0050', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0055', date: '2025-04-21', customerId: 'C0050', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0056', date: '2025-04-21', customerId: 'C0051', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0057', date: '2025-04-21', customerId: 'C0051', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0058', date: '2025-04-21', customerId: 'C0052', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0059', date: '2025-04-21', customerId: 'C0053', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0060', date: '2025-04-21', customerId: 'C0054', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0061', date: '2025-04-21', customerId: 'C0054', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0062', date: '2025-04-21', customerId: 'C0055', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0063', date: '2025-04-21', customerId: 'C0056', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0064', date: '2025-04-21', customerId: 'C0057', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0065', date: '2025-04-21', customerId: 'C0058', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0066', date: '2025-04-21', customerId: 'C0059', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0067', date: '2025-04-21', customerId: 'C0060', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0068', date: '2025-04-21', customerId: 'C0061', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0069', date: '2025-04-21', customerId: 'C0062', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0070', date: '2025-04-21', customerId: 'C0063', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0071', date: '2025-04-21', customerId: 'C0064', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0072', date: '2025-04-21', customerId: 'C0065', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0073', date: '2025-04-21', customerId: 'C0066', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0074', date: '2025-04-21', customerId: 'C0067', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0075', date: '2025-04-21', customerId: 'C0068', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0076', date: '2025-04-21', customerId: 'C0068', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0077', date: '2025-04-21', customerId: 'C0069', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0078', date: '2025-04-21', customerId: 'C0070', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0079', date: '2025-04-21', customerId: 'C0071', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0080', date: '2025-04-21', customerId: 'C0072', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0081', date: '2025-04-21', customerId: 'C0073', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0082', date: '2025-04-21', customerId: 'C0074', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0083', date: '2025-04-21', customerId: 'C0075', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0084', date: '2025-04-21', customerId: 'C0076', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0085', date: '2025-04-21', customerId: 'C0077', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0086', date: '2025-04-21', customerId: 'C0078', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0087', date: '2025-04-21', customerId: 'C0079', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0088', date: '2025-04-21', customerId: 'C0080', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0089', date: '2025-04-21', customerId: 'C0081', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0090', date: '2025-04-21', customerId: 'C0082', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0091', date: '2025-04-21', customerId: 'C0083', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 2, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0092', date: '2025-04-21', customerId: 'C0084', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0093', date: '2025-04-21', customerId: 'C0085', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0094', date: '2025-04-21', customerId: 'C0086', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0095', date: '2025-04-21', customerId: 'C0087', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0096', date: '2025-04-21', customerId: 'C0088', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0097', date: '2025-04-21', customerId: 'C0088', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0098', date: '2025-04-21', customerId: 'C0089', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0099', date: '2025-04-21', customerId: 'C0090', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0100', date: '2025-04-21', customerId: 'C0091', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0101', date: '2025-04-21', customerId: 'C0092', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0102', date: '2025-04-21', customerId: 'C0093', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0103', date: '2025-04-21', customerId: 'C0094', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0104', date: '2025-04-21', customerId: 'C0095', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0105', date: '2025-04-21', customerId: 'C0096', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0106', date: '2025-04-21', customerId: 'C0097', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0107', date: '2025-04-21', customerId: 'C0098', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0108', date: '2025-04-21', customerId: 'C0099', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0109', date: '2025-04-21', customerId: 'C0100', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0110', date: '2025-04-21', customerId: 'C0101', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0111', date: '2025-04-21', customerId: 'C0102', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0112', date: '2025-04-21', customerId: 'C0103', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0113', date: '2025-04-21', customerId: 'C0104', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0114', date: '2025-04-21', customerId: 'C0105', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0115', date: '2025-04-21', customerId: 'C0106', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0116', date: '2025-04-21', customerId: 'C0106', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0117', date: '2025-04-21', customerId: 'C0107', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0118', date: '2025-04-21', customerId: 'C0108', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0119', date: '2025-04-21', customerId: 'C0108', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0120', date: '2025-04-21', customerId: 'C0109', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0121', date: '2025-04-21', customerId: 'C0109', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0122', date: '2025-04-21', customerId: 'C0110', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0123', date: '2025-04-21', customerId: 'C0111', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0124', date: '2025-04-21', customerId: 'C0112', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0125', date: '2025-04-21', customerId: 'C0113', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0126', date: '2025-04-21', customerId: 'C0114', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0127', date: '2025-04-21', customerId: 'C0115', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0128', date: '2025-04-21', customerId: 'C0116', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0129', date: '2025-04-21', customerId: 'C0116', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0130', date: '2025-04-21', customerId: 'C0117', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0131', date: '2025-04-21', customerId: 'C0117', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0132', date: '2025-04-21', customerId: 'C0118', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0133', date: '2025-04-21', customerId: 'C0119', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0134', date: '2025-04-21', customerId: 'C0120', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0135', date: '2025-04-21', customerId: 'C0121', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0136', date: '2025-04-21', customerId: 'C0122', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0137', date: '2025-04-21', customerId: 'C0123', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0138', date: '2025-04-21', customerId: 'C0124', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0139', date: '2025-04-21', customerId: 'C0125', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0140', date: '2025-04-21', customerId: 'C0126', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0141', date: '2025-04-21', customerId: 'C0127', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0142', date: '2025-04-21', customerId: 'C0128', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0143', date: '2025-04-21', customerId: 'C0129', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0144', date: '2025-04-21', customerId: 'C0130', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0145', date: '2025-04-21', customerId: 'C0130', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0146', date: '2025-04-21', customerId: 'C0131', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0147', date: '2025-04-21', customerId: 'C0132', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0148', date: '2025-04-21', customerId: 'C0133', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0149', date: '2025-04-21', customerId: 'C0134', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0150', date: '2025-04-21', customerId: 'C0135', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0151', date: '2025-04-21', customerId: 'C0136', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0152', date: '2025-04-21', customerId: 'C0136', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0153', date: '2025-04-21', customerId: 'C0137', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0154', date: '2025-04-21', customerId: 'C0138', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0155', date: '2025-04-21', customerId: 'C0139', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0156', date: '2025-04-21', customerId: 'C0140', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0157', date: '2025-04-21', customerId: 'C0141', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0158', date: '2025-04-21', customerId: 'C0142', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0159', date: '2025-04-21', customerId: 'C0143', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0160', date: '2025-04-21', customerId: 'C0144', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0161', date: '2025-04-21', customerId: 'C0145', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0162', date: '2025-04-21', customerId: 'C0146', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0163', date: '2025-04-21', customerId: 'C0147', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0164', date: '2025-04-21', customerId: 'C0148', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0165', date: '2025-04-21', customerId: 'C0149', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0166', date: '2025-04-21', customerId: 'C0149', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0167', date: '2025-04-21', customerId: 'C0150', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0168', date: '2025-04-21', customerId: 'C0151', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0169', date: '2025-04-21', customerId: 'C0152', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0170', date: '2025-04-21', customerId: 'C0153', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 3, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0171', date: '2025-04-21', customerId: 'C0154', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0172', date: '2025-04-21', customerId: 'C0154', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0173', date: '2025-04-21', customerId: 'C0155', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0174', date: '2025-04-21', customerId: 'C0156', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0175', date: '2025-04-21', customerId: 'C0157', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0176', date: '2025-04-21', customerId: 'C0158', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0177', date: '2025-04-21', customerId: 'C0159', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0178', date: '2025-04-21', customerId: 'C0160', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0179', date: '2025-04-21', customerId: 'C0161', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0180', date: '2025-04-21', customerId: 'C0162', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0181', date: '2025-04-21', customerId: 'C0163', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0182', date: '2025-04-21', customerId: 'C0163', itemName: '배추김치 4KG - 3세트(할인)', qty: 2, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0183', date: '2025-04-21', customerId: 'C0163', itemName: '총각김치 2KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0184', date: '2025-04-21', customerId: 'C0164', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0185', date: '2025-04-21', customerId: 'C0165', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0186', date: '2025-04-21', customerId: 'C0166', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0187', date: '2025-04-21', customerId: 'C0167', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0188', date: '2025-04-21', customerId: 'C0168', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0189', date: '2025-04-21', customerId: 'C0169', itemName: '배추김치 4KG - 3세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0190', date: '2025-04-21', customerId: 'C0170', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0191', date: '2025-04-21', customerId: 'C0171', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0192', date: '2025-04-21', customerId: 'C0172', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0193', date: '2025-04-21', customerId: 'C0173', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0194', date: '2025-04-21', customerId: 'C0174', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0195', date: '2025-04-21', customerId: 'C0175', itemName: '배추김치 4KG', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0196', date: '2025-04-21', customerId: 'C0176', itemName: '총각김치 2KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0197', date: '2025-04-21', customerId: 'C0177', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0198', date: '2025-04-21', customerId: 'C0178', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0199', date: '2025-04-21', customerId: 'C0179', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0200', date: '2025-04-21', customerId: 'C0180', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0201', date: '2025-04-21', customerId: 'C0181', itemName: '배추김치 4KG - 2세트(할인)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' },
  { id: 'ORD-0202', date: '2025-04-21', customerId: 'C0182', itemName: '혼합세트 (배추4KG + 총각2KG)', qty: 1, shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' }
];

const STORAGE_KEYS = { customers: 'wh:v3:customers', items: 'wh:v3:items', orders: 'wh:v3:orders' };

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
const koDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const days = ['일','월','화','수','목','금','토'];
  return `${date.getFullYear()}년 ${String(date.getMonth()+1).padStart(2,'0')}월 ${String(date.getDate()).padStart(2,'0')}일(${days[date.getDay()]})`;
};

function exportToExcel(customers, items, orders) {
  const wb = XLSX.utils.book_new();

  const orderData = orders.map(o => {
    const c = customers.find(x => x.id === o.customerId);
    const it = items.find(i => i.name === o.itemName);
    const total = (it?.price || 0) * o.qty;
    return {
      '주문번호': o.id, '주문일': o.date, '고객ID': o.customerId,
      '성함': c?.name || '', '연락처': c?.phone || '', '주문내역': o.itemName,
      '수량': o.qty, '단가($)': it?.price || 0, '합계금액($)': total,
      '배송상태': o.shipStatus || '', '배송방법': o.deliveryMethod || '',
      '결제상태': o.paymentStatus || '', '배송메모': o.deliveryMemo || '',
      '출고일': o.shipDate || '', '예상도착': o.arriveDate || '',
      '배송지': c?.address || '',
    };
  });
  const ws1 = XLSX.utils.json_to_sheet(orderData);
  ws1['!cols'] = [{wch:12},{wch:12},{wch:10},{wch:12},{wch:15},{wch:18},{wch:6},{wch:10},{wch:12},{wch:10},{wch:11},{wch:10},{wch:25},{wch:11},{wch:11},{wch:35}];
  XLSX.utils.book_append_sheet(wb, ws1, '주문관리');

  const customerData = customers.map(c => {
    const orderCount = orders.filter(o => o.customerId === c.id).length;
    const totalSpent = orders.filter(o => o.customerId === c.id).reduce((s, o) => {
      const it = items.find(i => i.name === o.itemName);
      return s + (it ? it.price * o.qty : 0);
    }, 0);
    return {
      '고객ID': c.id, '성함': c.name, '연락처': c.phone, '이메일': c.email,
      '주소': c.address, '등급': c.grade, '가입일': c.joinDate, '메모': c.memo,
      '총주문수': orderCount, '총구매액($)': totalSpent,
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(customerData);
  ws2['!cols'] = [{wch:10},{wch:12},{wch:15},{wch:22},{wch:38},{wch:8},{wch:12},{wch:15},{wch:10},{wch:12}];
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

export default function App() {
  const [view, setView] = useState('dashboard');
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, i, o] = await Promise.all([
        loadData(STORAGE_KEYS.customers, INITIAL_CUSTOMERS),
        loadData(STORAGE_KEYS.items, INITIAL_ITEMS),
        loadData(STORAGE_KEYS.orders, INITIAL_ORDERS),
      ]);
      setCustomers(c); setItems(i); setOrders(o); setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) saveData(STORAGE_KEYS.customers, customers); }, [customers, loaded]);
  useEffect(() => { if (loaded) saveData(STORAGE_KEYS.items, items); }, [items, loaded]);
  useEffect(() => { if (loaded) saveData(STORAGE_KEYS.orders, orders); }, [orders, loaded]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  const itemsWithStock = useMemo(() => calcAvailStock(items, orders), [items, orders]);

  const nav = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'orders', label: '주문관리', icon: ShoppingCart },
    { id: 'customers', label: '고객관리', icon: Users },
    { id: 'items', label: '품목/재고', icon: Package },
    { id: 'shipping', label: '배송관리', icon: Truck },
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
        <div className="px-5 pt-6 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-white text-lg">🥬</div>
            <div>
              <div className="font-serif-ko text-lg font-bold text-stone-800 leading-tight">워커힐김치</div>
              <div className="text-[10px] tracking-[0.2em] text-stone-400 font-semibold">ERP SYSTEM</div>
            </div>
          </div>
        </div>

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

        <div className="px-3 py-3 border-t border-stone-100 space-y-2">
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
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <FileDown size={16} />
            <span>엑셀 백업 다운로드</span>
          </button>
          <button
            onClick={async () => {
              if (!resetConfirm) {
                // 첫 클릭: 확인 모드로 전환
                setResetConfirm(true);
                setTimeout(() => setResetConfirm(false), 4000);
                return;
              }
              // 두 번째 클릭: 실제 실행
              setResetConfirm(false);
              try {
                await deleteData(STORAGE_KEYS.customers);
                await deleteData(STORAGE_KEYS.items);
                await deleteData(STORAGE_KEYS.orders);
                // 옛 버전 키도 모두 삭제
                await deleteData('wh:customers');
                await deleteData('wh:items');
                await deleteData('wh:orders');
                await deleteData('wh:v2:customers');
                await deleteData('wh:v2:items');
                await deleteData('wh:v2:orders');
              } catch (e) { console.error(e); }
              setCustomers(INITIAL_CUSTOMERS);
              setItems(INITIAL_ITEMS);
              setOrders(INITIAL_ORDERS);
              showToast('초기 데이터로 리셋되었습니다 ✓');
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              resetConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
            }`}
          >
            <RotateCcw size={13} />
            <span>{resetConfirm ? '한번 더 클릭 → 정말 초기화!' : '데이터 초기화'}</span>
          </button>
          <div className="text-[10px] text-stone-500 leading-relaxed px-1">
            💾 데이터가 자동 저장됩니다. 주 1회 백업을 권장해요.
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
              {view === 'customers' && '고객 정보를 관리하세요 (최대 4,500명)'}
              {view === 'items' && '품목과 재고를 관리하세요'}
              {view === 'shipping' && '배송 상태를 업데이트하세요'}
            </div>
          </div>
          <div className="flex items-center gap-3">
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
          {view === 'dashboard' && <Dashboard customers={customers} items={itemsWithStock} orders={orders} setView={setView} />}
          {view === 'orders' && <Orders customers={customers} items={itemsWithStock} orders={orders} setOrders={setOrders} showToast={showToast} />}
          {view === 'customers' && <Customers customers={customers} setCustomers={setCustomers} items={itemsWithStock} orders={orders} showToast={showToast} />}
          {view === 'items' && <Items items={itemsWithStock} setItems={setItems} showToast={showToast} />}
          {view === 'shipping' && <Shipping customers={customers} orders={orders} setOrders={setOrders} showToast={showToast} />}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Dashboard({ customers, items, orders, setView }) {
  const stats = useMemo(() => {
    const totalSales = orders.reduce((s, o) => {
      const it = items.find(i => i.name === o.itemName);
      return s + (it ? it.price * o.qty : 0);
    }, 0);
    const deliveredCount = orders.filter(o => o.shipStatus === '배송완료').length;
    const vipCount = customers.filter(c => c.grade === 'VIP').length;
    return {
      totalOrders: orders.length,
      totalSales,
      avgOrder: orders.length > 0 ? Math.round(totalSales / orders.length) : 0,
      vipCount,
      deliveryRate: orders.length > 0 ? (deliveredCount / orders.length) * 100 : 0,
      lowStock: items.filter(i => i.availStock <= 20).length,
    };
  }, [customers, items, orders]);

  const itemStats = useMemo(() => {
    return items.map(it => {
      const relevant = orders.filter(o => o.itemName === it.name);
      const count = relevant.length;
      const qty = relevant.reduce((s, o) => s + o.qty, 0);
      const sales = qty * it.price;
      return { ...it, count, qty, sales };
    });
  }, [items, orders]);

  const totalItemSales = itemStats.reduce((s, i) => s + i.sales, 0);
  const gradeStats = ['VIP','우수','일반','신규'].map(g => ({
    grade: g,
    count: customers.filter(c => c.grade === g).length
  }));

  const shipStats = ['배송준비중','출고대기','배송중','배송완료','취소'].map(s => ({
    status: s,
    count: orders.filter(o => o.shipStatus === s).length
  }));

  const recent = [...orders].slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 gap-4">
        <KpiCard label="총 주문수" value={stats.totalOrders} unit="건" accent="bg-red-800" icon={ShoppingCart} />
        <KpiCard label="총 매출" value={formatNum(stats.totalSales)} unit="$" accent="bg-stone-800" icon={TrendingUp} big />
        <KpiCard label="평균 주문액" value={formatNum(stats.avgOrder)} unit="$" accent="bg-stone-600" />
        <KpiCard label="VIP 고객" value={stats.vipCount} unit="명" accent="bg-rose-700" />
        <KpiCard label="배송 완료율" value={stats.deliveryRate.toFixed(1)} unit="%" accent="bg-emerald-700" />
        <KpiCard label="재고 경보" value={stats.lowStock} unit="개" accent="bg-amber-600" warn={stats.lowStock > 0} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif-ko text-lg font-bold text-stone-800">품목별 판매 현황</h2>
              <p className="text-xs text-stone-500 mt-0.5">매출 기준 정렬 · 🥇🥈🥉 순위 표시</p>
            </div>
            <button onClick={() => setView('items')} className="text-xs text-stone-500 hover:text-stone-800">자세히 →</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                  {/* 순위 메달 */}
                  {medal && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-lg">
                      {medal}
                    </div>
                  )}

                  {/* 상단: 아이콘 + 타입 배지 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-2xl">{icon}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      it.isSet ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {it.isSet ? '세트' : '기본'}
                    </span>
                  </div>

                  {/* 품목명 */}
                  <div className="font-semibold text-sm text-stone-800 leading-tight mb-2 min-h-[36px]">
                    {it.name}
                  </div>

                  {/* 매출 강조 */}
                  <div className="mb-2">
                    <div className="text-xs text-stone-500 mb-0.5">매출</div>
                    <div className="text-xl font-bold text-red-800 tabular-nums">{formatWon(it.sales)}</div>
                  </div>

                  {/* 주문 건수 · 판매 수량 */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider">주문</div>
                      <div className="text-sm font-bold text-stone-700 tabular-nums">{it.count}<span className="text-xs font-normal text-stone-400 ml-0.5">건</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase tracking-wider">수량</div>
                      <div className="text-sm font-bold text-stone-700 tabular-nums">{it.qty}<span className="text-xs font-normal text-stone-400 ml-0.5">개</span></div>
                    </div>
                  </div>

                  {/* 비중 프로그레스 */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-stone-500">매출 비중</span>
                      <span className="text-[10px] font-semibold text-stone-700">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
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

          {/* 하단 요약 */}
          <div className="mt-5 pt-4 border-t border-stone-100 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">총 매출</div>
              <div className="text-lg font-bold text-red-800 tabular-nums">{formatWon(totalItemSales)}</div>
            </div>
            <div className="text-center border-x border-stone-100">
              <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">총 판매량</div>
              <div className="text-lg font-bold text-stone-800 tabular-nums">
                {itemStats.reduce((s, i) => s + i.qty, 0)}<span className="text-xs font-normal text-stone-400 ml-0.5">개</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">베스트셀러</div>
              <div className="text-xs font-bold text-stone-800 truncate">
                {[...itemStats].sort((a, b) => b.qty - a.qty)[0]?.name || '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-serif-ko text-lg font-bold text-stone-800 mb-5">배송 상태</h2>
          <div className="space-y-2.5">
            {shipStats.map(s => {
              const pct = orders.length > 0 ? (s.count / orders.length) * 100 : 0;
              return (
                <div key={s.status} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${shipStatusStyle(s.status)}`}>
                    {s.status}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-bold text-stone-800 tabular-nums w-8 text-right">{s.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif-ko text-lg font-bold text-stone-800">최근 주문</h2>
            <button onClick={() => setView('orders')} className="text-xs text-stone-500 hover:text-stone-800">전체 보기 →</button>
          </div>
          <div className="space-y-2">
            {recent.map(o => {
              const cust = customers.find(c => c.id === o.customerId);
              const it = items.find(i => i.name === o.itemName);
              return (
                <div key={o.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-stone-50 hover:bg-stone-100">
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-stone-500">{o.id}</div>
                    <div>
                      <div className="font-medium text-sm text-stone-800">{cust?.name || '-'}</div>
                      <div className="text-xs text-stone-500">{o.itemName} × {o.qty}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${shipStatusStyle(o.shipStatus)}`}>{o.shipStatus}</span>
                    <span className="text-sm font-bold text-stone-800 tabular-nums">{formatWon((it?.price || 0) * o.qty)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-serif-ko text-lg font-bold text-stone-800 mb-5">고객 등급 분포</h2>
          <div className="space-y-3">
            {gradeStats.map(g => {
              const pct = customers.length > 0 ? (g.count / customers.length) * 100 : 0;
              return (
                <div key={g.grade}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${gradeStyle(g.grade)}`}>{g.grade}</span>
                    <span className="text-sm font-bold text-stone-800 tabular-nums">{g.count}명</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-700 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-5 border-t border-stone-100">
            <div className="text-xs text-stone-500 mb-1">총 고객수</div>
            <div className="text-2xl font-bold text-stone-800 tabular-nums">{customers.length}<span className="text-sm text-stone-400 ml-1">명</span></div>
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

function Orders({ customers, items, orders, setOrders, showToast }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [msgTarget, setMsgTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);

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

  const filtered = useMemo(() => {
    if (!search) return [...orders].reverse();
    const s = search.toLowerCase();
    return orders.filter(o => {
      const c = customerMap[o.customerId];
      return o.id.toLowerCase().includes(s) ||
        (c?.name || '').toLowerCase().includes(s) ||
        o.customerId.toLowerCase().includes(s) ||
        o.itemName.toLowerCase().includes(s);
    }).reverse();
  }, [orders, search, customerMap]);

  useEffect(() => { setDisplayLimit(50); }, [search]);

  const nextOrderId = () => {
    const nums = orders.map(o => parseInt(o.id.replace('ORD-',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'ORD-' + String(max + 1).padStart(4, '0');
  };

  const handleSave = (order) => {
    if (editTarget) {
      setOrders(orders.map(o => o.id === editTarget.id ? { ...order, id: editTarget.id } : o));
      showToast('주문이 수정되었습니다');
    } else {
      setOrders([...orders, { ...order, id: nextOrderId(), shipStatus: '배송준비중', deliveryMethod: '', paymentStatus: '', deliveryMemo: '', shipDate: '', arriveDate: '' }]);
      showToast('주문이 등록되었습니다');
    }
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    if (confirm('이 주문을 삭제할까요?')) {
      setOrders(orders.filter(o => o.id !== id));
      showToast('삭제되었습니다');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문번호</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문일</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">고객</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">품목</th>
                <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">수량</th>
                <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">금액</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">상태</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(o => {
                const c = customerMap[o.customerId];
                const total = (priceMap[o.itemName] || 0) * o.qty;
                return (
                  <tr key={o.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-red-800">{o.id}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">{o.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-800">{c?.name || '삭제된 고객'}</div>
                      <div className="text-xs text-stone-400">{o.customerId}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{o.itemName}</td>
                    <td className="px-4 py-3 text-right text-stone-700 tabular-nums">{o.qty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-800 tabular-nums">{formatWon(total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${shipStatusStyle(o.shipStatus)}`}>{o.shipStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
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
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {msgTarget && (
        <MessageModal
          order={msgTarget}
          customers={customers}
          items={items}
          onClose={() => setMsgTarget(null)}
        />
      )}
    </div>
  );
}

function OrderFormModal({ customers, items, editTarget, onSave, onClose }) {
  const [date, setDate] = useState(editTarget?.date || new Date().toISOString().slice(0,10));
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState(editTarget?.customerId || '');
  const [itemName, setItemName] = useState(editTarget?.itemName || '');
  const [qty, setQty] = useState(editTarget?.qty || 1);

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
  const total = (selectedItem?.price || 0) * qty;

  const canSubmit = customerId && itemName && qty > 0;

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-serif-ko text-xl font-bold text-stone-800">
            {editTarget ? '주문 수정' : '새 주문 등록'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
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
                    <div>
                      <span className="font-medium text-sm text-stone-800">{c.name}</span>
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${gradeStyle(c.grade)}`}>{c.grade}</span>
                    </div>
                    <span className="text-xs text-stone-500 font-mono">{c.id}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{c.phone} · {c.address}</div>
                </button>
              ))}
              {matchedCustomers.length === 0 && <div className="text-center py-4 text-xs text-stone-400">고객이 없습니다</div>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">품목</label>
              <select value={itemName} onChange={e => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100 bg-white">
                <option value="">선택하세요</option>
                {items.map(i => (
                  <option key={i.code} value={i.name} disabled={i.availStock <= 0}>
                    {i.name} ({formatWon(i.price)}) {i.availStock <= 0 ? '- 품절' : i.availStock <= 20 ? `- 재고 ${i.availStock}개` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">수량</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
            </div>
          </div>

          {selectedItem && qty > selectedItem.availStock && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                요청 수량({qty})이 가용재고({selectedItem.availStock})를 초과합니다. 그래도 주문을 등록할 수 있지만 재고 확인이 필요합니다.
              </div>
            </div>
          )}

          <div className="p-4 bg-stone-50 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">합계</span>
              <span className="text-2xl font-bold text-red-800 tabular-nums">{formatWon(total)}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button
            onClick={() => canSubmit && onSave({ date, customerId, itemName, qty })}
            disabled={!canSubmit}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {editTarget ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageModal({ order, customers, items, onClose }) {
  const c = customers.find(x => x.id === order.customerId);
  const it = items.find(i => i.name === order.itemName);
  const total = (it?.price || 0) * order.qty;
  const [copied, setCopied] = useState(false);

  const orderMsg = `[워커힐김치 주문 안내] ${c?.name}고객님, ${koDate(order.date)}에 ${order.itemName} ${order.qty}개 주문해주셨습니다. 총 $${formatNum(total)} 입니다. 감사합니다~♥`;
  const confirmMsg = `[워커힐김치 배송 전 확인] ${c?.name}고객님, 곧 배송 예정인 주문 내역을 확인 부탁드립니다.\n- 품목: ${order.itemName}\n- 수량: ${order.qty}개\n- 금액: $${formatNum(total)}\n- 배송지: ${c?.address}\n내역이 맞으시면 "확인" 답장 부탁드려요~♥`;
  const shipMsg = (order.shipStatus === '배송완료' || order.shipStatus === '배송중') ? `[워커힐김치 배송 안내] ${c?.name}고객님, 주문하신 ${order.itemName} x${order.qty}이(가) ${order.shipDate ? order.shipDate + ' 출고되었습니다. ' : '배송 중입니다. '}${order.deliveryMethod ? '(' + order.deliveryMethod + ') ' : ''}${order.arriveDate ? '예상도착 ' + order.arriveDate + '. ' : ''}감사합니다~♥` : null;

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
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);

  // 성능 최적화: 고객ID → 주문 배열 미리 한 번만 계산
  const ordersByCustomer = useMemo(() => {
    const map = {};
    const priceMap = {};
    items.forEach(i => { priceMap[i.name] = i.price || 0; });
    orders.forEach(o => {
      if (!map[o.customerId]) {
        map[o.customerId] = { orders: [], count: 0, totalSpent: 0, summary: '' };
      }
      map[o.customerId].orders.push(o);
      map[o.customerId].count += 1;
      map[o.customerId].totalSpent += (priceMap[o.itemName] || 0) * o.qty;
    });
    // 각 고객의 주문 요약 문자열 미리 생성
    Object.keys(map).forEach(cid => {
      map[cid].summary = map[cid].orders.map(o => `${o.itemName}×${o.qty}`).join(', ');
    });
    return map;
  }, [orders, items]);

  const filtered = useMemo(() => {
    let result = customers;
    if (gradeFilter) result = result.filter(c => c.grade === gradeFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        (c.email || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [customers, search, gradeFilter]);

  // 검색/필터 변경 시 표시 개수 리셋
  useEffect(() => { setDisplayLimit(50); }, [search, gradeFilter]);

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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 고객ID, 전화, 이메일 검색..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {['', 'VIP', '우수', '일반', '신규'].map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${gradeFilter === g ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
              {g || '전체'}
            </button>
          ))}
        </div>
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
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">고객ID</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">성함</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">연락처</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주소</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문 품목</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">등급</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">주문</th>
                <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">구매액</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(c => {
                const custData = ordersByCustomer[c.id] || { orders: [], count: 0, totalSpent: 0, summary: '' };
                const orderCount = custData.count;
                const totalSpent = custData.totalSpent;
                const myOrders = custData.orders;
                return (
                  <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-red-800">{c.id}</span></td>
                    <td className="px-4 py-3 font-medium text-stone-800">{c.name}</td>
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
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${gradeStyle(c.grade)}`}>{c.grade}</span>
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
            {customer.email && (
              <div className="text-xs text-amber-900"><span className="font-semibold">이메일:</span> {customer.email}</div>
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

function CustomerFormModal({ editTarget, onSave, onClose }) {
  const [form, setForm] = useState(editTarget || {
    name: '', phone: '', email: '', address: '', grade: '일반',
    joinDate: new Date().toISOString().slice(0,10), memo: ''
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-serif-ko text-xl font-bold text-stone-800">
            {editTarget ? '고객 수정' : '고객 추가'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {!editTarget && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800">
              💡 고객ID는 저장 시 자동으로 생성됩니다 (C0001, C0002...)
            </div>
          )}
          <Field label="성함 *" value={form.name} onChange={v => setForm({...form, name: v})} />
          <Field label="연락처" value={form.phone} onChange={v => setForm({...form, phone: v})} />
          <Field label="이메일" value={form.email} onChange={v => setForm({...form, email: v})} />
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">등급</label>
            <select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100">
              <option>VIP</option><option>우수</option><option>일반</option><option>신규</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">주소</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
          </div>
          <Field label="가입일" type="date" value={form.joinDate} onChange={v => setForm({...form, joinDate: v})} />
          <Field label="메모" value={form.memo} onChange={v => setForm({...form, memo: v})} />
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button
            onClick={() => form.name && onSave(form)}
            disabled={!form.name}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 disabled:bg-stone-300"
          >
            {editTarget ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
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

  const baechu = items.find(i => i.code === 'P001');
  const chonggak = items.find(i => i.code === 'P002');

  const handleSaveStock = (code, newStock) => {
    setItems(items.map(i => i.code === code ? { ...i, realStock: newStock } : i));
    showToast('재고가 업데이트되었습니다');
  };

  const nextCode = () => {
    const nums = items.map(i => parseInt(i.code.replace('P',''), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return 'P' + String(max + 1).padStart(3, '0');
  };

  const handleSave = (item) => {
    if (editTarget) {
      setItems(items.map(i => i.code === editTarget.code ? { ...item, code: editTarget.code } : i));
      showToast('품목이 수정되었습니다');
    } else {
      setItems([...items, { ...item, code: nextCode() }]);
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
              <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">구성</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">단가</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">실재고</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600 text-xs">가용재고</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">상태</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const st = stockStatus(it.availStock);
              return (
                <tr key={it.code} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-red-800">{it.code}</span></td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {it.name}
                    {it.isSet && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">세트</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs">{it.spec}</td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-800 tabular-nums">{formatWon(it.price)}</td>
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
    name: '', spec: '', price: 0, realStock: 0, baechu: 0, chonggak: 0, memo: '', isSet: false
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-serif-ko text-xl font-bold text-stone-800">{editTarget ? '품목 수정' : '품목 추가'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
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
            <Field label="단가 ($)" type="number" value={form.price} onChange={v => setForm({...form, price: parseInt(v)||0})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">구성/용량</label>
            <input value={form.spec} onChange={e => setForm({...form, spec: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {!form.isSet && <Field label="실재고" type="number" value={form.realStock || 0} onChange={v => setForm({...form, realStock: parseInt(v)||0})} />}
            <Field label="배추김치 구성수량" type="number" value={form.baechu} onChange={v => setForm({...form, baechu: parseInt(v)||0})} />
            <Field label="총각김치 구성수량" type="number" value={form.chonggak} onChange={v => setForm({...form, chonggak: parseInt(v)||0})} />
          </div>
          <Field label="비고" value={form.memo} onChange={v => setForm({...form, memo: v})} />
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button onClick={() => form.name && onSave(form)} disabled={!form.name}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 disabled:bg-stone-300">
            {editTarget ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Shipping({ customers, orders, setOrders, showToast }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    if (!statusFilter) return [...orders].reverse();
    return orders.filter(o => o.shipStatus === statusFilter).reverse();
  }, [orders, statusFilter]);

  useEffect(() => { setDisplayLimit(50); }, [statusFilter]);

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

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문번호</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">고객</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">주문내역</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">배송지</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">배송방법</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">결제</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600 text-xs">메모</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">상태</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, displayLimit).map(o => {
                const c = customerMap[o.customerId];
                return (
                  <tr key={o.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-red-800">{o.id}</span></td>
                    <td className="px-4 py-3 font-medium text-stone-800">{c?.name || '-'}</td>
                    <td className="px-4 py-3 text-stone-700 text-xs">{o.itemName} × {o.qty}</td>
                    <td className="px-4 py-3 text-stone-600 text-xs max-w-[180px] truncate" title={c?.address}>{c?.address || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {o.deliveryMethod ? (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          o.deliveryMethod === '대면배송' ? 'bg-blue-50 text-blue-700' :
                          o.deliveryMethod === '비대면배송' ? 'bg-violet-50 text-violet-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>{o.deliveryMethod}</span>
                      ) : <span className="text-stone-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {o.paymentStatus ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700">{o.paymentStatus}</span>
                      ) : <span className="text-stone-400 text-xs">-</span>}
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
    paymentStatus: order.paymentStatus || '',
    deliveryMemo: order.deliveryMemo || '',
    shipDate: order.shipDate || '',
    arriveDate: order.arriveDate || ''
  });

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-slim" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="font-serif-ko text-xl font-bold text-stone-800">배송 정보 업데이트</h2>
            <div className="text-xs text-stone-500 mt-0.5">{order.id} · {customer?.name}고객님</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-600">
            <div>📦 {order.itemName} × {order.qty}</div>
            <div className="mt-1">📍 {customer?.address || '-'}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">배송상태</label>
            <select value={form.shipStatus} onChange={e => setForm({...form, shipStatus: e.target.value})}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100">
              <option>배송준비중</option><option>출고대기</option><option>배송중</option><option>배송완료</option><option>반송</option><option>취소</option>
            </select>
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
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">결제상태</label>
            <div className="flex gap-2">
              {['KA', '현금', '계좌'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({...form, paymentStatus: form.paymentStatus === p ? '' : p})}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.paymentStatus === p
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {p}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="출고일" type="date" value={form.shipDate} onChange={v => setForm({...form, shipDate: v})} />
            <Field label="예상도착일" type="date" value={form.arriveDate} onChange={v => setForm({...form, arriveDate: v})} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">취소</button>
          <button onClick={() => onSave({ ...order, ...form })}
            className="px-5 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
