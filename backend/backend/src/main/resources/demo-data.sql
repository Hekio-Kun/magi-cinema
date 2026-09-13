-- Magi Cinema demo catalog
--
-- This script is intentionally opt-in. Start the backend with the `demo`
-- profile to load it (see README.md). All rows are fictional and the script
-- is idempotent so restarting the profile does not create duplicates.

-- The application also creates these roles on startup. They are included here
-- because SQL initialization runs before ApplicationRunner and demo accounts
-- need the CUSTOMER role immediately.
INSERT INTO roles (role_name, description)
VALUES ('CUSTOMER', 'Registered customer account')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO genre (name, description)
VALUES
    ('Hành động', 'Phim hành động kịch tính'),
    ('Hài hước', 'Phim hài giải trí'),
    ('Tình cảm', 'Phim tình cảm lãng mạn'),
    ('Kinh dị', 'Phim kinh dị giật gân'),
    ('Hoạt hình', 'Phim hoạt hình dành cho gia đình'),
    ('Phiêu lưu', 'Phim phiêu lưu khám phá'),
    ('Khoa học viễn tưởng', 'Phim khoa học viễn tưởng'),
    ('Gia đình', 'Phim phù hợp cho cả gia đình'),
    ('Âm nhạc', 'Phim có chủ đề âm nhạc')
ON CONFLICT (name) DO NOTHING;

-- Ticket prices used by the demo catalog.
INSERT INTO ticket_price_config (
    config_id, standard_2d_price, standard_3d_price, imax_3d_price,
    four_dx_3d_price, vip_seat_surcharge, couple_seat_surcharge,
    disabled_seat_surcharge, u22_base_price, updated_at
)
VALUES (1, 75000, 95000, 135000, 155000, 15000, 75000, 0, 55000, CURRENT_TIMESTAMP)
ON CONFLICT (config_id) DO UPDATE SET
    standard_2d_price = EXCLUDED.standard_2d_price,
    standard_3d_price = EXCLUDED.standard_3d_price,
    imax_3d_price = EXCLUDED.imax_3d_price,
    four_dx_3d_price = EXCLUDED.four_dx_3d_price,
    vip_seat_surcharge = EXCLUDED.vip_seat_surcharge,
    couple_seat_surcharge = EXCLUDED.couple_seat_surcharge,
    disabled_seat_surcharge = EXCLUDED.disabled_seat_surcharge,
    u22_base_price = EXCLUDED.u22_base_price,
    updated_at = CURRENT_TIMESTAMP;

-- Eight rooms cover the normal, IMAX, 4DX, VIP and couple-seat cases shown in
-- the booking UI. Explicit IDs make a fresh empty database work as well as an
-- existing database that already has Room 1..5.
INSERT INTO cinema_room (cinema_room_id, cinema_room_name, seat_quantity, seats_per_row, type, status)
VALUES
    (1, 'Magi 1 · Standard', 96, 12, 'STANDARD', 'ACTIVE'),
    (2, 'Magi 2 · Standard', 120, 12, 'STANDARD', 'ACTIVE'),
    (3, 'Magi 3 · IMAX', 120, 12, 'IMAX', 'ACTIVE'),
    (4, 'Magi 4 · 4DX', 96, 12, '4DX', 'ACTIVE'),
    (5, 'Magi 5 · VIP', 72, 12, 'VIP', 'ACTIVE'),
    (6, 'Magi 6 · Premium', 120, 12, 'STANDARD', 'ACTIVE'),
    (7, 'Magi 7 · Couple', 72, 12, 'BED', 'ACTIVE'),
    (8, 'Magi 8 · Event', 96, 12, 'STANDARD', 'ACTIVE')
ON CONFLICT (cinema_room_id) DO UPDATE SET
    cinema_room_name = EXCLUDED.cinema_room_name,
    seat_quantity = EXCLUDED.seat_quantity,
    seats_per_row = EXCLUDED.seats_per_row,
    type = EXCLUDED.type,
    status = EXCLUDED.status;

