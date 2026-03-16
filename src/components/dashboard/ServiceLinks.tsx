import { ServiceLink } from '../../types/dashboard';

interface ServiceLinksProps {
  services: ServiceLink[];
}

export const ServiceLinks = ({ services }: ServiceLinksProps) => {
  return (
    <div className="flex gap-2.5 mb-8 flex-wrap">
      {services.map((service) => (
        <a
          key={service.label}
          href={service.url}
          target="_blank"
          rel="noreferrer"
          className="px-3.5 py-1.5 bg-[#0f0f1a] border border-[#22223a] rounded-full text-[#5a587a] no-underline text-xs transition-all duration-300 hover:text-[#c9a84c] hover:border-[#c9a84c]/40 hover:shadow-md hover:shadow-[#c9a84c]/10 hover:scale-105"
        >
          <span className="mr-1.5" role="img" aria-label={service.label}>
            {service.icon}
          </span>
          {service.label}
        </a>
      ))}
    </div>
  );
};
