import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Listener = () => void;
const listeners: Record<string, Set<Listener>> = {};

const pendingNotifications = new Set<string>();
let notificationTimeout: any = null;

export const notifyTableChange = (tableName: string) => {
  pendingNotifications.add(tableName);
  
  if (!notificationTimeout) {
    notificationTimeout = setTimeout(() => {
      pendingNotifications.forEach(table => {
        if (listeners[table]) {
          listeners[table].forEach(listener => listener());
        }
      });
      pendingNotifications.clear();
      notificationTimeout = null;
    }, 50);
  }
};

export function useSupabaseQuery<T>(tableName: string, queryFn?: (query: any) => any, deps: any[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  
  useEffect(() => {
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') return;
    
    let isMounted = true;
    
    const fetchData = async () => {
      let q = supabase.from(tableName).select('*');
      if (queryFn) {
        q = queryFn(q);
      }
      const { data: result, error } = await q;
      if (error) {
        console.error(error);
      } else if (isMounted) {
        setData(result as T);
      }
    };
    
    fetchData();
    
    if (!listeners[tableName]) listeners[tableName] = new Set();
    const localListener = () => fetchData();
    listeners[tableName].add(localListener);
    
    const channel = supabase.channel(`public:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
        fetchData();
      })
      .subscribe();
      
    return () => {
      isMounted = false;
      if (listeners[tableName]) {
        listeners[tableName].delete(localListener);
      }
      supabase.removeChannel(channel);
    };
  }, deps);
  
  return data;
}

