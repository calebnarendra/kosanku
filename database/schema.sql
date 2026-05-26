CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'provider')),
    phone VARCHAR(30),
    age INTEGER,
    gender VARCHAR(20),
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    campus_name VARCHAR(200),
    price_per_month NUMERIC(12,2) NOT NULL CHECK (price_per_month >= 0),
    room_size VARCHAR(50),
    available_from DATE,
    allowed_gender VARCHAR(20) NOT NULL DEFAULT 'any' CHECK (allowed_gender IN ('male', 'female', 'any')),
    room_count INTEGER NOT NULL DEFAULT 1 CHECK (room_count >= 1),
    is_available BOOLEAN NOT NULL DEFAULT true,
    listing_status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (listing_status IN ('published', 'draft')),
    amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    documentation_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    map_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS address TEXT;
UPDATE rooms SET address = COALESCE(address, location, '') WHERE address IS NULL;
ALTER TABLE rooms ALTER COLUMN address SET DEFAULT '';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS campus_name VARCHAR(200);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS price_per_month NUMERIC(12,2);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rooms'
          AND column_name = 'price_per_year'
    ) THEN
        EXECUTE 'UPDATE rooms SET price_per_month = COALESCE(price_per_month, price_per_year) WHERE price_per_month IS NULL';
    END IF;
END $$;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_size VARCHAR(50);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS allowed_gender VARCHAR(20) DEFAULT 'any';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS listing_status VARCHAR(20) NOT NULL DEFAULT 'published';
UPDATE rooms SET listing_status = 'published' WHERE listing_status IS NULL OR listing_status NOT IN ('published', 'draft');
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS documentation_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS map_link TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
UPDATE rooms SET description = COALESCE(description, '') WHERE description IS NULL;
UPDATE rooms SET address = COALESCE(address, '') WHERE address IS NULL;
UPDATE rooms SET price_per_month = 0 WHERE price_per_month IS NULL;
UPDATE rooms SET room_count = 1 WHERE room_count IS NULL OR room_count < 1;
ALTER TABLE rooms ALTER COLUMN address SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN price_per_month SET NOT NULL;
UPDATE rooms SET allowed_gender = 'any' WHERE allowed_gender IS NULL OR allowed_gender NOT IN ('male', 'female', 'any');

CREATE INDEX IF NOT EXISTS idx_rooms_provider_id ON rooms(provider_id);
CREATE INDEX IF NOT EXISTS idx_rooms_price_per_month ON rooms(price_per_month);
CREATE INDEX IF NOT EXISTS idx_rooms_listing_status ON rooms(listing_status);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    message TEXT,
    contact_phone VARCHAR(30),
    preferred_move_in_date DATE,
    move_in_date DATE,
    move_out_date DATE,
    provider_response_note TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
UPDATE bookings SET status = 'pending' WHERE status IS NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS preferred_move_in_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS move_in_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS move_out_date DATE;
UPDATE bookings SET move_in_date = COALESCE(move_in_date, preferred_move_in_date) WHERE move_in_date IS NULL;
UPDATE bookings SET move_out_date = COALESCE(move_out_date, (move_in_date + INTERVAL '1 year')::DATE) WHERE move_out_date IS NULL AND move_in_date IS NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_response_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
          AND column_name = 'booking_date'
    ) THEN
        EXECUTE 'UPDATE bookings SET requested_at = COALESCE(requested_at, booking_date, CURRENT_TIMESTAMP)';
    ELSE
        EXECUTE 'UPDATE bookings SET requested_at = COALESCE(requested_at, CURRENT_TIMESTAMP)';
    END IF;
END $$;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uniq_active_booking_per_student_room'
    ) THEN
        CREATE UNIQUE INDEX uniq_active_booking_per_student_room
            ON bookings(room_id, student_id)
            WHERE status IN ('pending', 'accepted');
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_student_id ON favorites(student_id);
CREATE INDEX IF NOT EXISTS idx_favorites_room_id ON favorites(room_id);


CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, student_id, provider_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(60) NOT NULL DEFAULT 'general',
    related_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    related_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    related_conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_room_id ON conversations(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_rooms_updated_at ON rooms;
CREATE TRIGGER set_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_bookings_updated_at ON bookings;
CREATE TRIGGER set_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;
CREATE TRIGGER set_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- Added feature support: email verification, room rules, room ratings, and room problem requests
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_requested_at TIMESTAMP;

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS room_ratings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_room_ratings_room_id ON room_ratings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_ratings_student_id ON room_ratings(student_id);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'acknowledged')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_booking_id ON maintenance_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_provider_id ON maintenance_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_student_id ON maintenance_requests(student_id);

DROP TRIGGER IF EXISTS set_room_ratings_updated_at ON room_ratings;
CREATE TRIGGER set_room_ratings_updated_at
BEFORE UPDATE ON room_ratings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_maintenance_requests_updated_at ON maintenance_requests;
CREATE TRIGGER set_maintenance_requests_updated_at
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
