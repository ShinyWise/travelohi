TRUNCATE TABLE hotel_rooms, hotels, hotel_reviews, flights, flight_seats, account_models, auths, airlines, cart_items, support_conversations, support_messages, search_histories, global_search_metrics, booking_models, promos CASCADE;

-- seed test user for checkout testing
INSERT INTO account_models (id, email, first_name, last_name, is_active, hi_wallet_balance) VALUES
('test_user_id', 'tester@travelohi.com', 'Test', 'User', true, 50000000);

-- seed admin
INSERT INTO auths (id, email, password_hash, is_banned) 
VALUES ('admin-001', 'master@travelohi.com', '$2a$10$5rl1PMcFV7wiEhST1nmyuuDhar4.XGis2Ksmx4zdKuqgR/8QpdRM2', FALSE); -- password: admin123

INSERT INTO account_models (id, email, first_name, last_name, is_admin, is_banned, newsletter_subscribed) 
VALUES ('admin-001', 'master@travelohi.com', 'Master', 'Control', TRUE, FALSE, FALSE);

-- seed user
INSERT INTO auths (id, email, password_hash, is_banned) 
VALUES ('user-002', 'testuser@example.com', '$2a$10$KYWpmQ8yzsDtyO076z4zHO54iqwu/s2yWITfOS6X9K0SFrVfcBLsK', FALSE); -- password: user123

INSERT INTO account_models (id, email, first_name, last_name, is_admin, is_banned, newsletter_subscribed, is_active, hi_wallet_balance) 
VALUES ('user-002', 'testuser@example.com', 'John', 'Doe', FALSE, FALSE, TRUE, TRUE, 10000000);


-- seed airlines & flights
INSERT INTO airlines (id, name, logo_url) VALUES 
('air-ga', 'Garuda Indonesia', 'https://travelohi.com/logos/ga.png'),
('air-sq', 'Singapore Airlines', 'https://travelohi.com/logos/sq.png');

INSERT INTO flights (id, airline_id, flight_code, origin_airport, destination_airport, departure_time, arrival_time, duration_minutes, starting_price) VALUES
('fl-001', 'air-ga', 'GA-123', 'Jakarta (CGK)', 'Bali (DPS)', '2026-06-01 08:00:00', '2026-06-01 11:00:00', 180, 1200000),
('fl-002', 'air-sq', 'SQ-456', 'Jakarta (CGK)', 'Singapore (SIN)', '2026-06-01 13:00:00', '2026-06-01 14:50:00', 110, 2500000),
('fl-003', 'air-ga', 'GA-789', 'Jakarta (CGK)', 'Tokyo (HND)', '2026-06-02 23:00:00', '2026-06-03 08:30:00', 570, 8000000);

-- seed flight seats
INSERT INTO flight_seats (id, flight_id, seat_number, seat_class, is_booked, price) VALUES
('seat-dps-12a', 'fl-001', '12A', 'Economy', TRUE, 1200000),
('seat-dps-12b', 'fl-001', '12B', 'Economy', TRUE, 1200000),
('seat-dps-12c', 'fl-001', '12C', 'Economy', FALSE, 1200000),
('seat-dps-12d', 'fl-001', '12D', 'Economy', FALSE, 1200000),
('seat-dps-01a', 'fl-001', '01A', 'Business', FALSE, 3000000),
('seat-dps-01b', 'fl-001', '01B', 'Business', FALSE, 3000000),
('seat-sin-05a', 'fl-002', '05A', 'Business', TRUE, 2500000),
('seat-sin-05b', 'fl-002', '05B', 'Business', FALSE, 2500000),
('seat-sin-10a', 'fl-002', '10A', 'Economy', FALSE, 1500000),
('seat-hnd-20f', 'fl-003', '20F', 'Economy', TRUE, 8000000),
('seat-hnd-20a', 'fl-003', '20A', 'Economy', FALSE, 8000000),
('seat-hnd-02a', 'fl-003', '02A', 'Business', FALSE, 15000000);


-- seed hotels & rooms
INSERT INTO hotels (id, name, description, address, picture_urls, facilities, starting_price) VALUES
('htl-asrilia', 'Grand Asrilia Hotel', 'Luxury Stay', 'Bandung', '["https://travelohi.com/asrilia.jpg"]', '["WiFi", "Pool"]', 750000),
('htl-hilton', 'Hilton Bandung', 'Premium Business Hotel', 'Bandung', '["https://travelohi.com/hilton.jpg"]', '["Gym", "Pool"]', 1500000);

INSERT INTO hotel_rooms (id, hotel_id, name, price_per_night, capacity, facilities, total_inventory) VALUES
('rm-asrilia-deluxe', 'htl-asrilia', 'Deluxe King', 750000, 2, '["Bathtub"]', 1),
('rm-hilton-suite', 'htl-hilton', 'Executive Suite', 1500000, 2, '["Mini-bar"]', 5);

-- seed hotel reviews
INSERT INTO hotel_reviews (id, hotel_id, user_id, user_name, rating_cleanliness, rating_comfort, rating_location, rating_service, rating_average, comment, created_at) VALUES
('rev-1', 'htl-asrilia', 'user-002', 'Budi Santoso', 9.0, 8.5, 9.0, 8.5, 8.75, 'Kamarnya bersih sekali dan lokasinya strategis di Bandung.', NOW()),
('rev-2', 'htl-asrilia', 'user-002', 'Siti Rahma', 8.0, 8.0, 8.0, 9.0, 8.25, 'Pelayanannya sangat ramah dan kolam renangnya bersih.', NOW()),
('rev-3', 'htl-hilton', 'user-002', 'Andi Wijaya', 9.5, 9.5, 9.0, 9.5, 9.38, 'Hotel premium yang sangat cocok untuk perjalanan bisnis.', NOW());


-- seed transaction buat cart
INSERT INTO cart_items (id, user_id, item_type, reference_id, price, status) VALUES
('tx-001', 'user-002', 'flight_seat', 'seat-dps-12a', 1200000, 'paid'), 
('tx-002', 'user-002', 'flight_seat', 'seat-dps-12b', 1200000, 'paid'), 
('tx-003', 'user-002', 'flight_seat', 'seat-sin-05a', 2500000, 'paid'),

('tx-004', 'user-002', 'hotel_room', 'rm-asrilia-deluxe', 750000, 'paid'),
('tx-005', 'user-002', 'hotel_room', 'rm-hilton-suite', 1500000, 'paid');




-- seed communication engine
INSERT INTO support_conversations (id, user_id, status, created_at, updated_at) 
VALUES ('conv-test-001', 'user-002', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- seed search histories for user-002
INSERT INTO search_histories (id, user_id, search_query, created_at) VALUES
('sh-1', 'user-002', 'Bandung', NOW() - INTERVAL '1 minute'),
('sh-2', 'user-002', 'Jakarta', NOW() - INTERVAL '2 minutes'),
('sh-3', 'user-002', 'Bali (DPS)', NOW() - INTERVAL '3 minutes');

-- seed global search metrics
INSERT INTO global_search_metrics (search_query, search_count, last_searched_at) VALUES
('Bandung', 100, NOW()),
('Jakarta', 80, NOW()),
('Bali (DPS)', 70, NOW()),
('Tokyo (HND)', 50, NOW()),
('Singapore (SIN)', 30, NOW());

-- seed promos
INSERT INTO promos (id, promo_code, discount_amount, is_active) VALUES
('p_travel100', 'TRAVEL100', 100000, true),
('p_travel50', 'TRAVEL50', 50000, true);