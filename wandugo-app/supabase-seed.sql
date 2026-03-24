-- WanduGo – Schema + Seed (combined)
-- Run this single file in Supabase SQL Editor (fresh project or re-seed)
-- Covers Toronto, Vancouver, Calgary, Montreal, Ottawa

-- ==========================================
-- SCHEMA (idempotent – safe to re-run)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('jobs', 'community', 'marketplace', 'housing', 'events', 'tips', 'buy-sell', 'group-buy')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  session_id TEXT NOT NULL,
  price DOUBLE PRECISION,
  image_url TEXT,
  likes INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_session ON posts(session_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous'
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_members_session ON chat_members(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'location'))
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE TABLE IF NOT EXISTS profiles (
  session_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  bio TEXT DEFAULT '',
  photo_url TEXT,
  location_text TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'like', 'application', 'system')),
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_session ON notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(session_id, read);

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Anyone can read posts') THEN
    CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
    CREATE POLICY "Anyone can create posts" ON posts FOR INSERT WITH CHECK (true);
    CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE USING (true);
    CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
    CREATE POLICY "Anyone can create comments" ON comments FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read chats" ON chats FOR SELECT USING (true);
    CREATE POLICY "Anyone can create chats" ON chats FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read chat members" ON chat_members FOR SELECT USING (true);
    CREATE POLICY "Anyone can join chats" ON chat_members FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
    CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
    CREATE POLICY "Anyone can create profiles" ON profiles FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can update profiles" ON profiles FOR UPDATE USING (true);
    CREATE POLICY "Anyone can read notifications" ON notifications FOR SELECT USING (true);
    CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can update notifications" ON notifications FOR UPDATE USING (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ==========================================
-- SEED DATA
-- ==========================================

-- ==========================================
-- PROFILES
-- ==========================================
INSERT INTO profiles (session_id, name, bio, location_text, lat, lng, rating) VALUES
  ('seed-session-001', 'MinJun Kim', 'Recently moved to Toronto. Love hiking and cooking Korean food.', 'North York, Toronto', 43.7615, -79.4111, 4.8),
  ('seed-session-002', 'Sarah Chen', 'UBC grad student. Looking for roommates and study groups.', 'Kitsilano, Vancouver', 49.2676, -123.1558, 4.5),
  ('seed-session-003', 'James Park', 'Software dev. Weekend soccer player.', 'Downtown Calgary', 51.0447, -114.0719, 4.7),
  ('seed-session-004', 'Yuna Lee', 'ESL teacher. Happy to help with English conversation practice.', 'Plateau-Mont-Royal, Montreal', 45.5236, -73.5814, 4.9),
  ('seed-session-005', 'David Choi', 'Uber driver part-time. Good at navigating Ottawa.', 'Centretown, Ottawa', 45.4215, -75.6972, 4.3),
  ('seed-session-006', 'Emily Wang', 'Food blogger. Always looking for the best dim sum spots.', 'Richmond Hill, Toronto', 43.8828, -79.4403, 4.6),
  ('seed-session-007', 'Kevin Oh', 'Electrician. Available for small jobs on weekends.', 'Burnaby, Vancouver', 49.2488, -122.9805, 4.4),
  ('seed-session-008', 'Rina Tanaka', 'Japanese-Canadian. Runs a small online shop selling handmade crafts.', 'Mississauga, ON', 43.5890, -79.6441, 4.7);

