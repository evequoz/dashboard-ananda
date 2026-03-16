import { EmailItemProps } from '../../types/dashboard';

export const EmailItem = ({ title, sender, time, tag, color }: EmailItemProps) => {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[#22223a] last:border-b-0 transition-all duration-200 hover:bg-[#141425]/30 hover:px-2 rounded">
      <div className="flex gap-3 items-center">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
          style={{ background: color }}
          aria-label={`Priority: ${tag}`}
        />
        <div>
          <p className="m-0 text-sm font-medium text-[#e8e4d9]">{title}</p>
          <p className="m-0 text-xs text-[#5a587a]">{sender}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="m-0 text-xs text-[#5a587a]">{time}</p>
        <span
          className="text-[9px] uppercase tracking-wider font-bold"
          style={{ color }}
        >
          {tag}
        </span>
      </div>
    </div>
  );
};
