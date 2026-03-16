import { StatsItem } from '../../types/dashboard';

interface StatsDisplayProps {
  stats: StatsItem[];
}

export const StatsDisplay = ({ stats }: StatsDisplayProps) => {
  return (
    <div className="flex gap-10">
      {stats.map((stat) => (
        <div key={stat.label} className="text-right">
          <p className="m-0 text-[#5a587a] text-[11px] tracking-widest uppercase">
            {stat.label}
          </p>
          <p
            className="text-[26px] m-0 font-semibold transition-all duration-300 hover:scale-110"
            style={{ color: stat.color }}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};