SELECT setval(
    pg_get_serial_sequence('cinema_room', 'cinema_room_id'),
    GREATEST((SELECT COALESCE(MAX(cinema_room_id), 1) FROM cinema_room), 1),
    true
);

-- Generate a conventional A01-L12 seat map. The last row is VIP in normal
-- rooms, while the couple room uses couple seats throughout.
INSERT INTO seat (cinema_room_id, seat_row, seat_number, seat_code, type, status)
SELECT r.cinema_room_id,
       chr(64 + row_no),
       seat_no,
       chr(64 + row_no) || lpad(seat_no::text, 2, '0'),
       CASE
           WHEN r.type = 'VIP' THEN 'VIP'
           WHEN r.type = 'BED' THEN 'COUPLE'
           WHEN row_no = ceil(r.seat_quantity::numeric / r.seats_per_row)::integer THEN 'VIP'
           ELSE 'NORMAL'
       END,
       'ACTIVE'
FROM cinema_room r
CROSS JOIN LATERAL generate_series(1, ceil(r.seat_quantity::numeric / r.seats_per_row)::integer) AS row_values(row_no)
CROSS JOIN LATERAL generate_series(1, r.seats_per_row) AS seat_values(seat_no)
WHERE r.status = 'ACTIVE'
  AND r.seats_per_row IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM seat s
      WHERE s.cinema_room_id = r.cinema_room_id
        AND s.seat_row = chr(64 + row_values.row_no)
        AND s.seat_number = seat_values.seat_no
  );

-- Four fictional movies keep the catalogue current regardless of the date on
-- which this profile is started.
INSERT INTO movie (
    movie_name_vn, movie_name_english, actor, director, content, duration,
    from_date, to_date, movie_production_company, large_image, small_image,
    backdrop_image, rating, age_rating, show_on_hero, is_hot, trailer, status
)
SELECT v.movie_name_vn, v.movie_name_english, v.actor, v.director, v.content,
       v.duration, CURRENT_DATE - 7, CURRENT_DATE + 45, v.company, v.image_url,
       v.image_url, v.backdrop_url, v.rating, v.age_rating, v.show_on_hero,
       v.is_hot, v.trailer, 'NOW_SHOWING'
FROM (VALUES
    ('Magi: Thành Phố Trên Mây', 'Magi: City Above the Clouds',
     'Nguyễn Trần Nam, Lê Minh Anh', 'Phạm Hoàng',
     'Một nhóm bạn trẻ khám phá thành phố bay và phải giải mã tín hiệu bí ẩn trước khi nguồn năng lượng cuối cùng cạn kiệt.',
     118, 'Magi Studios', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900',
     'https://images.unsplash.com/photo-1534791547706-3c5b5f2c1f3d?w=1400', 8.7, 'C13', true, true,
     'https://www.youtube.com/watch?v=ysz5S6PUM-U'),
    ('Tín Hiệu Từ Sao Băng', 'Signal From the Meteor',
     'Trần Gia Huy, Hoàng Yến', 'Đỗ Khánh',
     'Sau một trận mưa sao băng, cô kỹ sư âm thanh nhận được thông điệp có thể thay đổi tương lai của Trái Đất.',
     132, 'Magi Pictures', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=900',
     'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1400', 9.1, 'C13', true, true,
     'https://www.youtube.com/watch?v=ysz5S6PUM-U'),
    ('Biệt Đội Mèo Máy', 'Mecha Cats',
     'Lồng tiếng bởi Hà Linh, Quốc Bảo', 'Vũ Ngọc',
     'Bốn chú mèo máy vụng về trở thành đội cứu hộ bất đắc dĩ của thành phố trong ngày hội khoa học.',
     96, 'Magi Animation', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900',
     'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=1400', 8.4, 'P', true, false,
     'https://www.youtube.com/watch?v=ysz5S6PUM-U'),
    ('Khu Vườn Mùa Hè', 'The Summer Garden',
     'Ngọc Lan, Minh Khoa', 'Lâm Thảo',
     'Một ban nhạc học sinh tìm lại tình bạn và ước mơ khi sân khấu cũ của khu phố chuẩn bị bị tháo dỡ.',
     105, 'Magi Films', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
     'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1400', 8.2, 'K', false, false,
     'https://www.youtube.com/watch?v=ysz5S6PUM-U')
) AS v(movie_name_vn, movie_name_english, actor, director, content, duration, company,
       image_url, backdrop_url, rating, age_rating, show_on_hero, is_hot, trailer)
