TRUNCATE TABLE hotel_rooms, hotels CASCADE;

-- seed hotel
INSERT INTO hotels (id, name, address, starting_price) VALUES
('h_1', 'Grand Asrilia Hotel', 'Bandung', 500000),
('h_2', 'The Ritz-Carlton', 'Jakarta', 2500000);

-- seed rooms
INSERT INTO hotel_rooms (id, hotel_id, name, price_per_night, capacity) VALUES
('r_1', 'h_1', 'Deluxe King', 500000, 5),
('r_2', 'h_1', 'Superior Twin', 450000, 10),
('r_3', 'h_2', 'Presidential Suite', 2500000, 2);