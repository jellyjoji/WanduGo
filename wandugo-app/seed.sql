-- WanduGo – Seed Data
-- Usage: node db-execute.js seed.sql
-- Safe to re-run (uses INSERT ... ON CONFLICT DO NOTHING / upsert patterns)
-- Run supabase-schema-only.sql first if starting fresh.

-- ==========================================
-- PROFILES
-- ==========================================
INSERT INTO profiles (session_id, name, bio, location_text, lat, lng, rating) VALUES
  ('seed-session-001', 'MinJun Kim',  'Recently moved to Toronto. Love hiking and cooking Korean food.',           'North York, Toronto',           43.7615,  -79.4111, 4.8),
  ('seed-session-002', 'Sarah Chen',  'UBC grad student. Looking for roommates and study groups.',                'Kitsilano, Vancouver',           49.2676, -123.1558, 4.5),
  ('seed-session-003', 'James Park',  'Software dev. Weekend soccer player.',                                     'Downtown Calgary',               51.0447, -114.0719, 4.7),
  ('seed-session-004', 'Yuna Lee',    'ESL teacher. Happy to help with English conversation practice.',           'Plateau-Mont-Royal, Montreal',   45.5236,  -73.5814, 4.9),
  ('seed-session-005', 'David Choi',  'Uber driver part-time. Good at navigating Ottawa.',                       'Centretown, Ottawa',             45.4215,  -75.6972, 4.3),
  ('seed-session-006', 'Emily Wang',  'Food blogger. Always looking for the best dim sum spots.',                 'Richmond Hill, Toronto',         43.8828,  -79.4403, 4.6),
  ('seed-session-007', 'Kevin Oh',    'Electrician. Available for small jobs on weekends.',                       'Burnaby, Vancouver',             49.2488, -122.9805, 4.4),
  ('seed-session-008', 'Rina Tanaka', 'Japanese-Canadian. Runs a small online shop selling handmade crafts.',    'Mississauga, ON',                43.5890,  -79.6441, 4.7)
ON CONFLICT (session_id) DO NOTHING;

