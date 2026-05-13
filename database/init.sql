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
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    dob VARCHAR(50),
    profile_picture_url TEXT,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    hi_wallet_balance BIGINT DEFAULT 0,
    phone_number VARCHAR(50),
    address TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);