WHERE NOT EXISTS (
    SELECT 1 FROM movie m WHERE m.movie_name_english = v.movie_name_english
);

-- Movie format tags and genres.
INSERT INTO movie_type_enum (movie_id, type_name)
SELECT m.movie_id, v.type_name
FROM movie m
JOIN (VALUES
    ('Magi: City Above the Clouds', 'STANDARD'),
    ('Signal From the Meteor', 'IMAX'),
    ('Mecha Cats', '_4DX'),
    ('The Summer Garden', 'STANDARD')
) AS v(movie_name_english, type_name)
  ON v.movie_name_english = m.movie_name_english
WHERE NOT EXISTS (
    SELECT 1 FROM movie_type_enum mt
    WHERE mt.movie_id = m.movie_id AND mt.type_name = v.type_name
);

INSERT INTO movie_genre (movie_id, genre_id)
SELECT m.movie_id, g.genre_id
FROM movie m
JOIN (VALUES
    ('Magi: City Above the Clouds', 'Phiêu lưu'),
    ('Magi: City Above the Clouds', 'Khoa học viễn tưởng'),
    ('Signal From the Meteor', 'Khoa học viễn tưởng'),
    ('Signal From the Meteor', 'Phiêu lưu'),
    ('Mecha Cats', 'Hoạt hình'),
    ('Mecha Cats', 'Hài hước'),
    ('The Summer Garden', 'Tình cảm'),
    ('The Summer Garden', 'Âm nhạc')
) AS v(movie_name_english, genre_name) ON v.movie_name_english = m.movie_name_english
JOIN genre g ON g.name = v.genre_name
WHERE NOT EXISTS (
    SELECT 1 FROM movie_genre mg
    WHERE mg.movie_id = m.movie_id AND mg.genre_id = g.genre_id
);

-- One presentation per movie is enough for the demo booking flow.
INSERT INTO movie_presentation (
    movie_id, format, projection_type, language_type, audio_language,
    subtitle_language, label, active, sort_order
)
SELECT m.movie_id, v.format, v.projection_type, v.language_type, 'Tiếng Việt',
       'Tiếng Việt', v.label, true, 0
FROM movie m
JOIN (VALUES
    ('Magi: City Above the Clouds', 'STANDARD', 'TWO_D', 'SUBTITLE', 'Standard · 2D · Phụ đề'),
    ('Signal From the Meteor', 'IMAX', 'THREE_D', 'SUBTITLE', 'IMAX · 3D · Phụ đề'),
    ('Mecha Cats', '_4DX', 'THREE_D', 'DUBBED', '4DX · 3D · Lồng tiếng'),
    ('The Summer Garden', 'STANDARD', 'TWO_D', 'SUBTITLE', 'Standard · 2D · Phụ đề')
) AS v(movie_name_english, format, projection_type, language_type, label)
  ON v.movie_name_english = m.movie_name_english
WHERE NOT EXISTS (
    SELECT 1 FROM movie_presentation p
    WHERE p.movie_id = m.movie_id AND p.format = v.format
);

