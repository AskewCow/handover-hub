-- Migration 004: onboarding steps can link to a page in the app (e.g. "#/buddy") or an external URL.
-- Safe to re-run; keeps existing data.
alter table public.onboarding_steps add column if not exists link text;
