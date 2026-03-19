// ============================================================
// BASEROW API — Connexion au cerveau admin
// ============================================================

const BASEROW_URL = 'https://baserow.ananda-communaute.cloud/api';
const API_TOKEN = 'GBLdzaCZvQUVXkCqSls3WX3dT3uVg0H8';

const TABLES = {
  finances: 348,
  formations: 533,
  emails: 534,
  posts: 535,
  taches: 536, // à vérifier si vous avez créé la table Tâches
};

const headers = {
  Authorization: `Token ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

// ============================================================
// FINANCES
// ============================================================
export const getFinances = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.finances}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Finances:', e);
    return [];
  }
};

export const getRevenuesDuMois = async () => {
  try {
    const rows = await getFinances();
    const now = new Date();
    const moisActuel = now.getMonth();
    const anneeActuelle = now.getFullYear();

    const total = rows
      .filter((row: any) => {
        if (!row.Date) return false;
        const date = new Date(row.Date);
        return (
          date.getMonth() === moisActuel &&
          date.getFullYear() === anneeActuelle &&
          row.Type === 'Recette'
        );
      })
      .reduce((sum: number, row: any) => sum + (parseFloat(row.Montant) || 0), 0);

    return Math.round(total);
  } catch (e) {
    console.error('Erreur revenus du mois:', e);
    return 0;
  }
};

export const getDepensesDuMois = async () => {
  try {
    const rows = await getFinances();
    const now = new Date();
    const moisActuel = now.getMonth();
    const anneeActuelle = now.getFullYear();

    const total = rows
      .filter((row: any) => {
        if (!row.Date) return false;
        const date = new Date(row.Date);
        return (
          date.getMonth() === moisActuel &&
          date.getFullYear() === anneeActuelle &&
          row.Type === 'Dépense'
        );
      })
      .reduce((sum: number, row: any) => sum + (parseFloat(row.Montant) || 0), 0);

    return Math.round(total);
  } catch (e) {
    console.error('Erreur dépenses du mois:', e);
    return 0;
  }
};

// ============================================================
// EMAILS
// ============================================================
export const getEmails = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.emails}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Emails:', e);
    return [];
  }
};

export const getEmailsNonTraites = async () => {
  try {
    const rows = await getEmails();
    return rows.filter((row: any) => !row.Traité).length;
  } catch (e) {
    return 0;
  }
};

// ============================================================
// TÂCHES
// ============================================================
export const getTaches = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.taches}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Tâches:', e);
    return [];
  }
};

export const getTachesAujourdhui = async () => {
  try {
    const rows = await getTaches();
    const today = new Date().toISOString().split('T')[0];
    return rows
      .filter((row: any) => row['Date échéance'] === today || !row['Date échéance'])
      .map((row: any) => ({
        id: row.id.toString(),
        text: row.Nom,
        completed: row.Statut === 'Terminé',
      }));
  } catch (e) {
    return [];
  }
};

export const updateTacheStatut = async (id: string, completed: boolean) => {
  try {
    await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.taches}/${id}/?user_field_names=true`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ Statut: completed ? 'Terminé' : 'En cours' }),
    });
  } catch (e) {
    console.error('Erreur update tâche:', e);
  }
};

// ============================================================
// POSTS
// ============================================================
export const getPosts = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.posts}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Posts:', e);
    return [];
  }
};

export const getPostsParStatut = async (statut: string) => {
  try {
    const rows = await getPosts();
    return rows.filter((row: any) => row.Statut === statut);
  } catch (e) {
    return [];
  }
};

// ============================================================
// FORMATIONS
// ============================================================
export const getFormations = async () => {
  try {
    const res = await fetch(`${BASEROW_URL}/database/rows/table/${TABLES.formations}/?user_field_names=true`, { headers });
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('Erreur Baserow Formations:', e);
    return [];
  }
};

// ============================================================
// STATS GLOBALES pour le Dashboard
// ============================================================
export const getStatsBaserow = async () => {
  const [revenus, depenses, emailsNonTraites] = await Promise.all([
    getRevenuesDuMois(),
    getDepensesDuMois(),
    getEmailsNonTraites(),
  ]);

  return {
    monthlyRevenue: revenus,
    monthlyExpenses: depenses,
    balance: revenus - depenses,
    unreadEmails: emailsNonTraites,
  };
};