-- A nine-day rolling schedule (-2 .. +6) gives the dashboard history and a
-- full week of bookable showtimes. Re-running on another day creates the new
-- rolling window without duplicating the same date/time/movie/room row.
WITH demo_movies AS (
    SELECT m.movie_id, m.movie_name_english, m.duration, p.presentation_id,
           CASE m.movie_name_english
               WHEN 'Magi: City Above the Clouds' THEN 1
               WHEN 'The Summer Garden' THEN 2
               WHEN 'Signal From the Meteor' THEN 3
               WHEN 'Mecha Cats' THEN 4
           END AS room_id,
           CASE m.movie_name_english
               WHEN 'Signal From the Meteor' THEN 135000
               WHEN 'Mecha Cats' THEN 155000
               ELSE 75000
           END AS base_price
    FROM movie m
    JOIN movie_presentation p ON p.movie_id = m.movie_id AND p.active = true
    WHERE m.movie_name_english IN (
        'Magi: City Above the Clouds', 'The Summer Garden',
        'Signal From the Meteor', 'Mecha Cats'
    )
), slots(start_time) AS (
    VALUES (TIME '09:30'), (TIME '14:00'), (TIME '19:30')
), candidates AS (
    SELECT dm.*, CURRENT_DATE + days.day_offset AS show_date, slots.start_time,
           (slots.start_time + (dm.duration + 20) * INTERVAL '1 minute')::time AS end_time,
           CASE WHEN days.day_offset < 0 THEN 'COMPLETED' ELSE 'SCHEDULED' END AS showtime_status
    FROM demo_movies dm
    CROSS JOIN generate_series(-2, 6) AS days(day_offset)
    CROSS JOIN slots
)
INSERT INTO showtime (
    movie_id, cinema_room_id, presentation_id, show_date, start_time, end_time,
    base_price, status
)
SELECT c.movie_id, c.room_id, c.presentation_id, c.show_date, c.start_time,
       c.end_time, c.base_price, c.showtime_status
FROM candidates c
WHERE NOT EXISTS (
    SELECT 1 FROM showtime s
    WHERE s.movie_id = c.movie_id
      AND s.cinema_room_id = c.room_id
      AND s.show_date = c.show_date
      AND s.start_time = c.start_time
);

-- Create a seat row for each showtime. A small deterministic number of seats
-- is marked booked so seat maps and occupancy reports look realistic while
-- the rest remain available for a real booking test.
INSERT INTO showtime_seat (showtime_id, seat_id, status)
SELECT st.showtime_id, s.seat_id,
       CASE WHEN st.show_date <= CURRENT_DATE + 2 AND s.seat_number IN (3, 7, 11)
            THEN 'BOOKED' ELSE 'AVAILABLE' END
FROM showtime st
JOIN seat s ON s.cinema_room_id = st.cinema_room_id AND s.status = 'ACTIVE'
JOIN movie m ON m.movie_id = st.movie_id
WHERE m.movie_name_english IN (
    'Magi: City Above the Clouds', 'The Summer Garden',
    'Signal From the Meteor', 'Mecha Cats'
)
  AND NOT EXISTS (
      SELECT 1 FROM showtime_seat ss
      WHERE ss.showtime_id = st.showtime_id AND ss.seat_id = s.seat_id
  );

