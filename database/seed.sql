TRUNCATE TABLE hotel_rooms, hotels, flights, flight_seats, account_models CASCADE;

-- seed test user for checkout testing
INSERT INTO account_models (id, email, first_name, last_name, is_active, hi_wallet_balance) VALUES
('test_user_id', 'tester@travelohi.com', 'Test', 'User', true, 50000000);

-- seed hotel
INSERT INTO hotels (id, name, address, starting_price) VALUES
('h_1', 'Grand Asrilia Hotel', 'Bandung', 500000),
('h_2', 'The Ritz-Carlton', 'Jakarta', 2500000);

-- seed rooms
INSERT INTO hotel_rooms (id, hotel_id, name, price_per_night, capacity) VALUES
('r_1', 'h_1', 'Deluxe King', 500000, 5),
('r_2', 'h_1', 'Superior Twin', 450000, 10),
('r_3', 'h_2', 'Presidential Suite', 2500000, 2);

-- seed flight
INSERT INTO flights (id, airline_id, flight_code, origin_airport, destination_airport, starting_price)
VALUES ('flight_jkt_bali', 'airline_garuda', 'GA-123', 'CGK', 'DPS', 1000000);

-- seed seat
INSERT INTO flight_seats (id, flight_id, seat_number, seat_class, price, is_booked)
VALUES ('seat_12A', 'flight_jkt_bali', '12A', 'Economy', 1500000, false);


-- seed admin
INSERT INTO auths (id, email, password_hash, is_banned) 
VALUES ('admin-001', 'master@travelohi.com', '$2a$10$eRPFY0cTxfMvdxOId3M95OVHJ2Z54ZKlo0zVbIHfyFfX6EtagJf4u', FALSE);

INSERT INTO account_models (id, email, first_name, last_name, is_admin, is_banned, newsletter_subscribed) 
VALUES ('admin-001', 'master@travelohi.com', 'Master', 'Control', TRUE, FALSE, FALSE);

-- seed user
INSERT INTO auths (id, email, password_hash, is_banned) 
VALUES ('user-002', 'testuser@example.com', '$2a$10$eRPFY0cTxfMvdxOId3M95OVHJ2Z54ZKlo0zVbIHfyFfX6EtagJf4u', FALSE);

INSERT INTO account_models (id, email, first_name, last_name, is_admin, is_banned, newsletter_subscribed) 
VALUES ('user-002', 'testuser@example.com', 'John', 'Doe', FALSE, FALSE, TRUE);


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
('seat-sin-05a', 'fl-002', '05A', 'Business', TRUE, 2500000),
('seat-hnd-20f', 'fl-003', '20F', 'Economy', TRUE, 8000000);


-- seed hotels & rooms
INSERT INTO hotels (id, name, description, address, picture_urls, facilities, starting_price) VALUES
('htl-asrilia', 'Grand Asrilia Hotel', 'Luxury Stay', 'Bandung', '["https://travelohi.com/asrilia.jpg"]', '["WiFi", "Pool"]', 750000),
('htl-hilton', 'Hilton Bandung', 'Premium Business Hotel', 'Bandung', '["https://travelohi.com/hilton.jpg"]', '["Gym", "Pool"]', 1500000);

INSERT INTO hotel_rooms (id, hotel_id, name, price_per_night, capacity, facilities) VALUES
('rm-asrilia-deluxe', 'htl-asrilia', 'Deluxe King', 750000, 2, '["Bathtub"]'),
('rm-hilton-suite', 'htl-hilton', 'Executive Suite', 1500000, 2, '["Mini-bar"]');

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

-- seed support messages
INSERT INTO support_messages (id, conversation_id, sender_id, content, status, created_at) 
VALUES 
('msg-hist-1', 'conv-test-001', 'user-002', 'Hi, I need help with my hotel booking.', 'seen', NOW() - INTERVAL '10 minutes'),
('msg-hist-2', 'conv-test-001', 'admin-001', 'Hello! I am here to help. What seems to be the problem?', 'seen', NOW() - INTERVAL '9 minutes'),
('msg-hist-3', 'conv-test-001', 'user-002', 'The address on the e-ticket looks wrong.', 'sent', NOW() - INTERVAL '2 minutes')
ON CONFLICT (id) DO NOTHING;