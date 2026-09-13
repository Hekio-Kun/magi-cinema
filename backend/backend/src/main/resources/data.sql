-- ==========================================
-- ROLES
-- ==========================================
INSERT INTO roles (role_name, description)
VALUES
    ('ADMIN',    'Full system administration'),
    ('MANAGER',  'Cinema operation and content management'),
    ('STAFF',    'Daily ticket and customer support operations'),
    ('CUSTOMER', 'Registered customer account'),
    ('GUEST',    'Anonymous public visitor')
ON CONFLICT (role_name) DO NOTHING;

-- ==========================================
-- PERMISSIONS
-- ==========================================
INSERT INTO permission (name, description)
VALUES
    ('USER_VIEW',       'View user list and details'),
    ('USER_CREATE',     'Create new staff users'),
    ('USER_UPDATE',     'Update user information and status'),
    ('USER_DELETE',     'Soft-delete users'),
    ('ROLE_MANAGE',     'Manage roles and permissions'),
    ('MOVIE_VIEW',      'View movie list'),
    ('MOVIE_CREATE',    'Add new movies'),
    ('MOVIE_UPDATE',    'Edit movie details'),
    ('MOVIE_DELETE',    'Remove movies'),
    ('SHOWTIME_MANAGE', 'Manage showtimes and room assignments'),
    ('COMBO_MANAGE',    'Manage combos and snacks'),
    ('PROMOTION_MANAGE','Manage promotions and promotion usage'),
    ('CONTACT_MANAGE',  'Manage customer contacts and feedback'),
    ('BOOKING_VIEW',    'View booking history and reports'),
    ('BOOKING_MANAGE',  'Manage bookings and ticket cancellations'),
    ('SCHEDULE_MANAGE', 'Create staff schedules and manage attendance')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- ROLE - PERMISSION MAPPING
-- ==========================================
INSERT INTO role_permissions (role_name, name)
VALUES
    ('ADMIN',   'USER_VIEW'),
    ('ADMIN',   'USER_CREATE'),
    ('ADMIN',   'USER_UPDATE'),
    ('ADMIN',   'USER_DELETE'),
    ('ADMIN',   'ROLE_MANAGE'),
    ('ADMIN',   'MOVIE_VIEW'),
    ('ADMIN',   'MOVIE_CREATE'),
    ('ADMIN',   'MOVIE_UPDATE'),
    ('ADMIN',   'MOVIE_DELETE'),
    ('ADMIN',   'SHOWTIME_MANAGE'),
    ('ADMIN',   'COMBO_MANAGE'),
    ('ADMIN',   'PROMOTION_MANAGE'),
    ('ADMIN',   'CONTACT_MANAGE'),
    ('ADMIN',   'BOOKING_VIEW'),
    ('ADMIN',   'BOOKING_MANAGE'),
    ('MANAGER', 'MOVIE_VIEW'),
    ('MANAGER', 'MOVIE_CREATE'),
    ('MANAGER', 'MOVIE_UPDATE'),
    ('MANAGER', 'SHOWTIME_MANAGE'),
    ('MANAGER', 'COMBO_MANAGE'),
    ('MANAGER', 'PROMOTION_MANAGE'),
    ('MANAGER', 'CONTACT_MANAGE'),
    ('MANAGER', 'BOOKING_VIEW'),
    ('MANAGER', 'SCHEDULE_MANAGE'),
    ('STAFF',   'MOVIE_VIEW'),
    ('STAFF',   'BOOKING_VIEW'),
    ('STAFF',   'BOOKING_MANAGE'),
    ('CUSTOMER','MOVIE_VIEW'),
    ('ADMIN',   'SCHEDULE_MANAGE')
ON CONFLICT DO NOTHING;

-- ==========================================
-- CINEMA ROOMS
-- ==========================================
INSERT INTO cinema_room (cinema_room_id, cinema_room_name, seat_quantity, status)
VALUES
    (1, 'Room 1', 100, 'ACTIVE'),
    (2, 'Room 2', 120, 'ACTIVE'),
    (3, 'Room 3', 80,  'ACTIVE'),
    (4, 'Room 4', 150, 'ACTIVE'),
    (5, 'Room 5', 100, 'ACTIVE')