-- Concession catalogue.
INSERT INTO food_item (name, price, image_url, category, is_active)
SELECT v.name, v.price, v.image_url, v.category, true
FROM (VALUES
    ('Bắp rang bơ', 45000, 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=700', 'POPCORN'),
    ('Nước ngọt có ga', 30000, 'https://images.unsplash.com/photo-1629203849820-fdd70d49c38e?w=700', 'DRINK'),
    ('Trà đào cam sả', 39000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=700', 'DRINK'),
    ('Xúc xích nướng', 35000, 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=700', 'SNACK'),
    ('Khoai tây chiên', 40000, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=700', 'SNACK'),
    ('Nước suối Magi', 20000, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=700', 'DRINK')
) AS v(name, price, image_url, category)
WHERE NOT EXISTS (SELECT 1 FROM food_item f WHERE f.name = v.name);

INSERT INTO food_variant (food_item_id, variant_name, size_label, flavor, price,
                          purchase_price, is_active, display_order, stock_quantity)
SELECT f.food_item_id, v.variant_name, v.size_label, v.flavor, v.price,
       v.purchase_price, true, 0, v.stock_quantity
FROM food_item f
JOIN (VALUES
    ('Bắp rang bơ', 'Vừa · Caramel', 'M', 'Caramel', 45000, 22000, 80),
    ('Bắp rang bơ', 'Lớn · Phô mai', 'L', 'Phô mai', 65000, 30000, 60),
    ('Nước ngọt có ga', 'Vừa', 'M', 'Cola', 30000, 12000, 100),
    ('Trà đào cam sả', 'Vừa', 'M', 'Đào', 39000, 15000, 70),
    ('Xúc xích nướng', 'Một phần', NULL, NULL, 35000, 16000, 50),
    ('Khoai tây chiên', 'Một phần', NULL, NULL, 40000, 18000, 50),
    ('Nước suối Magi', 'Chai 500ml', NULL, NULL, 20000, 8000, 120)
) AS v(item_name, variant_name, size_label, flavor, price, purchase_price, stock_quantity)
  ON v.item_name = f.name
WHERE NOT EXISTS (
    SELECT 1 FROM food_variant fv
    WHERE fv.food_item_id = f.food_item_id AND fv.variant_name = v.variant_name
);

INSERT INTO combo (name, description, price, image_url, status)
SELECT v.name, v.description, v.price, v.image_url, 'ACTIVE'
FROM (VALUES
    ('Combo Hẹn Hò', 'Bắp caramel lớn, 2 nước ngọt và khoai tây chiên.', 149000,
     'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=700'),
    ('Combo Gia Đình', 'Bắp phô mai lớn, 4 nước ngọt và 2 xúc xích nướng.', 229000,
     'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=700'),
    ('Combo Solo', 'Bắp rang bơ vừa và một nước ngọt.', 69000,
     'https://images.unsplash.com/photo-1629203849820-fdd70d49c38e?w=700')
) AS v(name, description, price, image_url)
WHERE NOT EXISTS (SELECT 1 FROM combo c WHERE c.name = v.name);

INSERT INTO combo_item (combo_id, food_item_id, food_variant_id, quantity)
SELECT c.combo_id, f.food_item_id, fv.food_variant_id, v.quantity
FROM (VALUES
    ('Combo Hẹn Hò', 'Bắp rang bơ', 'Lớn · Phô mai', 1),
    ('Combo Hẹn Hò', 'Nước ngọt có ga', 'Vừa', 2),
    ('Combo Hẹn Hò', 'Khoai tây chiên', 'Một phần', 1),
    ('Combo Gia Đình', 'Bắp rang bơ', 'Lớn · Phô mai', 1),
    ('Combo Gia Đình', 'Nước ngọt có ga', 'Vừa', 4),
    ('Combo Gia Đình', 'Xúc xích nướng', 'Một phần', 2),
    ('Combo Solo', 'Bắp rang bơ', 'Vừa · Caramel', 1),
    ('Combo Solo', 'Nước ngọt có ga', 'Vừa', 1)
) AS v(combo_name, item_name, variant_name, quantity)
JOIN combo c ON c.name = v.combo_name
JOIN food_item f ON f.name = v.item_name
JOIN food_variant fv ON fv.food_item_id = f.food_item_id AND fv.variant_name = v.variant_name
WHERE NOT EXISTS (
    SELECT 1 FROM combo_item ci
    WHERE ci.combo_id = c.combo_id AND ci.food_item_id = f.food_item_id
      AND ci.food_variant_id = fv.food_variant_id
);

-- Current promotions with easy-to-test codes.
INSERT INTO promotion (
    name, code, description, promotion_type, discount_type, discount_value,
    max_discount_amount, min_order_amount, start_at, end_at,
    daily_start_time, daily_end_time, status, total_usage_limit_type,
    total_usage_limit, per_customer_usage_limit_type, per_customer_usage_limit,
    wallet_payment_method, created_at, updated_at
)
SELECT v.name, v.code, v.description, v.promotion_type, v.discount_type,
       v.discount_value, v.max_discount_amount, v.min_order_amount,
       CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '45 days',
       v.daily_start_time, v.daily_end_time, 'ACTIVE', v.total_limit_type,
       v.total_limit, v.customer_limit_type, v.customer_limit,
       v.wallet_payment_method, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Magi Momo 15%', 'MAGI15', 'Giảm 15% khi thanh toán bằng MoMo, tối đa 30.000đ.',
     'E_WALLET', 'PERCENTAGE', 15, 30000, 100000, TIME '10:00', TIME '16:00',
     'LIMITED', 500, 'LIMITED', 2, 'MOMO'),
    ('Magi Thành Viên', 'MAGIMEMBER10', 'Ưu đãi 10% cho thành viên Magi Cinema.',
     'MEMBER_TIER', 'PERCENTAGE', 10, 50000, 80000, NULL, NULL,
     'UNLIMITED', NULL, 'LIMITED', 3, NULL)
) AS v(name, code, description, promotion_type, discount_type, discount_value,
       max_discount_amount, min_order_amount, daily_start_time, daily_end_time,
       total_limit_type, total_limit, customer_limit_type, customer_limit,
       wallet_payment_method)
WHERE NOT EXISTS (SELECT 1 FROM promotion p WHERE p.code = v.code);

INSERT INTO promotion_member_tier (promotion_id, member_tier)
SELECT p.promotion_id, v.member_tier
FROM promotion p
CROSS JOIN (VALUES ('SILVER'), ('GOLD'), ('PLATINUM')) AS v(member_tier)
WHERE p.code = 'MAGIMEMBER10'
  AND NOT EXISTS (
      SELECT 1 FROM promotion_member_tier pm
      WHERE pm.promotion_id = p.promotion_id AND pm.member_tier = v.member_tier
  );

-- Membership plans shown in the account and checkout pages.
INSERT INTO membership_plans (
    code, name, description, price, duration_days, ticket_discount_percent,
    combo_discount_percent, point_multiplier, max_ticket_discount,
    max_combo_discount, priority_booking_hours, annual_spend_min,
    annual_spend_max, ticket_earn_percent, concession_earn_percent,
    annual_free_tickets, free_ticket_type, status, created_at, updated_at
)
SELECT v.code, v.name, v.description, v.price, v.duration_days,
       v.ticket_discount_percent, v.combo_discount_percent, v.point_multiplier,
       v.max_ticket_discount, v.max_combo_discount, v.priority_booking_hours,
       v.annual_spend_min, v.annual_spend_max, v.ticket_earn_percent,
       v.concession_earn_percent, v.annual_free_tickets, v.free_ticket_type,
       'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('MAGI-SILVER', 'Magi Silver', 'Ưu đãi cơ bản cho khán giả thường xuyên.',
     99000, 365, 5.00, 5.00, 1.10, 30000, 20000, 12, 0, 2999999, 1.00, 1.00, 0, 'STANDARD_2D'),
    ('MAGI-GOLD', 'Magi Gold', 'Thêm ưu đãi vé, combo và quyền đặt sớm.',
     249000, 365, 10.00, 10.00, 1.25, 60000, 40000, 24, 3000000, NULL, 1.50, 1.50, 1, 'ANY')
) AS v(code, name, description, price, duration_days, ticket_discount_percent,
       combo_discount_percent, point_multiplier, max_ticket_discount,
       max_combo_discount, priority_booking_hours, annual_spend_min,
       annual_spend_max, ticket_earn_percent, concession_earn_percent,
       annual_free_tickets, free_ticket_type)
WHERE NOT EXISTS (SELECT 1 FROM membership_plans mp WHERE mp.code = v.code);

-- Fictional demo customer. Password: `password` (only use this account in a
-- local demo database; production credentials are never seeded here).
INSERT INTO users (user_id, username, email, password_hash, status, created_at)
SELECT '11111111-1111-4111-8111-111111111111', 'demo.customer',
       'demo.customer@magicinema.local',
       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
       'ACTIVE', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'demo.customer'
       OR email = 'demo.customer@magicinema.local'
);