-- ==========================================
-- POSTS (fixed UUIDs so comments can reference them)
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, price, likes) VALUES

  -- JOBS
  ('a1000000-0000-0000-0000-000000000001', 'Part-time Korean restaurant server needed',
   '토론토 북쪽 한식당에서 파트타임 서버 구합니다. 주말 포함 주 3일 근무. 영어 기본 가능하신 분. 시급 $17 + 팁. 연락 주세요!',
   'jobs', 43.7965, -79.4147, 'Yonge & Sheppard, Toronto', 'MinJun Kim', 'seed-session-001', 17, 12),

  ('a1000000-0000-0000-0000-000000000002', 'Delivery driver wanted – Korean grocery',
   '한인 식료품점에서 배달 기사님 모십니다. 차량 소지자 우대. 풀타임/파트타임 모두 가능. 경력 무관. Scarborough 지역.',
   'jobs', 43.7731, -79.2576, 'Scarborough Town Centre', 'Emily Wang', 'seed-session-006', 20, 8),

  ('a1000000-0000-0000-0000-000000000003', 'IT support tech – bilingual (Korean/English)',
   'Small IT company in downtown Toronto seeking bilingual support tech. Korean/English required. $55k–$65k annually. Apply with resume.',
   'jobs', 43.6510, -79.3470, 'Downtown Toronto', 'James Park', 'seed-session-003', null, 20),

  ('a1000000-0000-0000-0000-000000000004', 'Babysitter wanted – Korean-speaking preferred',
   '주 2–3회 오후 방과 후 아이 돌봄 구합니다. 한국어 가능하신 분 우대. 노스욕 지역. 시급 협의.',
   'jobs', 43.7615, -79.4111, 'North York, Toronto', 'Yuna Lee', 'seed-session-004', 18, 5),

  ('a1000000-0000-0000-0000-000000000005', 'Electrician helper wanted – no experience OK',
   'Licensed electrician seeking helper for residential jobs in Burnaby/Vancouver. Will train. Must have valid driver''s license.',
   'jobs', 49.2488, -122.9805, 'Burnaby, BC', 'Kevin Oh', 'seed-session-007', 22, 9),

  ('a1000000-0000-0000-0000-000000000006', 'Nail technician – full-time Vancouver',
   '밴쿠버 네일샵에서 네일 테크니션 구합니다. 자격증 소지자 우대. 풀타임. 영어 기본. 친절한 근무 환경.',
   'jobs', 49.2827, -123.1207, 'Downtown Vancouver', 'Sarah Chen', 'seed-session-002', null, 14),

  -- COMMUNITY
  ('a1000000-0000-0000-0000-000000000007', '토론토 한인 축구 모임 같이 하실 분!',
   '매주 토요일 오전 10시 Earl Bales Park에서 축구 하고 있어요. 실력 무관, 운동 좋아하시는 분 누구나 환영합니다. 장비는 개인 지참.',
   'community', 43.7751, -79.4248, 'Earl Bales Park, Toronto', 'MinJun Kim', 'seed-session-001', null, 34),

  ('a1000000-0000-0000-0000-000000000008', 'Korean language exchange – looking for English speakers',
   'I''m a Korean speaker wanting to practice English. Happy to help you with Korean in return. Let''s meet at a café in Kitsilano weekly!',
   'community', 49.2676, -123.1558, 'Kitsilano, Vancouver', 'Sarah Chen', 'seed-session-002', null, 22),

  ('a1000000-0000-0000-0000-000000000009', '캘거리 한인 모임 새로 만들어요',
   '캘거리에 한인분들이 생각보다 적어서 소모임 하나 만들려고 합니다. 밥도 먹고 정보도 나누고 싶어요. 관심 있으신 분 댓글 남겨주세요!',
   'community', 51.0447, -114.0719, 'Downtown Calgary', 'James Park', 'seed-session-003', null, 41),

  ('a1000000-0000-0000-0000-000000000010', 'Study group – Canadian citizenship test',
   'Anyone preparing for the Canadian citizenship test? Let''s form a study group. We can meet every Sunday in Ottawa. All backgrounds welcome.',
   'community', 45.4215, -75.6972, 'Centretown, Ottawa', 'David Choi', 'seed-session-005', null, 17),

  ('a1000000-0000-0000-0000-000000000011', '몬트리올 한인 여성 소모임 안내',
   '몬트리올에 계신 한인 여성분들 편하게 만나서 이야기 나눠요. 한 달에 한 번 카페 모임 생각 중입니다. 20–40대 누구나 환영!',
   'community', 45.5236, -73.5814, 'Plateau-Mont-Royal, Montreal', 'Yuna Lee', 'seed-session-004', null, 29),

  ('a1000000-0000-0000-0000-000000000012', 'Free English conversation class – Saturdays',
   'I''m an ESL teacher offering free English conversation practice every Saturday 2–4pm near Finch station. All levels welcome.',
   'community', 43.7800, -79.4147, 'Finch Station, Toronto', 'Yuna Lee', 'seed-session-004', null, 55),

  -- BUY-SELL / MARKETPLACE
  ('a1000000-0000-0000-0000-000000000013', '[판매] 삼성 65인치 4K TV – $350',
   '2년 사용한 Samsung 65" QLED 4K TV 팝니다. 상태 매우 좋음. 리모컨, 스탠드 포함. 직거래만 가능. 노스욕 픽업.',
   'buy-sell', 43.7615, -79.4111, 'North York, Toronto', 'MinJun Kim', 'seed-session-001', 350, 8),

  ('a1000000-0000-0000-0000-000000000014', '[판매] 한국 주방용품 세트 – $60',
   '한국에서 가져온 냄비, 프라이팬 세트 팝니다. 거의 새거. 미시사가 픽업 또는 택배 가능.',
   'marketplace', 43.5890, -79.6441, 'Mississauga, ON', 'Rina Tanaka', 'seed-session-008', 60, 11),

  ('a1000000-0000-0000-0000-000000000015', 'IKEA desk + chair combo – $80 OBO',
   'Selling my IKEA ALEX desk and MARKUS chair combo. Desk in great condition, chair has minor wear. Must pick up in Kitsilano.',
   'buy-sell', 49.2676, -123.1558, 'Kitsilano, Vancouver', 'Sarah Chen', 'seed-session-002', 80, 6),

  ('a1000000-0000-0000-0000-000000000016', '[구매희망] 중고 자전거 찾아요 – 예산 $200',
   '출퇴근용 중고 자전거 구합니다. 700c 또는 26인치. 예산 $200 내외. 캘거리 직거래 선호.',
   'buy-sell', 51.0447, -114.0719, 'Calgary, AB', 'James Park', 'seed-session-003', 200, 3),

  ('a1000000-0000-0000-0000-000000000017', 'Handmade Korean craft kits for sale',
   '집에서 만든 한국 전통 공예 키트 판매합니다. 노리개, 색동 파우치 등. 온라인 주문 가능. DM 주세요!',
   'marketplace', 43.5890, -79.6441, 'Mississauga, ON', 'Rina Tanaka', 'seed-session-008', 25, 19),

  ('a1000000-0000-0000-0000-000000000018', '[나눔] 이사 정리 – 무료 가전/잡동사니',
   '이사 가면서 냉장고, 소파, 전자레인지 등 무료 나눔합니다. 선착순 직접 픽업만 가능. 오타와 지역.',
   'buy-sell', 45.4215, -75.6972, 'Centretown, Ottawa', 'David Choi', 'seed-session-005', 0, 38),

  -- HOUSING
  ('a1000000-0000-0000-0000-000000000019', '룸메이트 구합니다 – 노스욕 2BR',
   '노스욕 Yonge/Sheppard 근처 2베드룸 아파트에서 룸메이트 구합니다. 월 $950 포함 (공과금 포함). 조용한 분 선호. 즉시 입주 가능.',
   'housing', 43.7617, -79.4093, 'Yonge & Sheppard, Toronto', 'MinJun Kim', 'seed-session-001', 950, 27),

  ('a1000000-0000-0000-0000-000000000020', 'Studio for rent – Kitsilano Vancouver',
   'Cozy studio apartment available May 1st. $1,650/mo utilities included. No pets. Korean/English speakers welcome.',
   'housing', 49.2676, -123.1558, 'Kitsilano, Vancouver', 'Sarah Chen', 'seed-session-002', 1650, 15),

  ('a1000000-0000-0000-0000-000000000021', '미시사가 방 하나 렌트 – $850/월',
   '2베드룸 중 방 하나 렌트합니다. 화장실 공용. 주방 사용 가능. Square One 가까움. 여성분 우대.',
   'housing', 43.5930, -79.6465, 'Square One, Mississauga', 'Rina Tanaka', 'seed-session-008', 850, 18),

  ('a1000000-0000-0000-0000-000000000022', 'Basement suite – Calgary SW – $1,200',
   '2-bedroom basement suite in Calgary SW. Separate entrance, washer/dryer included. Available immediately. No smoking.',
   'housing', 51.0203, -114.1193, 'SW Calgary', 'James Park', 'seed-session-003', 1200, 9),

  -- EVENTS
  ('a1000000-0000-0000-0000-000000000023', '한인 설날 파티 – 토론토 모임!',
   '2월 초 한인 설날 모임을 진행합니다. 음식은 각자 조금씩 가져오는 포트락 방식. 노스욕 커뮤니티 센터 예정. 참가비 무료!',
   'events', 43.7615, -79.4111, 'North York, Toronto', 'MinJun Kim', 'seed-session-001', null, 45),

  ('a1000000-0000-0000-0000-000000000024', 'K-food pop-up market – Vancouver Sat',
   'Korean food pop-up this Saturday at Granville Island! 12–5pm. Tteokbokki, kimbap, hotteok and more. Free entry.',
   'events', 49.2712, -123.1346, 'Granville Island, Vancouver', 'Sarah Chen', 'seed-session-002', null, 61),

  ('a1000000-0000-0000-0000-000000000025', 'Beginner hiking group – Gatineau Park',
   'Join our beginner-friendly hike at Gatineau Park on the last Sunday of each month. All ages welcome. Bring water and snacks.',
   'events', 45.4897, -75.8281, 'Gatineau Park, Ottawa', 'David Choi', 'seed-session-005', null, 23),

  ('a1000000-0000-0000-0000-000000000026', '몬트리올 한인 김장 행사 안내',
   '올해 김장 같이 하실 분 모집합니다! 재료비 1인 $30. 종일 행사로 진행하며 점심 제공. 11월 예정.',
   'events', 45.5236, -73.5814, 'Plateau-Mont-Royal, Montreal', 'Yuna Lee', 'seed-session-004', null, 33),

  -- TIPS
  ('a1000000-0000-0000-0000-000000000027', '캐나다 운전면허 전환 팁 (온타리오)',
   '한국 면허를 온타리오 면허로 바꾸는 방법 정리했어요. G2로 바로 전환 가능하고 G1 필기시험 면제됩니다. DriveTest 센터 방문 전 준비물 목록 댓글에 공유할게요!',
   'tips', 43.6532, -79.3832, 'Toronto, Ontario', 'MinJun Kim', 'seed-session-001', null, 88),

  ('a1000000-0000-0000-0000-000000000028', 'How to get a Canadian SIN number – step by step',
   'New to Canada? Here''s how to get your Social Insurance Number at a Service Canada office. Bring: passport, study/work permit, proof of address. Usually same-day!',
   'tips', 49.2827, -123.1207, 'Vancouver, BC', 'Sarah Chen', 'seed-session-002', null, 74),

  ('a1000000-0000-0000-0000-000000000029', '캐나다 세금 환급 신청 방법 (TurboTax 무료)',
   '소득이 낮거나 처음 신고하시는 분들을 위한 세금 환급 가이드입니다. TurboTax Free 버전으로 충분히 신고 가능합니다. 3월 전에 꼭 신청하세요!',
   'tips', 43.6532, -79.3832, 'Toronto, Ontario', 'Emily Wang', 'seed-session-006', null, 102),

  ('a1000000-0000-0000-0000-000000000030', 'Best Korean grocery stores in Calgary',
   'Seoul Mart on Macleod Trail and H-Mart in NE Calgary are the best options. Seoul Mart has better prices, H-Mart has wider selection.',
   'tips', 51.0447, -114.0719, 'Calgary, AB', 'James Park', 'seed-session-003', null, 56),

  ('a1000000-0000-0000-0000-000000000031', '캐나다 OHIP 건강보험 신청 꼭 하세요!',
   '온타리오 거주자라면 도착 후 3개월 대기 후 OHIP(건강보험) 신청 가능합니다. 필요 서류: 여권, 비자, 주소 증명 2개. 가까운 ServiceOntario에서 신청하세요.',
   'tips', 43.6532, -79.3832, 'Toronto, Ontario', 'Yuna Lee', 'seed-session-004', null, 119),

  -- GROUP-BUY
  ('a1000000-0000-0000-0000-000000000032', '[공동구매] 한국 라면 박스 – 신라면/짜파게티',
   '한국 라면 박스 공동구매 합니다. 신라면 40개입 $45, 짜파게티 40개입 $42. 최소 5명 모이면 진행. 노스욕 픽업.',
   'group-buy', 43.7615, -79.4111, 'North York, Toronto', 'Emily Wang', 'seed-session-006', 45, 31),

  ('a1000000-0000-0000-0000-000000000033', '[공동구매] 한국 화장품 – 클리오, 이니스프리',
   '한국 화장품 공동구매 진행합니다. 30% 이상 저렴하게 구매 가능. 품목 리스트 DM으로 보내드려요. 미시사가 픽업.',
   'group-buy', 43.5890, -79.6441, 'Mississauga, ON', 'Rina Tanaka', 'seed-session-008', null, 44),

  ('a1000000-0000-0000-0000-000000000034', 'Group buy – Korean red pepper paste (gochujang) 5kg',
   'Organizing a group buy for 5kg gochujang from Korean wholesale supplier. $28/unit. Need 10+ participants. Vancouver pickup.',
   'group-buy', 49.2827, -123.1207, 'Downtown Vancouver', 'Sarah Chen', 'seed-session-002', 28, 22)

ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- COMMENTS
-- ==========================================
INSERT INTO comments (post_id, content, session_id, author_name) VALUES
  ('a1000000-0000-0000-0000-000000000007', '저도 참가하고 싶어요! 몇 시에 어디서 모이나요?',                   'seed-session-002', 'Sarah Chen'),
  ('a1000000-0000-0000-0000-000000000007', '포지션 상관없이 다 참가 가능한가요?',                              'seed-session-005', 'David Choi'),
  ('a1000000-0000-0000-0000-000000000027', '너무 유용한 정보 감사해요! 준비물 리스트도 공유해 주세요.',        'seed-session-004', 'Yuna Lee'),
  ('a1000000-0000-0000-0000-000000000027', '저도 이거 하려고 했는데 예약은 어떻게 하나요?',                   'seed-session-006', 'Emily Wang'),
  ('a1000000-0000-0000-0000-000000000031', '워크퍼밋도 OHIP 신청 가능한가요?',                                'seed-session-003', 'James Park'),
  ('a1000000-0000-0000-0000-000000000012', 'This is amazing! What level is it aimed at?',                    'seed-session-002', 'Sarah Chen'),
  ('a1000000-0000-0000-0000-000000000024', 'Will there be bungeoppang? 🙏',                                   'seed-session-007', 'Kevin Oh');

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
INSERT INTO notifications (session_id, type, content, post_id) VALUES
  ('seed-session-001', 'comment', 'Sarah Chen이 회원님의 게시물에 댓글을 달았어요.',              'a1000000-0000-0000-0000-000000000007'),
  ('seed-session-001', 'like',    '회원님의 게시물이 큰 인기를 얻고 있어요! 좋아요 88개.',        'a1000000-0000-0000-0000-000000000027'),
  ('seed-session-001', 'system',  'WanduGo에 오신 것을 환영합니다! 주변 이웃과 연결해 보세요.',  null);
