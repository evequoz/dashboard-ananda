-- =============================================================================
-- Audit : utilisateurs du dashboard — doivent exister dans auth.users
-- =============================================================================
-- Exécuter dans le SQL Editor Supabase (le schéma auth.* est accessible).
-- Un compte uniquement dans public.profiles (Kriya Parampara, etc.) ne peut PAS
-- se connecter au dashboard : il faut Invitation / création dans Authentication.
--
-- 1) Liste des comptes auth (aperçu)
-- =============================================================================

select
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
from auth.users
order by created_at desc;

-- =============================================================================
-- 2) Vérifier des emails précis (remplacer par les adresses réelles)
-- =============================================================================

-- select id, email, last_sign_in_at
-- from auth.users
-- where lower(email) in (
--   'marine@example.com',
--   'sophie@example.com',
--   'fanny@example.com',
--   'elo@example.com'
-- );

-- =============================================================================
-- 3) Comptes sans jamais s’être connectés (invitation non utilisée, etc.)
-- =============================================================================

-- select id, email, created_at
-- from auth.users
-- where last_sign_in_at is null
-- order by created_at desc;
