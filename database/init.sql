-- Auth Service Table
CREATE TABLE IF NOT EXISTS auths (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    security_question_id INT,
    security_answer_hash VARCHAR(255),
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account Service Table
CREATE TABLE IF NOT EXISTS account_models (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    dob VARCHAR(50),
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    hi_wallet_balance BIGINT DEFAULT 0,
    phone_number VARCHAR(50),
    address TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    picture_urls JSONB, 
    facilities JSONB,
    rating_cleanliness NUMERIC(3,2) DEFAULT 0,
    rating_comfort NUMERIC(3,2) DEFAULT 0,
    rating_location NUMERIC(3,2) DEFAULT 0,
    rating_service NUMERIC(3,2) DEFAULT 0,
    rating_average NUMERIC(3,2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    starting_price BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS hotel_rooms (
    id VARCHAR(255) PRIMARY KEY,
    hotel_id VARCHAR(255) REFERENCES hotels(id),
    name VARCHAR(100) NOT NULL,
    price_per_night BIGINT NOT NULL,
    capacity INT NOT NULL,
    facilities JSONB
);

CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(255) PRIMARY KEY,
    room_id VARCHAR(255) REFERENCES hotel_rooms(id),
    user_id VARCHAR(255) NOT NULL, 
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ongoing'
);

-- cart table
DROP TABLE IF EXISTS cart_items;
CREATE TABLE cart_items (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL, -- ADDED THIS
    status VARCHAR(50) DEFAULT 'in_cart',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- flight engine table
CREATE TABLE IF NOT EXISTS flights (
    id VARCHAR(255) PRIMARY KEY,
    airline_id VARCHAR(255),
    flight_code VARCHAR(50) NOT NULL,
    origin_airport VARCHAR(100) NOT NULL,
    destination_airport VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    duration_minutes INT,
    is_transit BOOLEAN DEFAULT FALSE,
    starting_price BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS flight_seats (
    id VARCHAR(255) PRIMARY KEY,
    flight_id VARCHAR(255) REFERENCES flights(id),
    seat_number VARCHAR(10) NOT NULL,
    seat_class VARCHAR(50) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    price BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS airlines (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT
);

-- admin table
ALTER TABLE account_models ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE account_models ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Promos table buat checkout/marketing
CREATE TABLE IF NOT EXISTS promos (
    id VARCHAR(255) PRIMARY KEY,
    promo_code VARCHAR(50) UNIQUE NOT NULL,
    discount_amount BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);




-- track user search query
CREATE TABLE IF NOT EXISTS search_histories (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    search_query VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- index buat optimasi fetch user search history
CREATE INDEX idx_search_history_user ON search_histories(user_id, created_at DESC);

-- aggregate global search metrics buat rekomendasi
CREATE TABLE IF NOT EXISTS global_search_metrics (
    search_query VARCHAR(255) PRIMARY KEY,
    search_count BIGINT DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index buat sorting top 5 global recommendations
CREATE INDEX idx_global_search_count ON global_search_metrics(search_count DESC);



-- chat/conversation
-- buat ngurus support
CREATE TABLE IF NOT EXISTS support_conversations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user ON support_conversations(user_id);

CREATE TABLE IF NOT EXISTS support_messages (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL REFERENCES support_conversations(id),
    sender_id VARCHAR(255) NOT NULL, -- user id or admin
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'sent', -- sent, seen
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_time ON support_messages(conversation_id, created_at DESC);

-- game server 
-- record completed matches
CREATE TABLE IF NOT EXISTS game_matches (
    id VARCHAR(255) PRIMARY KEY,
    player_one_id VARCHAR(255) NOT NULL,
    player_two_id VARCHAR(255) NOT NULL,
    winner_id VARCHAR(255),
    duration_seconds INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_matches_players ON game_matches(player_one_id, player_two_id);