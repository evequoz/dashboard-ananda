import { askGemini } from './geminiService';

export interface PlannedTask {
  title: string;
  description?: string;
  priority?: 'Basse' | 'Normale' | 'Haute';
  project?: string;
  due_date?: string | null;
  subtasks?: PlannedTask[];
}

export interface PlannedTaskPayload {
  goal: string;
  tasks: PlannedTask[];
}

export const generateTaskPlan = async (goal: string): Promise<PlannedTaskPayload> => {
  const prompt = `
Tu es un assistant expert en organisation professionnelle.
À partir de l'objectif utilisateur, crée un plan d'action concret en tâches parent/enfant.

Objectif:
${goal}

Contraintes:
- Réponds EXCLUSIVEMENT avec du JSON valide (sans markdown).
- Français.
- Entre 3 et 7 tâches principales.
- Chaque tâche peut avoir 0 à 5 sous-tâches.
- priorities autorisées: "Basse", "Normale", "Haute".
- due_date au format YYYY-MM-DD si utile, sinon null.

Format attendu:
{
  "goal": "objectif reformulé",
  "tasks": [
    {
      "title": "Tâche principale",
      "description": "description brève",
      "priority": "Normale",
      "project": "Admin",
      "due_date": null,
      "subtasks": [
        {
          "title": "Sous-tâche",
          "description": "optionnel",
          "priority": "Normale",
          "project": "Admin",
          "due_date": null
        }
      ]
    }
  ]
}
`;

  const response = await askGemini(prompt, true);
  const data = response.data as PlannedTaskPayload;
  if (!data || !Array.isArray(data.tasks)) {
    throw new Error("Réponse IA invalide: aucune liste de tâches.");
  }
  return data;
};

