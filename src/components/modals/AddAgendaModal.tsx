import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useAgenda } from '../../hooks/useAgenda';

interface AddAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'pratique', label: 'Pratique', color: '#7b5ea7' },
  { value: 'contenu', label: 'Contenu', color: '#c9a84c' },
  { value: 'live', label: 'Live', color: '#4caf7d' },
  { value: 'coaching', label: 'Coaching', color: '#d95555' },
];

export const AddAgendaModal = ({ isOpen, onClose }: AddAgendaModalProps) => {
  const { showToast } = useToast();
  const { addItem } = useAgenda();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    time: '',
    title: '',
    duration: '',
    category: 'pratique',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const category = CATEGORIES.find((c) => c.value === formData.category);
    const result = await addItem({
      ...formData,
      color: category?.color || '#c9a84c',
    });

    setLoading(false);

    if (result.success) {
      showToast('success', 'Événement ajouté à l\'agenda !');
      onClose();
      setFormData({
        time: '',
        title: '',
        duration: '',
        category: 'pratique',
        date: new Date().toISOString().split('T')[0],
      });
    } else {
      showToast('error', result.error || 'Erreur lors de l\'ajout');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter à l'agenda" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Titre</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            placeholder="Ex: Méditation & Kriya"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Heure</label>
            <input
              type="time"
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Durée</label>
            <input
              type="text"
              required
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
              placeholder="Ex: 1h30"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Catégorie</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#22223a] text-[#e8e4d9] rounded-lg hover:bg-[#2a2a42] transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] text-[#05050a] rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