INSERT INTO user_roles (user_id, role_name)
SELECT '11111111-1111-4111-8111-111111111111', 'CUSTOMER'
WHERE EXISTS (SELECT 1 FROM users WHERE user_id = '11111111-1111-4111-8111-111111111111')
  AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = '11111111-1111-4111-8111-111111111111' AND role_name = 'CUSTOMER'
  );

INSERT INTO user_profiles (
    user_id, full_name, phone_number, date_of_birth, member_tier, gender,
    address, email, is_active, loyalty_points, created_at, updated_at
)
SELECT '11111111-1111-4111-8111-111111111111', 'Nguyễn Minh Anh',
       '0900000123', DATE '2001-08-18', 'SILVER', 'FEMALE',
       'Quận 3, TP. Hồ Chí Minh', 'demo.customer@magicinema.local', true,
       1240, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = '11111111-1111-4111-8111-111111111111'
);

-- A successful sample booking makes account history and occupancy reports
-- useful immediately. Its ticket seat is deliberately fixed and local.
WITH target AS (
    SELECT st.showtime_id, st.base_price, ss.showtime_seat_id
    FROM showtime st
    JOIN movie m ON m.movie_id = st.movie_id
    JOIN showtime_seat ss ON ss.showtime_id = st.showtime_id
    JOIN seat s ON s.seat_id = ss.seat_id
    WHERE m.movie_name_english = 'Magi: City Above the Clouds'
      AND st.show_date = CURRENT_DATE - 1
      AND st.start_time = TIME '19:30'
      AND s.seat_code = 'A01'
    LIMIT 1
)
INSERT INTO booking (
    user_id, showtime_id, total_amount, original_amount, discount_amount,
    payment_method, status, booking_channel, loyalty_points_earned,
    membership_point_eligible_ticket_subtotal, membership_free_tickets_used,
    membership_reward_discount, loyalty_points_redeemed,
    membership_eligible_spend, ticket_subtotal, ticket_qr_token, created_at
)
SELECT '11111111-1111-4111-8111-111111111111', t.showtime_id, t.base_price,
       t.base_price, 0, 'MOMO', 'SUCCESS', 'ONLINE', 8, t.base_price, 0,
       0, 0, t.base_price, t.base_price, 'DEMO-SEED-BOOKING-000000001',
       CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM target t
WHERE NOT EXISTS (
    SELECT 1 FROM booking b WHERE b.ticket_qr_token = 'DEMO-SEED-BOOKING-000000001'
);

INSERT INTO ticket (booking_id, showtime_seat_id, price)
SELECT b.booking_id, ss.showtime_seat_id, st.base_price
FROM booking b
JOIN showtime st ON st.showtime_id = b.showtime_id
JOIN showtime_seat ss ON ss.showtime_id = st.showtime_id
JOIN seat s ON s.seat_id = ss.seat_id
WHERE b.ticket_qr_token = 'DEMO-SEED-BOOKING-000000001'
  AND s.seat_code = 'A01'
  AND NOT EXISTS (
      SELECT 1 FROM ticket t WHERE t.booking_id = b.booking_id AND t.showtime_seat_id = ss.showtime_seat_id
  );

UPDATE showtime_seat ss
SET status = 'BOOKED'
FROM ticket t
WHERE t.showtime_seat_id = ss.showtime_seat_id;
