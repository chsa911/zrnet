BEGIN;

-- Guest comments for public book pages.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.book_comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id     uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  parent_id   uuid NULL REFERENCES public.book_comments(id) ON DELETE CASCADE,

  author_name text,
  body        text NOT NULL,

  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','spam')),

  created_at  timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,

  ip_hash     text,
  user_agent  text
);

CREATE INDEX IF NOT EXISTS book_comments_book_created_idx
  ON public.book_comments (book_id, created_at);

CREATE INDEX IF NOT EXISTS book_comments_status_created_idx
  ON public.book_comments (status, created_at);

CREATE INDEX IF NOT EXISTS book_comments_parent_idx
  ON public.book_comments (parent_id);

COMMIT;
