create table users (
    id serial primary key,
    google_id text not null,
    email varchar not null,
    name text not null,
    picture text not null,
    constraint users_google_id_unique unique (google_id),
    constraint users_email_unique unique (email)
);

create index google_id_idx on users (google_id);
create index email_idx on users (email);

create table sessions (
    id text primary key not null,
    user_id integer not null,
    expires_at timestamptz not null,
    constraint sessions_user_id_users_id_fk
        foreign key (user_id) references users(id)
        on delete no action on update no action
);

create index session_user_id_idx on sessions (user_id);

create table conversations (
    id serial primary key,
    user_id integer not null references users(id) on delete cascade,
    input_text text not null,
    background_context text not null,
    created_at timestamptz not null default now()
);

create index conversation_user_id_idx on conversations (user_id);

create table lessons (
    id serial primary key,
    conversation_id integer not null references conversations(id) on delete cascade,
    title text not null,
    summary text not null,
    created_at timestamptz not null default now()
);

create index lesson_conversation_id_idx on lessons (conversation_id);

create table messages (
    id serial primary key,
    lesson_id integer not null references lessons(id) on delete cascade,
    sender text not null check (sender in ('user', 'ai')),
    content text not null,
    created_at timestamptz not null default now()
);

create index message_lesson_id_idx on messages (lesson_id);
create index message_sender_idx on messages (sender);