-- ==========================================
-- POSTS — JOBS
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, price, likes) VALUES
  (uuid_generate_v4(), 'Part-time Korean restaurant server needed', '토론토 북쪽 한식당에서 파트타임 서버 구합니다. 주말 포함 주 3일 근무. 영어 기본 가능하신 분. 시급 $17 + 팁. 연락 주세요!', 'jobs', 43.7965, -79.4147, 'Yonge & Sheppard, Toronto', 'MinJun Kim', 'seed-session-001', 17.00, 12),
  (uuid_generate_v4(), 'Delivery driver wanted – Korean grocery', '한인 식료품점에서 배달 기사님 모십니다. 차량 소지자 우대. 풀타임/파트타임 모두 가능. 경력 무관. Scarborough 지역.', 'jobs', 43.7731, -79.2576, 'Scarborough Town Centre', 'Emily Wang', 'seed-session-006', 20.00, 8),
  (uuid_generate_v4(), 'IT support tech – bilingual (Korean/English)', 'Small IT company in downtown Toronto seeking bilingual support tech. Korean/English required. $55k–$65k annually. Apply with resume.', 'jobs', 43.6510, -79.3470, 'Downtown Toronto', 'James Park', 'seed-session-003', NULL, 20),
  (uuid_generate_v4(), 'Babysitter wanted – Korean-speaking preferred', '주 2–3회 오후 방과 후 아이 돌봄 구합니다. 한국어 가능하신 분 우대. 노스욕 지역. 시급 협의.', 'jobs', 43.7615, -79.4111, 'North York, Toronto', 'Yuna Lee', 'seed-session-004', 18.00, 5),
  (uuid_generate_v4(), 'Electrician helper wanted – no experience OK', 'Licensed electrician seeking helper for residential jobs in Burnaby/Vancouver. Will train. Must have valid driver''s license.', 'jobs', 49.2488, -122.9805, 'Burnaby, BC', 'Kevin Oh', 'seed-session-007', 22.00, 9),
  (uuid_generate_v4(), 'Nail technician – full-time Vancouver', '밴쿠버 네일샵에서 네일 테크니션 구합니다. 자격증 소지자 우대. 풀타임. 영어 기본. 친절한 근무 환경.', 'jobs', 49.2827, -123.1207, 'Downtown Vancouver', 'Sarah Chen', 'seed-session-002', NULL, 14);

-- ==========================================
-- POSTS — COMMUNITY
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, likes) VALUES
  (uuid_generate_v4(), '토론토 한인 축구 모임 같이 하실 분!', '매주 토요일 오전 10시 Earl Bales Park에서 축구 하고 있어요. 실력 무관, 운동 좋아하시는 분 누구나 환영합니다. 장비는 개인 지참.', 'community', 43.7751, -79.4248, 'Earl Bales Park, Toronto', 'MinJun Kim', 'seed-session-001', 34),
  (uuid_generate_v4(), 'Korean language exchange – looking for English speakers', 'I''m a Korean speaker wanting to practice English. Happy to help you with Korean in return. Let''s meet at a café in Kitsilano weekly!', 'community', 49.2676, -123.1558, 'Kitsilano, Vancouver', 'Sarah Chen', 'seed-session-002', 22),
  (uuid_generate_v4(), '캘거리 한인 모임 새로 만들어요', '캘거리에 한인분들이 생각보다 적어서 소모임 하나 만들려고 합니다. 밥도 먹고 정보도 나누고 싶어요. 관심 있으신 분 댓글 남겨주세요!', 'community', 51.0447, -114.0719, 'Downtown Calgary', 'James Park', 'seed-session-003', 41),
  (uuid_generate_v4(), 'Study group – Canadian citizenship test', 'Anyone preparing for the Canadian citizenship test? Let''s form a study group. We can meet every Sunday in Ottawa. All backgrounds welcome.', 'community', 45.4215, -75.6972, 'Centretown, Ottawa', 'David Choi', 'seed-session-005', 17),
  (uuid_generate_v4(), '몬트리올 한인 여성 소모임 안내', '몬트리올에 계신 한인 여성분들 편하게 만나서 이야기 나눠요. 한 달에 한 번 카페 모임 생각 중입니다. 20–40대 누구나 환영!', 'community', 45.5236, -73.5814, 'Plateau-Mont-Royal, Montreal', 'Yuna Lee', 'seed-session-004', 29),
  (uuid_generate_v4(), 'Free English conversation class – Saturdays', 'I''m an ESL teacher offering free English conversation practice every Saturday 2–4pm near Finch station. All levels welcome.', 'community', 43.7800, -79.4147, 'Finch Station, Toronto', 'Yuna Lee', 'seed-session-004', 55);

