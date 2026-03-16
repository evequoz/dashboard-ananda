import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  duration: string;
  category: string;
  color: string;
  date: string;
}

export const useAgenda = (date?: string) => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      let query = supabase.from('agenda_items').select('*').order('time', { ascending: true });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<AgendaItem, 'id'>) => {
    try {
      const { data, error } = await supabase.from('agenda_items').insert([item]).select().single();
      if (error) throw error;
      setItems((prev) => [...prev, data].sort((a, b) => a.time.localeCompare(b.time)));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error adding item' };
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('agenda_items').delete().eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.filter((item) => item.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Error deleting item' };
    }
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('agenda-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  return { items, loading, addItem, deleteItem, refetch: fetchItems };
};
