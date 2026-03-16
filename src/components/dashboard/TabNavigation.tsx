import { TabName } from '../../types/dashboard';

interface TabNavigationProps {
  tabs: TabName[];
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export const TabNavigation = ({ tabs, activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <nav className="flex gap-6 border-b border-[#22223a] mb-8">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`
            py-2.5 px-1 bg-transparent border-0 border-b-2 cursor-pointer text-sm transition-all duration-300
            ${activeTab === tab
              ? 'border-[#c9a84c] text-[#e8c97a] font-medium'
              : 'border-transparent text-[#5a587a] font-normal hover:text-[#e8c97a]/70'
            }
          `}
          aria-current={activeTab === tab ? 'page' : undefined}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};
