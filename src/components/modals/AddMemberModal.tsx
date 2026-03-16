import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useMembers } from '../../hooks/useMembers';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMemberModal = ({ isOpen, onClose }: AddMemberModalProps) => {
  const { showToast } = useToast();
  const { addMember } = useMembers();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plan: 'Basic',
    status: 'active',
    engagement_level: 'Débutant',
    courses_completed: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await addMember({
      ...formData,
      join_date: new Date().toISOString().split('T')[0],
      last_active: new Date().toISOString(),
    });

    setLoading(false);

    if (result.success) {
      showToast('success', `${formData.name} a été ajouté avec succès !`);
      onClose();
      setFormData({
        name: '',
        email: '',
        plan: 'Basic',
        status: 'active',
        engagement_level: 'Débutant',
        courses_completed: 0,
      });
    } else {
      showToast('error', result.error || 'Erreur lors de l\'ajout');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un nouveau membre" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Nom complet</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            placeholder="Ex: Sophie Martin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            placeholder="sophie@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Plan</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            >
              <option value="Basic">Basic</option>
              <option value="Premium">Premium</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e8e4d9] mb-2">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a15] border border-[#22223a] rounded-lg text-[#e8e4d9] focus:border-[#c9a84c] focus:outline-none transition-colors"
            >
              <option value="active">Actif</option>
              <option value="trial">Essai</option>
              <option value="inactive">Inactif</option>
            </select>
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
