import { DashboardCardProps } from '../../types/dashboard';

export const DashboardCard = ({ title, icon, children, className = '' }: DashboardCardProps) => {
  return (
    <div className={`bg-gradient-to-br from-[#0f0f1a] to-[#141425] border border-[#22223a] rounded-2xl p-7 transition-all duration-300 hover:border-[#c9a84c]/40 hover:shadow-2xl hover:shadow-[#c9a84c]/10 hover:-translate-y-1 ${className}`}>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#22223a]/50">
        <span className="text-3xl filter drop-shadow-lg" role="img" aria-label={title}>
          {icon}
        </span>
        <h2 className="text-xl font-semibold text-[#e8c97a] tracking-wide">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
};