-- ==========================================
-- POSTS — MARKETPLACE / BUY-SELL
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, price, likes) VALUES
  (uuid_generate_v4(), '[판매] 삼성 65인치 4K TV – $350', '2년 사용한 Samsung 65" QLED 4K TV 팝니다. 상태 매우 좋음. 리모컨, 스탠드 포함. 직거래만 가능. 노스욕 픽업.', 'buy-sell', 43.7615, -79.4111, 'North York, Toronto', 'MinJun Kim', 'seed-session-001', 350.00, 8),
  (uuid_generate_v4(), '[판매] 한국 주방용품 세트 – $60', '한국에서 가져온 냄비, 프라이팬 세트 팝니다. 거의 새거. 미시사가 픽업 또는 택배 가능.', 'marketplace', 43.5890, -79.6441, 'Mississauga, ON', 'Rina Tanaka', 'seed-session-008', 60.00, 11),
  (uuid_generate_v4(), 'IKEA desk + chair combo – $80 OBO', 'Selling my IKEA ALEX desk and MARKUS chair combo. Desk in great condition, chair has minor wear. Must pick up in Kitsilano.', 'buy-sell', 49.2676, -123.1558, 'Kitsilano, Vancouver', 'Sarah Chen', 'seed-session-002', 80.00, 6),
  (uuid_generate_v4(), '[구매희망] 중고 자전거 찾아요 – 예산 $200', '출퇴근용 중고 자전거 구합니다. 700c 또는 26인치. 예산 $200 내외. 캘거리 직거래 선호.', 'buy-sell', 51.0447, -114.0719, 'Calgary, AB', 'James Park', 'seed-session-003', 200.00, 3),
  (uuid_generate_v4(), 'Handmade Korean craft kits for sale', '집에서 만든 한국 전통 공예 키트 판매합니다. 노리개, 색동 파우치 등. 온라인 주문 가능. DM 주세요!', 'marketplace', 43.5890, -79.6441, 'Mississauga, ON', 'Rina Tanaka', 'seed-session-008', 25.00, 19),
  (uuid_generate_v4(), '[나눔] 이사 정리 – 무료 가전/잡동사니', '이사 가면서 냉장고, 소파, 전자레인지 등 무료 나눔합니다. 선착순 직접 픽업만 가능. 오타와 지역.', 'buy-sell', 45.4215, -75.6972, 'Centretown, Ottawa', 'David Choi', 'seed-session-005', 0.00, 38);

-- ==========================================
-- POSTS — HOUSING
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, price, likes) VALUES
  (uuid_generate_v4(), '룸메이트 구합니다 – 노스욕 2BR', '노스욕 Yonge/Sheppard 근처 2베드룸 아파트에서 룸메이트 구합니다. 월 $950 포함 (공과금 포함). 조용한 분 선호. 즉시 입주 가능.', 'housing', 43.7617, -79.4093, 'Yonge & Sheppard, Toronto', 'MinJun Kim', 'seed-session-001', 950.00, 27),
  (uuid_generate_v4(), 'Studio for rent – Kitsilano Vancouver', 'Cozy studio apartment available May 1st. $1,650/mo utilities included. No pets. Korean/English speakers welcome.', 'housing', 49.2676, -123.1558, 'Kitsilano, Vancouver', 'Sarah Chen', 'seed-session-002', 1650.00, 15),
  (uuid_generate_v4(), '미시사가 방 하나 렌트 – $850/월', '2베드룸 중 방 하나 렌트합니다. 화장실 공용. 주방 사용 가능. Square One 가까움. 여성분 우대.', 'housing', 43.5930, -79.6465, 'Square One, Mississauga', 'Rina Tanaka', 'seed-session-008', 850.00, 18),
  (uuid_generate_v4(), 'Basement suite – Calgary SW – $1,200', '2-bedroom basement suite in Calgary SW. Separate entrance, washer/dryer included. Available immediately. No smoking.', 'housing', 51.0203, -114.1193, 'SW Calgary', 'James Park', 'seed-session-003', 1200.00, 9);

