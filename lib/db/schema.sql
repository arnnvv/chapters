CREATE TABLE "sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "google_id" text NOT NULL,
    "email" varchar NOT NULL,
    "name" text NOT NULL,
    "picture" text NOT NULL,
    CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
    CONSTRAINT "users_email_unique" UNIQUE("email")
);

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
    ON DELETE no action ON UPDATE no action;

CREATE INDEX "session_user_id_idx" ON "sessions" USING btree ("user_id");
CREATE INDEX "google_id_idx" ON "users" USING btree ("google_id");
CREATE INDEX "email_idx" ON "users" USING btree ("email");
