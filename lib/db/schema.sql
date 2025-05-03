CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    google_id TEXT NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    name TEXT NOT NULL,
    picture TEXT NOT NULL
);
CREATE INDEX idx_users_google_id ON users (google_id);
CREATE INDEX idx_users_email ON users (email);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Good
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Good
    original_content TEXT NOT NULL,
    user_background TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conversations_user_id ON conversations (user_id);

CREATE TABLE chapter_index_items (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, -- Good
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    generated_content TEXT NULL,
    CONSTRAINT uq_chapter_index_items_conversation_chapter UNIQUE (conversation_id, chapter_number)
);
CREATE INDEX idx_chapter_index_items_conversation_id ON chapter_index_items (conversation_id);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, -- Good
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX idx_messages_sender ON messages (sender);