-- ==========================================
-- POSTS — EVENTS
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, likes) VALUES
  (uuid_generate_v4(), '한인 설날 파티 – 토론토 모임!', '2월 초 한인 설날 모임을 진행합니다. 음식은 각자 조금씩 가져오는 포트락 방식. 노스욕 커뮤니티 센터 예정. 참가비 무료!', 'events', 43.7615, -79.4111, 'North York, Toronto', 'MinJun Kim', 'seed-session-001', 45),
  (uuid_generate_v4(), 'K-food pop-up market – Vancouver Sat', 'Korean food pop-up this Saturday at Granville Island! 12–5pm. Tteokbokki, kimbap, hotteok and more. Free entry.', 'events', 49.2712, -123.1346, 'Granville Island, Vancouver', 'Sarah Chen', 'seed-session-002', 61),
  (uuid_generate_v4(), 'Beginner hiking group – Gatineau Park', 'Join our beginner-friendly hike at Gatineau Park on the last Sunday of each month. All ages welcome. Bring water and snacks.', 'events', 45.4897, -75.8281, 'Gatineau Park, Ottawa', 'David Choi', 'seed-session-005', 23),
  (uuid_generate_v4(), '몬트리올 한인 김장 행사 안내', '올해 김장 같이 하실 분 모집합니다! 재료비 1인 $30. 종일 행사로 진행하며 점심 제공. 11월 예정.', 'events', 45.5236, -73.5814, 'Plateau-Mont-Royal, Montreal', 'Yuna Lee', 'seed-session-004', 33);

-- ==========================================
-- POSTS — TIPS
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, likes) VALUES
  (uuid_generate_v4(), '캐나다 운전면허 전환 팁 (온타리오)', '한국 면허를 온타리오 면허로 바꾸는 방법 정리했어요. G2로 바로 전환 가능하고 G1 필기시험 면제됩니다. DriveTest 센터 방문 전 준비물 목록 댓글에 공유할게요!', 'tips', 43.6532, -79.3832, 'Toronto, Ontario', 'MinJun Kim', 'seed-session-001', 88),
  (uuid_generate_v4(), 'How to get a Canadian SIN number – step by step', 'New to Canada? Here''s how to get your Social Insurance Number at a Service Canada office. Bring: passport, study/work permit, proof of address. Usually same-day!', 'tips', 49.2827, -123.1207, 'Vancouver, BC', 'Sarah Chen', 'seed-session-002', 74),
  (uuid_generate_v4(), '캐나다 세금 환급 신청 방법 (TurboTax 무료)', '소득이 낮거나 처음 신고하시는 분들을 위한 세금 환급 가이드입니다. TurboTax Free 버전으로 충분히 신고 가능합니다. 3월 전에 꼭 신청하세요!', 'tips', 43.6532, -79.3832, 'Toronto, Ontario', 'Emily Wang', 'seed-session-006', 102),
  (uuid_generate_v4(), 'Best Korean grocery stores in Calgary', 'Seoul Mart on Macleod Trail and H-Mart in NE Calgary are the best options. Seoul Mart has better prices, H-Mart has wider selection. Both carry Korean ramen, kimchi, and frozen foods.', 'tips', 51.0447, -114.0719, 'Calgary, AB', 'James Park', 'seed-session-003', 56),
  (uuid_generate_v4(), '캐나다 OHIP 건강보험 신청 꼭 하세요!', '온타리오 거주자라면 도착 후 3개월 대기 후 OHIP(건강보험) 신청 가능합니다. 필요 서류: 여권, 비자, 주소 증명 2개. 가까운 ServiceOntario에서 신청하세요.', 'tips', 43.6532, -79.3832, 'Toronto, Ontario', 'Yuna Lee', 'seed-session-004', 119);