ON CONFLICT (cinema_room_id) DO UPDATE SET
    cinema_room_name = EXCLUDED.cinema_room_name,
    seat_quantity = EXCLUDED.seat_quantity,
    status = EXCLUDED.status;

SELECT setval(
    pg_get_serial_sequence('cinema_room', 'cinema_room_id'),
    GREATEST((SELECT COALESCE(MAX(cinema_room_id), 1) FROM cinema_room), 1),
    true
);

-- ==========================================
-- GENRES
-- ==========================================
INSERT INTO genre (name, description) VALUES
    ('Hành động', 'Phim hành động kịch tính'),
    ('Hài hước', 'Phim hài giải trí'),
    ('Tình cảm', 'Phim tình cảm lãng mạn'),
    ('Kinh dị', 'Phim kinh dị giật gân'),
    ('Hoạt hình', 'Phim hoạt hình dành cho gia đình'),
    ('Phiêu lưu', 'Phim phiêu lưu khám phá'),
    ('Khoa học viễn tưởng', 'Phim khoa học viễn tưởng'),
    ('Thanh xuân', 'Phim học đường, tuổi trẻ')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- MOVIES
-- ==========================================
INSERT INTO movie (
    movie_name_vn, movie_name_english, actor, director, content, duration, 
    from_date, to_date, movie_production_company, 
    large_image, small_image, backdrop_image, rating, show_on_hero, is_hot, trailer, status
) VALUES 
(
    'Your Name - Tên Cậu Là Gì?', 
    'Your Name.', 
    'Ryunosuke Kamiki, Mone Kamishiraishi, Ryo Narita, Aoi Yuki, Nobunaga Shimazaki, Masami Nagasawa', 
    'Makoto Shinkai', 
    'Mitsuha Miyamizu là một nữ sinh sống ở vùng quê Itomori và luôn mơ ước được trải nghiệm cuộc sống sôi động tại Tokyo. Trong khi đó, Taki Tachibana là một nam sinh trung học đang sống ở thủ đô. Một ngày nọ, cả hai bất ngờ hoán đổi cơ thể với nhau mà không rõ nguyên nhân. Qua những lần đổi chỗ kỳ lạ, họ dần hiểu và đồng cảm với cuộc sống của đối phương. Khi hiện tượng này đột ngột chấm dứt, Taki quyết tâm tìm Mitsuha và khám phá sự thật phía sau mối liên kết bí ẩn, dẫn đến một câu chuyện cảm động về định mệnh, thời gian và tình yêu.', 
    106, 
    '2016-08-26', 
    '2017-02-22', 
    'CoMix Wave Films', 
    'https://image.tmdb.org/t/p/original/q719jXXEzOoYaps6babgKnONONX.jpg', 
    'https://image.tmdb.org/t/p/original/q719jXXEzOoYaps6babgKnONONX.jpg', 
    'https://wallpaperaccess.com/full/8233162.jpg', 
    8.5, true, false, 
    'https://www.youtube.com/watch?v=5SUXmUFwnuY', 
    'ENDED'
),
(
    'Thanh Gươm Diệt Quỷ: Vô Hạn Thành', 
    'Demon Slayer: Kimetsu no Yaiba - The Movie: Infinity Castle', 
    'Natsuki Hanae, Akari Kito, Yoshitsugu Matsuoka, Hiro Shimono, Takahiro Sakurai, Akira Ishida', 
    'Haruo Sotozaki', 
    'Sau sự kiện Huấn luyện Trụ Cột, thủ lĩnh loài quỷ Muzan Kibutsuji bất ngờ tấn công tổng hành dinh của Sát Quỷ Đoàn. Tanjiro Kamado cùng các Trụ Cột và những kiếm sĩ còn sống sót bị kéo vào Vô Hạn Thành - sào huyệt của Muzan. Tại đây, trận chiến cuối cùng giữa Sát Quỷ Đoàn và Thập Nhị Quỷ Nguyệt chính thức bắt đầu. Mỗi nhân vật phải đối mặt với những kẻ địch mạnh nhất, những bí mật trong quá khứ và sự hy sinh để bảo vệ nhân loại.', 
    155, 
    '2025-07-18', 
    '2026-07-31', 
    'ufotable', 
    'https://images2.thanhnien.vn/thumb_w/640/528068263637045248/2025/3/6/thanh-guom-diet-quy-17412472874981233436600.jpg', 
    'https://images2.thanhnien.vn/thumb_w/640/528068263637045248/2025/3/6/thanh-guom-diet-quy-17412472874981233436600.jpg', 
    'https://medianews.thieunien.vn/uploads/2024/11/13/1-1731467208.jpeg', 
    8.9, true, true, 
    'https://www.youtube.com/watch?v=rf0hW__Skow', 
    'NOW_SHOWING'
),
(
    'Minions & Quái Vật', 
    'Minions & Monsters', 
    'Pierre Coffin, Steve Carell', 
    'Pierre Coffin', 
    'Lấy bối cảnh Hollywood những năm 1920, nhóm Minions đặt chân đến kinh đô điện ảnh với giấc mơ trở thành những ngôi sao màn bạc. Trong quá trình quay một bộ phim quái vật, hàng loạt sự cố hài hước khiến các sinh vật đáng sợ bị giải phóng và lan khắp thế giới. Từ những diễn viên bất đắc dĩ, các Minions phải hợp sức ngăn chặn chính thảm họa do mình vô tình tạo ra.', 
    94, 
    '2026-07-01', 
    '2026-08-15', 
    'Illumination', 
    'https://dcine.vn/Areas/Admin/Content/Fileuploads/images/minionsvaquaivatFirstLook.jpg', 
    'https://dcine.vn/Areas/Admin/Content/Fileuploads/images/minionsvaquaivatFirstLook.jpg', 
    'https://bazaarvietnam.vn/wp-content/uploads/2026/02/bzvn-trailer-minions-monsters-quai-vat-202600004.jpg', 
    0.0, true, true, 
    'https://www.youtube.com/watch?v=eslhv5-ZWFY', 
    'NOW_SHOWING'
),
(
    'Bí Kíp Luyện Rồng', 
    'How to Train Your Dragon', 
    'Mason Thames, Nico Parker, Gerard Butler, Nick Frost, Julian Dennison, Gabriel Howell', 
    'Dean DeBlois', 
    'Trên đảo Berk, nơi người Viking và loài rồng đã là kẻ thù qua nhiều thế hệ, cậu thiếu niên Hiccup - con trai của tù trưởng Stoick - luôn cảm thấy mình không phù hợp với truyền thống săn rồng. Mọi chuyện thay đổi khi cậu tình cờ cứu sống và kết bạn với Toothless, một con Rồng Đêm cực kỳ hiếm. Tình bạn giữa hai loài giúp Hiccup khám phá sự thật về rồng, đồng thời thách thức những định kiến lâu đời của bộ tộc.', 
    125, 
    '2025-06-13', 
    '2025-08-31', 
    'DreamWorks Animation', 
    'https://image.tmdb.org/t/p/original/q5pXRYTycaeW6dEgsCrd4mYPmxM.jpg', 
    'https://image.tmdb.org/t/p/original/q5pXRYTycaeW6dEgsCrd4mYPmxM.jpg', 
    'https://static.wixstatic.com/media/45c4d7_b3ac4253fa4a4a0dafbb92616dc74b0d~mv2.jpg/v1/fill/w_980,h_544,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/45c4d7_b3ac4253fa4a4a0dafbb92616dc74b0d~mv2.jpg', 
    8.0, true, true, 
    'https://www.youtube.com/watch?v=22w7z_lT6YM', 
    'NOW_SHOWING'
),
(
    'Minecraft: Cuộc Phiêu Lưu Khối Vuông', 
    'A Minecraft Movie', 
    'Jason Momoa, Jack Black, Emma Myers, Danielle Brooks, Sebastian Hansen, Jennifer Coolidge', 
    'Jared Hess', 
    'Bốn người xa lạ bất ngờ bị hút vào Overworld - thế giới hình khối quen thuộc của Minecraft, nơi mọi thứ đều được tạo nên từ những khối vuông kỳ diệu. Để tìm đường trở về nhà, họ phải học cách sinh tồn, chế tạo công cụ và chiến đấu với nhiều sinh vật nguy hiểm. Trên hành trình đó, cả nhóm gặp Steve, một thợ chế tạo dày dặn kinh nghiệm, người dẫn dắt họ khám phá sức mạnh của trí tưởng tượng.', 
    101, 
    '2025-04-04', 
    '2025-06-15', 
    'Warner Bros. Pictures', 
    'https://i.ebayimg.com/images/g/wdIAAOSwcRxn7RxD/s-l1200.jpg', 
    'https://i.ebayimg.com/images/g/wdIAAOSwcRxn7RxD/s-l1200.jpg', 
    'https://image.tmdb.org/t/p/w1280/qnhe3LdMSDtHh5ZZQdafu7umF9R.jpg', 
    5.8, true, true, 
    'https://www.youtube.com/watch?v=wJO_vIDZn-I', 
    'ENDED'
),
(
    'Doraemon: Nobita Và Lâu Đài Dưới Đáy Biển', 
    'Doraemon the Movie: New Nobita and the Castle of the Undersea Devil', 
    'Wasabi Mizuta, Megumi Ohara, Yumi Kakazu, Subaru Kimura, Tomokazu Seki', 
    'Tetsuo Yajima', 
    'Trong kỳ nghỉ hè, Doraemon cùng Nobita, Shizuka, Jaian và Suneo quyết định tổ chức một chuyến cắm trại dưới đáy đại dương bằng các bảo bối thần kỳ. Tại đây, cả nhóm tình cờ gặp El - một chàng trai đến từ Liên bang Mu, nền văn minh bí ẩn dưới đáy biển. Khi Lâu Đài Quỷ dưới biển bất ngờ thức tỉnh và đe dọa hủy diệt cả thế giới, Doraemon và những người bạn phải vượt qua nhiều thử thách để bảo vệ Trái Đất.', 
    101, 
    '2026-05-22', 
    '2026-08-31', 
    'Shin-Ei Animation', 
    'https://tse1.mm.bing.net/th/id/OIP.gLWCsjqcIa8qWnEbPuc2wQHaKc?r=0&cb=thfvnextfalcon3&rs=1&pid=ImgDetMain&o=7&rm=3', 
    'https://tse1.mm.bing.net/th/id/OIP.gLWCsjqcIa8qWnEbPuc2wQHaKc?r=0&cb=thfvnextfalcon3&rs=1&pid=ImgDetMain&o=7&rm=3', 
    'https://cdn.moveek.com/storage/media/cache/large/6a1e47ce9527a919143747.png', 
    0.0, true, true, 
    'https://www.youtube.com/watch?v=kv4Kc9EGTKA', 
    'NOW_SHOWING'
),
(
    'Đứa Con Của Thời Tiết', 
    'Weathering with You', 
    'Kotaro Daigo, Nana Mori, Shun Oguri, Tsubasa Honda, Sakura Kiryu, Chieko Baisho', 
    'Makoto Shinkai', 
    'Hodaka Morishima, một nam sinh trung học, bỏ nhà đến Tokyo với hy vọng tìm được cuộc sống mới. Thành phố lúc này liên tục chìm trong những cơn mưa kéo dài bất thường. Trong lúc chật vật kiếm sống, Hodaka gặp Hina Amano - cô gái sở hữu năng lực kỳ diệu có thể làm bầu trời quang đãng chỉ bằng một lời cầu nguyện. Hai người bắt đầu sử dụng khả năng của Hina để giúp đỡ mọi người và nhanh chóng trở nên thân thiết.', 
    112, 
    '2019-07-19', 
    '2020-02-29', 
    'CoMix Wave Films', 
    'https://image.tmdb.org/t/p/original/qgrk7r1fV4IjuoeiGS5HOhXNdLJ.jpg', 
    'https://image.tmdb.org/t/p/original/qgrk7r1fV4IjuoeiGS5HOhXNdLJ.jpg', 
    'https://wallpapercave.com/wp/wp4382198.jpg', 
    8.0, true, false, 
    'https://www.youtube.com/watch?v=Q6iK6DjV_iE', 
    'ENDED'
),
(
    'Khóa Chặt Cửa Nào Suzume', 
    'Suzume', 
    'Nanoka Hara, Hokuto Matsumura, Eri Fukatsu, Shota Sometani, Sairi Ito, Kana Hanazawa, Ryunosuke Kamiki', 
    'Makoto Shinkai', 
    'Suzume Iwato, một nữ sinh 17 tuổi sống tại Kyushu, tình cờ gặp Souta - chàng trai trẻ đang đi tìm những cánh cửa kỳ lạ xuất hiện trên khắp Nhật Bản. Khi vô tình mở một cánh cửa dẫn đến thế giới bên kia, Suzume giải phóng một thế lực có thể gây ra những trận động đất thảm khốc. Cùng Souta, cô bắt đầu hành trình rong ruổi khắp đất nước để khóa những cánh cửa nguy hiểm và ngăn chặn thảm họa.', 
    122, 
    '2022-11-11', 
    '2023-06-30', 
    'CoMix Wave Films', 
    'https://image.tmdb.org/t/p/original/vIeu8WysZrTSFb2uhPViKjX9EcC.jpg', 
    'https://image.tmdb.org/t/p/original/vIeu8WysZrTSFb2uhPViKjX9EcC.jpg', 
    'https://images2.alphacoders.com/131/thumb-1920-1313180.jpeg', 
    7.9, true, false, 
    'https://www.youtube.com/watch?v=5pTcio2hTSw', 
    'ENDED'
),
(
    'Avengers: Hồi Kết', 
    'Avengers: Endgame', 
    'Robert Downey Jr., Chris Evans, Chris Hemsworth, Mark Ruffalo, Scarlett Johansson, Jeremy Renner, Josh Brolin, Paul Rudd', 
    'Anthony Russo, Joe Russo', 
    'Sau cú búng tay hủy diệt một nửa sự sống trong vũ trụ của Thanos, các thành viên Avengers còn sống phải tìm cách đảo ngược thảm kịch. Với sự trở lại của Ant-Man và ý tưởng du hành thời gian, họ thực hiện một nhiệm vụ gần như bất khả thi nhằm thu thập các Viên Đá Vô Cực từ quá khứ. Cuộc chiến cuối cùng giữa Avengers và Thanos trở thành trận chiến lớn nhất trong lịch sử Vũ trụ Điện ảnh Marvel.', 
    181, 
    '2019-04-26', 
    '2019-08-31', 
    'Marvel Studios', 
    'https://image.tmdb.org/t/p/original/or06FN3Dka5tukK1e9sl16pB3iy.jpg', 
    'https://image.tmdb.org/t/p/original/or06FN3Dka5tukK1e9sl16pB3iy.jpg', 
    'https://viniloblog.com/wp-content/uploads/2019/06/avengers-endgame-nuevas-escenas-01-1024x640.jpg', 
    8.2, true, false, 
    'https://www.youtube.com/watch?v=TcMBFSGVi1c', 
    'ENDED'
),
(
    'Doctor Strange Trong Đa Vũ Trụ Hỗn Loạn', 
    'Doctor Strange in the Multiverse of Madness', 
    'Benedict Cumberbatch, Elizabeth Olsen, Xochitl Gomez, Benedict Wong, Chiwetel Ejiofor, Rachel McAdams', 
    'Sam Raimi', 
    'Sau các sự kiện của Spider-Man: No Way Home, Doctor Stephen Strange tiếp tục nghiên cứu sức mạnh của đa vũ trụ thì gặp America Chavez, cô gái trẻ có khả năng mở cánh cổng giữa các vũ trụ. Khi Wanda Maximoff bị sức mạnh của Darkhold tha hóa và truy đuổi America để cướp lấy năng lực này, Strange buộc phải bước vào hành trình xuyên qua vô số vũ trụ song song.', 
    126, 
    '2022-05-06', 
    '2022-08-15', 
    'Marvel Studios', 
    'https://image.tmdb.org/t/p/original/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg', 
    'https://image.tmdb.org/t/p/original/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg', 
    'https://images7.alphacoders.com/123/thumb-1920-1230694.jpg', 
    7.3, true, false, 
    'https://www.youtube.com/watch?v=aWzlQ2N6qqg', 
    'ENDED'
) ON CONFLICT DO NOTHING;
