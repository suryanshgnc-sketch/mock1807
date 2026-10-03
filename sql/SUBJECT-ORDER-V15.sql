-- V15: per-test subject order (admin chooses while creating/editing a test)
-- Run once in the Supabase SQL Editor.
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS subject_order text NOT NULL DEFAULT 'PCM';
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_subject_order_check;
ALTER TABLE public.tests ADD CONSTRAINT tests_subject_order_check
  CHECK (subject_order IN ('PCM','PMC','CPM','CMP','MPC','MCP'));
