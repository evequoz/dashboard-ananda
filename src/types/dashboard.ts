export interface AgendaItemProps {
  time: string;
  title: string;
  duration: string;
  category: string;
  color: string;
}

export interface EmailItemProps {
  title: string;
  sender: string;
  time: string;
  tag: string;
  color: string;
}

export interface ServiceLink {
  label: string;
  url: string;
  icon: string;
}

export interface DashboardCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
}

export interface StatsItem {
  label: string;
  value: string | number;
  color: string;
}

export type TabName = 'Aperçu' | 'Planification' | 'Clientèle' | 'Finances';
