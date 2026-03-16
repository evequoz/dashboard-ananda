import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Member {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  join_date: string;
  courses_completed: number;
  engagement_level: string;
  last_active: string;
}

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching members');
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (member: Omit<Member, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([member])
        .select()
        .single();

      if (error) throw error;
      setMembers((prev) => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error adding member' };
    }
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMembers((prev) => prev.map((m) => (m.id === id ? data : m)));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error updating member' };
    }
  };

  useEffect(() => {
    fetchMembers();

    const channel = supabase
      .channel('members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { members, loading, error, addMember, updateMember, refetch: fetchMembers };
};
