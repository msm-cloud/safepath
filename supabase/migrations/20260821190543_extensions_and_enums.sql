-- Extensions and enum types shared across the SafePath schema.
-- Schema-only migration: no application code reads/writes these tables yet.

-- gen_random_uuid() for primary key defaults.
create extension if not exists pgcrypto with schema extensions;

-- profiles.role — who this profile belongs to.
create type public.profile_role as enum ('user', 'guardian');

-- profiles.preferred_language — UI language, Bangla first since SafePath
-- primarily targets Bangladeshi students/commuters.
create type public.preferred_language as enum ('bn', 'en');

-- guardian_links.status — lifecycle of a guardian invite.
create type public.guardian_link_status as enum ('pending', 'accepted', 'revoked');

-- alerts.status — lifecycle of an SOS alert.
create type public.alert_status as enum ('active', 'resolved', 'false_alarm');

-- alerts.trigger_type — what triggered the alert. Only 'manual' exists today;
-- this enum leaves room to add e.g. 'fall_detected' or 'route_deviation' later
-- via `alter type ... add value` without a column type change.
create type public.alert_trigger_type as enum ('manual');
