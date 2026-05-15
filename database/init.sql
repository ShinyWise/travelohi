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