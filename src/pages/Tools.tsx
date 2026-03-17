import { Workflow, Brain, FileText, Zap, ExternalLink } from 'lucide-react';

export const Tools = () => {
  const tools = [
    {
      name: 'n8n Automation',
      description: 'Plateforme d\'automatisation des workflows et intégrations',
      url: 'https://n8n.io',
      icon: Workflow,
      color: '#d95555',
      gradient: 'from-[#d95555] to-[#c44444]',
      features: ['Automatisation email', 'Workflows marketing', 'Intégrations API'],
    },
    {
      name: 'Dify AI',
      description: 'Plateforme de développement d\'applications IA et LLM',
      url: 'https://dify.ai',
      icon: Brain,
      color: '#7b5ea7',
      gradient: 'from-[#7b5ea7] to-[#6a4d96]',
      features: ['Chatbots IA', 'Génération contenu', 'Analyse intelligente'],
    },
    {
      name: 'Affine Notes',
      description: 'Espace de travail collaboratif pour documentation et gestion de projets',
      url: 'https://affine.pro',
      icon: FileText,
      color: '#4caf7d',
      gradient: 'from-[#4caf7d] to-[#3d8f64]',
      features: ['Documentation', 'Gestion tâches', 'Collaboration temps réel'],
    },
    {
      name: 'VPS Cloud',
      description: 'Serveur privé virtuel pour hébergement et infrastructure',
      url: '#',
      icon: Zap,
      color: '#c9a84c',
      gradient: 'from-[#c9a84c] to-[#e8c97a]',
      features: ['Hébergement web', 'Base de données', 'Stockage sécurisé'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e4d9]">Écosystème d'Outils</h1>
          <p className="text-sm text-[#5a587a] mt-1">Accès rapide à vos plateformes de travail</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <div
              key={index}
              className="group bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] hover:border-[#c9a84c]/30 transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 bg-gradient-to-br ${tool.gradient} rounded-xl flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 10px 30px ${tool.color}40` }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#e8e4d9]">{tool.name}</h2>
                      <p className="text-sm text-[#5a587a] mt-1">{tool.description}</p>
                    </div>
                  </div>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-[#22223a] transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-[#5a587a] group-hover:text-[#c9a84c]" />
                  </a>
                </div>

                <div className="space-y-2 mb-6">
                  {tool.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: tool.color }}
                      />
                      <span className="text-sm text-[#e8e4d9]">{feature}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full py-3 bg-gradient-to-r ${tool.gradient} text-white rounded-lg font-semibold text-center hover:scale-105 transition-transform shadow-lg`}
                  style={{ boxShadow: `0 4px 20px ${tool.color}30` }}
                >
                  Accéder à la plateforme
                </a>
              </div>

              <div
                className="h-1 w-full bg-gradient-to-r"
                style={{
                  background: `linear-gradient(90deg, ${tool.color}, transparent)`,
                  opacity: 0.3,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#c9a84c]/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-[#05050a]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#e8c97a] mb-2">
              Intégration Complète de l'Écosystème
            </h3>
            <p className="text-sm text-[#e8e4d9] leading-relaxed mb-4">
              Tous ces outils sont interconnectés pour optimiser votre workflow. Les automatisations n8n communiquent
              avec Dify AI, la documentation est centralisée dans Affine, et tout est hébergé sur votre VPS sécurisé.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#4caf7d] rounded-full animate-pulse" />
              <span className="text-xs text-[#4caf7d] font-semibold">Tous les services sont opérationnels</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Workflows Actifs', value: '23', color: '#d95555' },
          { label: 'Sessions IA', value: '156', color: '#7b5ea7' },
          { label: 'Documents', value: '47', color: '#4caf7d' },
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-[#0a0a15] to-[#0f0f1a] rounded-xl border border-[#22223a] p-4"
          >
            <p className="text-xs text-[#5a587a] mb-2">{stat.label}</p>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
