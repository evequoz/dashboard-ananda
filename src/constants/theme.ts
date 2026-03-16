import { ServiceLink } from '../types/dashboard';

export const THEME = {
  services: [
    { label: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
    { label: 'Drive', url: 'https://drive.google.com', icon: '📁' },
    { label: 'N8N', url: 'https://n8n.io', icon: '🤖' },
    { label: 'Analytics', url: 'https://analytics.google.com', icon: '📊' },
    { label: 'Stripe', url: 'https://stripe.com', icon: '💳' },
  ] as ServiceLink[],
  colors: {
    primary: '#c9a84c',
    success: '#4caf7d',
    danger: '#d95555',
    practice: '#7b5ea7',
    background: {
      primary: '#05050a',
      secondary: '#0f0f1a',
      tertiary: '#141425',
    },
    text: {
      primary: '#e8e4d9',
      secondary: '#5a587a',
      accent: '#e8c97a',
    },
    border: '#22223a',
  },
};

export const AGENDA_DATA = [
  {
    time: '09:00',
    title: 'Méditation & Kriya personnel',
    duration: '1h',
    category: 'pratique',
    color: '#7b5ea7',
  },
  {
    time: '11:00',
    title: 'Enregistrement vidéo — Les Yamas',
    duration: '2h',
    category: 'contenu',
    color: '#c9a84c',
  },
  {
    time: '14:30',
    title: 'Live EHME — Q&A Médecine Mystique',
    duration: '1h30',
    category: 'live',
    color: '#4caf7d',
  },
];

export const EMAIL_DATA = [
  {
    title: 'Question sur la technique Ujjayi',
    sender: 'Marie Dupont',
    time: '08:32',
    tag: 'urgent',
    color: '#d95555',
  },
  {
    title: 'Problème accès replay Live du 5 mars',
    sender: 'Sophie Lambert',
    time: '06:48',
    tag: 'urgent',
    color: '#d95555',
  },
  {
    title: 'Demande de coaching privé',
    sender: 'Jean-Pierre Martin',
    time: '07:15',
    tag: 'info',
    color: '#5a587a',
  },
];
