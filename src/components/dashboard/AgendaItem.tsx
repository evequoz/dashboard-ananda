import { AgendaItemProps } from '../../types/dashboard';

export const AgendaItem = ({ time, title, duration, category, color }: AgendaItemProps) => {
  return (
    <div
      className="flex items-center gap-4 p-3 bg-[#141425] rounded-lg mb-2.5 border border-[#22223a] transition-all duration-200 hover:translate-x-1 hover:shadow-md"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <span className="text-[#c9a84c] font-bold w-11 text-xs">{time}</span>
      <div className="flex-1">
        <p className="m-0 font-medium text-sm text-[#e8e4d9]">{title}</p>
        <span className="text-xs text-[#5a587a]">{duration}</span>
      </div>
      <span
        className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border"
        style={{
          background: `${color}22`,
          color: color,
          borderColor: `${color}44`,
        }}
      >
        {category}
      </span>
    </div>
  );
};
