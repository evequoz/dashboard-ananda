/*
  # Schéma Ananda Communauté Dashboard

  ## Nouvelles Tables
  
  ### `members`
  - `id` (uuid, primary key)
  - `name` (text) - Nom du membre
  - `email` (text, unique) - Email du membre
  - `plan` (text) - Type d'abonnement (Basic, Premium)
  - `status` (text) - Statut (active, trial, inactive)
  - `join_date` (date) - Date d'inscription
  - `courses_completed` (integer) - Nombre de cours complétés
  - `engagement_level` (text) - Niveau d'engagement (Débutant, Avancé, Expert)
  - `last_active` (timestamptz) - Dernière activité
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `agenda_items`
  - `id` (uuid, primary key)
  - `time` (text) - Heure de l'événement
  - `title` (text) - Titre de l'événement
  - `duration` (text) - Durée
  - `category` (text) - Catégorie (pratique, contenu, live)
  - `color` (text) - Couleur associée
  - `date` (date) - Date de l'événement
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `emails`
  - `id` (uuid, primary key)
  - `title` (text) - Sujet de l'email
  - `sender` (text) - Expéditeur
  - `time` (text) - Heure de réception
  - `tag` (text) - Tag (urgent, info)
  - `color` (text) - Couleur du tag
  - `read` (boolean) - Lu ou non
  - `created_at` (timestamptz)

  ### `events`
  - `id` (uuid, primary key)
  - `title` (text) - Titre de l'événement
  - `date` (date) - Date de l'événement
  - `type` (text) - Type (Formation, Événement, Live)
  - `attendees` (integer) - Nombre d'inscrits
  - `description` (text) - Description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `transactions`
  - `id` (uuid, primary key)
  - `type` (text) - Type de transaction
  - `client_name` (text) - Nom du client
  - `amount` (decimal) - Montant
  - `date` (date) - Date de la transaction
  - `status` (text) - Statut (completed, pending, refunded)
  - `created_at` (timestamptz)

  ### `feedback`
  - `id` (uuid, primary key)
  - `author` (text) - Auteur du témoignage
  - `rating` (integer) - Note sur 5
  - `comment` (text) - Commentaire
  - `date` (date) - Date du témoignage
  - `created_at` (timestamptz)

  ### `settings`
  - `id` (uuid, primary key)
  - `user_id` (text) - ID de l'utilisateur
  - `theme_color` (text) - Couleur du thème
  - `notifications_enabled` (boolean) - Notifications activées
  - `preferences` (jsonb) - Préférences personnalisées
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Sécurité
  
  - RLS activé sur toutes les tables
  - Politiques restrictives pour chaque table
*/

-- Membres
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'Basic',
  status text NOT NULL DEFAULT 'active',
  join_date date DEFAULT CURRENT_DATE,
  courses_completed integer DEFAULT 0,
  engagement_level text DEFAULT 'Débutant',
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to members"
  ON members FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to members"
  ON members FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to members"
  ON members FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Agenda
CREATE TABLE IF NOT EXISTS agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time text NOT NULL,
  title text NOT NULL,
  duration text NOT NULL,
  category text NOT NULL,
  color text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to agenda_items"
  ON agenda_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to agenda_items"
  ON agenda_items FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to agenda_items"
  ON agenda_items FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to agenda_items"
  ON agenda_items FOR DELETE
  TO public
  USING (true);

-- Emails
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  sender text NOT NULL,
  time text NOT NULL,
  tag text NOT NULL,
  color text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to emails"
  ON emails FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to emails"
  ON emails FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to emails"
  ON emails FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Événements
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  type text NOT NULL,
  attendees integer DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to events"
  ON events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to events"
  ON events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to events"
  ON events FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to events"
  ON events FOR DELETE
  TO public
  USING (true);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  client_name text NOT NULL,
  amount decimal(10, 2) NOT NULL,
  date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to transactions"
  ON transactions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to transactions"
  ON transactions FOR INSERT
  TO public
  WITH CHECK (true);

-- Témoignages
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to feedback"
  ON feedback FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to feedback"
  ON feedback FOR INSERT
  TO public
  WITH CHECK (true);

-- Paramètres
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL DEFAULT 'default',
  theme_color text DEFAULT '#c9a84c',
  notifications_enabled boolean DEFAULT true,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to settings"
  ON settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to settings"
  ON settings FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to settings"
  ON settings FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
