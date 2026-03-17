export interface Member {
  id: string;
  name: string;
  email: string;
  plan: 'Basic' | 'Premium';
  status: 'active' | 'trial' | 'inactive';
  joinDate: string;
  coursesCompleted: number;
  engagement: 'Débutant' | 'Avancé' | 'Expert';
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  duration: string;
  category: 'pratique' | 'contenu' | 'live' | 'coaching';
  color: string;
}

export interface Email {
  id: string;
  account: 'serge@eh-me.com' | 'info@eh-me.com' | 'serge@seme.ch';
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  priority: 'normal' | 'urgent';
}

export interface Transaction {
  id: string;
  type: string;
  clientName: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'refunded';
}

export const mockMembers: Member[] = [
  {
    id: '1',
    name: 'Sophie Martin',
    email: 'sophie.martin@example.com',
    plan: 'Premium',
    status: 'active',
    joinDate: '2024-03-15',
    coursesCompleted: 45,
    engagement: 'Expert',
  },
  {
    id: '2',
    name: 'Lucas Dubois',
    email: 'lucas.dubois@example.com',
    plan: 'Basic',
    status: 'active',
    joinDate: '2024-03-14',
    coursesCompleted: 12,
    engagement: 'Avancé',
  },
  {
    id: '3',
    name: 'Emma Laurent',
    email: 'emma.laurent@example.com',
    plan: 'Premium',
    status: 'active',
    joinDate: '2024-03-13',
    coursesCompleted: 38,
    engagement: 'Expert',
  },
  {
    id: '4',
    name: 'Thomas Petit',
    email: 'thomas.petit@example.com',
    plan: 'Premium',
    status: 'trial',
    joinDate: '2024-03-12',
    coursesCompleted: 5,
    engagement: 'Débutant',
  },
  {
    id: '5',
    name: 'Marie Dupont',
    email: 'marie.dupont@example.com',
    plan: 'Basic',
    status: 'active',
    joinDate: '2024-03-10',
    coursesCompleted: 32,
    engagement: 'Avancé',
  },
];

export const mockAgenda: AgendaItem[] = [
  {
    id: '1',
    time: '09:00',
    title: 'Méditation & Kriya',
    duration: '1h30',
    category: 'pratique',
    color: '#7b5ea7',
  },
  {
    id: '2',
    time: '11:00',
    title: 'Publication Newsletter',
    duration: '45min',
    category: 'contenu',
    color: '#c9a84c',
  },
  {
    id: '3',
    time: '15:00',
    title: 'Live Communauté',
    duration: '2h',
    category: 'live',
    color: '#4caf7d',
  },
  {
    id: '4',
    time: '18:00',
    title: 'Session Coaching',
    duration: '1h',
    category: 'coaching',
    color: '#d95555',
  },
];

export const mockEmails: Email[] = [
  {
    id: '1',
    account: 'serge@eh-me.com',
    from: 'Sophie Martin',
    subject: 'Question sur le Module 3',
    preview: 'Bonjour Serge, j\'aurais une question concernant l\'exercice de respiration...',
    date: '2024-03-17 10:30',
    read: false,
    priority: 'urgent',
  },
  {
    id: '2',
    account: 'info@eh-me.com',
    from: 'Lucas Techsupport',
    subject: 'Mise à jour serveur VPS',
    preview: 'La migration vers le nouveau serveur est terminée avec succès...',
    date: '2024-03-17 09:15',
    read: false,
    priority: 'normal',
  },
  {
    id: '3',
    account: 'serge@eh-me.com',
    from: 'Emma Laurent',
    subject: 'Témoignage - Transformation',
    preview: 'Je voulais partager avec vous mon évolution depuis 3 mois...',
    date: '2024-03-17 08:45',
    read: true,
    priority: 'normal',
  },
  {
    id: '4',
    account: 'info@eh-me.com',
    from: 'Stripe Payment',
    subject: 'Nouveau paiement reçu',
    preview: 'Vous avez reçu un paiement de 97€ pour un abonnement Premium...',
    date: '2024-03-17 07:20',
    read: false,
    priority: 'normal',
  },
  {
    id: '5',
    account: 'serge@seme.ch',
    from: 'Thomas Consulting',
    subject: 'Demande de partenariat',
    preview: 'Nous souhaiterions discuter d\'une collaboration pour nos clients...',
    date: '2024-03-16 16:30',
    read: false,
    priority: 'urgent',
  },
  {
    id: '6',
    account: 'serge@eh-me.com',
    from: 'Marc Dubois',
    subject: 'Inscription Formation Avancée',
    preview: 'Je souhaite m\'inscrire à la formation avancée qui commence le mois prochain...',
    date: '2024-03-16 14:20',
    read: true,
    priority: 'normal',
  },
  {
    id: '7',
    account: 'info@eh-me.com',
    from: 'Support n8n',
    subject: 'Workflow automatisé activé',
    preview: 'Votre workflow d\'automatisation des emails a été activé avec succès...',
    date: '2024-03-16 11:45',
    read: true,
    priority: 'normal',
  },
  {
    id: '8',
    account: 'serge@seme.ch',
    from: 'Christine Lefebvre',
    subject: 'Demande de consultation',
    preview: 'Je recherche un accompagnement personnalisé pour mon entreprise...',
    date: '2024-03-15 18:30',
    read: true,
    priority: 'normal',
  },
  {
    id: '9',
    account: 'serge@seme.ch',
    from: 'Pierre Conseil',
    subject: 'Proposition collaboration',
    preview: 'Nous organisons un événement et aimerions vous inviter comme intervenant...',
    date: '2024-03-15 10:15',
    read: false,
    priority: 'normal',
  },
];

export interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

export const mockObjectives: Objective[] = [
  { id: '1', text: 'Publier newsletter hebdomadaire', completed: false },
  { id: '2', text: 'Répondre aux emails prioritaires', completed: false },
  { id: '3', text: 'Préparer Live Communauté', completed: false },
  { id: '4', text: 'Réviser contenu Module 4', completed: false },
  { id: '5', text: 'Session coaching avec Marie', completed: false },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'Abonnement Premium',
    clientName: 'Sophie Martin',
    amount: 97,
    date: '2024-03-17',
    status: 'completed',
  },
  {
    id: '2',
    type: 'Abonnement Basic',
    clientName: 'Lucas Dubois',
    amount: 47,
    date: '2024-03-17',
    status: 'completed',
  },
  {
    id: '3',
    type: 'Coaching Privé',
    clientName: 'Emma Laurent',
    amount: 150,
    date: '2024-03-16',
    status: 'completed',
  },
  {
    id: '4',
    type: 'Abonnement Premium',
    clientName: 'Thomas Petit',
    amount: 97,
    date: '2024-03-16',
    status: 'pending',
  },
  {
    id: '5',
    type: 'Formation Avancée',
    clientName: 'Marie Dupont',
    amount: 297,
    date: '2024-03-15',
    status: 'completed',
  },
];

export const getStats = () => {
  const totalMembers = mockMembers.length;
  const activeMembers = mockMembers.filter((m) => m.status === 'active').length;
  const premiumMembers = mockMembers.filter((m) => m.plan === 'Premium').length;
  const totalRevenue = mockTransactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyRevenue = totalRevenue;
  const unreadEmails = mockEmails.filter((e) => !e.read).length;

  return {
    totalMembers,
    activeMembers,
    premiumMembers,
    totalRevenue,
    monthlyRevenue,
    unreadEmails,
  };
};
