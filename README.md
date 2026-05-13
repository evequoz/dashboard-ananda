# dashboard-ananda

## Synchronisation e-mail (cron VPS)

Le dépôt est en `"type": "module"` pour Vite. Le cron Node utilise **`scripts/email-sync-cron.js`** (lanceur ESM) qui exécute **`scripts/email-sync-cron.cjs`** (CommonJS, logique alignée sur l’Edge Function).

### Variables `.env` (racine du projet)

Ne pas committer le fichier `.env`. Exemple :

```env
SUPABASE_URL=https://heuyorrfwofteprzbxos.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<clé service_role depuis le dashboard Supabase>
EMAIL_SERGE_EHME_PASSWORD=<mot de passe IMAP/SMTP Infomaniak>
EMAIL_ADMIN_EHME_PASSWORD=<…>
EMAIL_SERGE_SEME_PASSWORD=<…>
GEMINI_API_KEY=<clé Google AI Studio>
```

Les mots de passe et la clé Gemini ne sont pas dans le dépôt : à renseigner **manuellement** sur le VPS (ou en CI secrets).

### Installation des dépendances cron

À la racine du clone :

```bash
npm install
```

### Lancement manuel

```bash
npm run email-sync
```

### Cron (toutes les 5 minutes)

Créer le dossier de logs si besoin : `mkdir -p /root/logs`

```cron
*/5 * * * * cd /root/dashboard-ananda && node scripts/email-sync-cron.js >> /root/logs/email-sync.log 2>&1
```

La logique métier est dans `scripts/email-sync-cron.cjs` (CommonJS) ; `email-sync-cron.js` ne fait que lancer ce fichier. Comportement aligné sur `supabase/functions/email-sync/index.ts` : comptes `email_accounts`, IMAP Infomaniak, fenêtre UID 500, bootstrap 20 messages si `last_uid_seen = 0`, scoring Gemini `gemini-2.5-flash-lite`, insert `inbox_emails`, challenge SMTP optionnel, budgets 20 s / compte et 25 s global.
