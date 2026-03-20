import React, { useMemo } from 'react';
import { Log } from '../db';
import { useSupabaseQuery } from '../supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { format } from 'date-fns';

export default function SettingsLogs() {
  // Lấy toàn bộ logs từ Supabase
  const rawLogs = useSupabaseQuery<Log[]>('logs') || [];
  
  // Sắp xếp mới nhất lên đầu và lấy 100 dòng mới nhất
  const logs = useMemo(() => {
    return [...rawLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);
  }, [rawLogs]);

  // Giữ nguyên phần return (<div... trở xuống)