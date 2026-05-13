-- Exemple pg_cron : activer les extensions pg_cron + pg_net dans le dashboard Supabase,
-- puis remplacer YOUR_SERVICE_ROLE_JWT par la clé « service_role » (Settings → API).
-- Ne commitez jamais la vraie clé dans le dépôt.

-- select cron.unschedule('email-sync-cron') where exists (select 1 from cron.job where jobname = 'email-sync-cron');

/*
select cron.schedule(
  'email-sync-cron',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://heuyorrfwofteprzbxos.supabase.co/functions/v1/email-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_JWT'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/