-- ==========================================
-- POSTS — GROUP BUY
-- ==========================================
INSERT INTO posts (id, title, content, category, lat, lng, location_text, author_name, session_id, price, likes) VALUES
  (uuid_generate_v4(), '[공동구매] 한국 라면 박스 – 신라면/짜파게티', '한국 라면 박스 공동구매 합니다. 신라면 40개입 $45, 짜파게티 40개입 $42. 최소 5명 모이면 진행. 노스욕 픽업.', 'group-buy', 43.7615, -79.4111, 'North York, Toronto', 'Emily Wang', 'seed-session-006', 45.00, 31),
  (uuid_generate_v4(), '[공동구매] 한국 화장품 – 클리오, 이니스프리', '한국 화장품 공동구매 진행합니다. 30% 이상 저렴하게 구매 가능. 품목 리스트 DM으로 보내드려요. 미시사가 픽업.', 'group-buy', 43.5890, -79.6441, 'Mississauga, ON', 'Rina Tanaka', 'seed-session-008', NULL, 44),
  (uuid_generate_v4(), 'Group buy – Korean red pepper paste (gochujang) 5kg', 'Organizing a group buy for 5kg gochujang from Korean wholesale supplier. $28/unit. Need 10+ participants. Vancouver pickup.', 'group-buy', 49.2827, -123.1207, 'Downtown Vancouver', 'Sarah Chen', 'seed-session-002', 28.00, 22);

-- ==========================================
-- COMMENTS (on a few posts)
-- ==========================================
WITH target AS (SELECT id FROM posts WHERE title = '토론토 한인 축구 모임 같이 하실 분!' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, '저도 참가하고 싶어요! 몇 시에 어디서 모이나요?', 'seed-session-002', 'Sarah Chen' FROM target;

WITH target AS (SELECT id FROM posts WHERE title = '토론토 한인 축구 모임 같이 하실 분!' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, '포지션 상관없이 다 참가 가능한가요?', 'seed-session-005', 'David Choi' FROM target;

WITH target AS (SELECT id FROM posts WHERE title = '캐나다 운전면허 전환 팁 (온타리오)' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, '너무 유용한 정보 감사해요! 준비물 리스트도 공유해 주세요.', 'seed-session-004', 'Yuna Lee' FROM target;

WITH target AS (SELECT id FROM posts WHERE title = '캐나다 운전면허 전환 팁 (온타리오)' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, '저도 이거 하려고 했는데 예약은 어떻게 하나요?', 'seed-session-006', 'Emily Wang' FROM target;

WITH target AS (SELECT id FROM posts WHERE title = '캐나다 OHIP 건강보험 신청 꼭 하세요!' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, '워크퍼밋도 OHIP 신청 가능한가요?', 'seed-session-003', 'James Park' FROM target;

WITH target AS (SELECT id FROM posts WHERE title = 'Free English conversation class – Saturdays' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, 'This is amazing! What level is it aimed at?', 'seed-session-002', 'Sarah Chen' FROM target;

WITH target AS (SELECT id FROM posts WHERE title = 'K-food pop-up market – Vancouver Sat' LIMIT 1)
INSERT INTO comments (post_id, content, session_id, author_name)
SELECT id, 'Will there be bungeoppang? 🙏', 'seed-session-007', 'Kevin Oh' FROM target;

-- ==========================================
-- NOTIFICATIONS (sample)
-- ==========================================
WITH target AS (SELECT id FROM posts WHERE title = '토론토 한인 축구 모임 같이 하실 분!' LIMIT 1)
INSERT INTO notifications (session_id, type, content, post_id)
SELECT 'seed-session-001', 'comment', 'Sarah Chen이 회원님의 게시물에 댓글을 달았어요.', id FROM target;

WITH target AS (SELECT id FROM posts WHERE title = '캐나다 운전면허 전환 팁 (온타리오)' LIMIT 1)
INSERT INTO notifications (session_id, type, content, post_id)
SELECT 'seed-session-001', 'like', '회원님의 게시물이 큰 인기를 얻고 있어요! 좋아요 88개.', id FROM target;

INSERT INTO notifications (session_id, type, content, post_id) VALUES
  ('seed-session-001', 'system', 'WanduGo에 오신 것을 환영합니다! 주변 이웃과 연결해 보세요.', NULL);
