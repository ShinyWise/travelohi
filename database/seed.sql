-- Seed promo codes for checkout and discounts
INSERT INTO promos (id, promo_code, discount_amount, is_active) VALUES
('p_travel100', 'TRAVEL100', 100000, true),
('p_travel50', 'TRAVEL50', 50000, true)
ON CONFLICT (id) DO NOTHING;