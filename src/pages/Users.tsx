import React, { useState } from 'react';
import { User } from '../db';
import { supabase, useSupabaseQuery } from '../supabase';
import { Button, Input, Label, Select, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Users() {
  const { user } = useAuth();
  const users = useSupabaseQuery<User[]>('users') || [];
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<User>({ username: '', password: '', name: '', role: 'sales' });

  const handleSave = async () => {
    if (!formData.username || !formData.password || !formData.name) return alert('Vui lòng nhập đủ thông tin');
    
    const existing = users.find(u => u.username === formData.username);
    if (existing && !formData.id) {
      return alert('Tên đăng nhập đã tồn tại');
    }

    if (formData.id) {
      await supabase.from('users').update(formData).eq('id', formData.id);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Cập nhật thông tin nhân viên ${formData.username}` }]);
    } else {
      await supabase.from('users').insert([formData]);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Thêm nhân viên mới ${formData.username}` }]);
    }
    
    setIsAdding(false);
    setFormData({ username: '', password: '', name: '', role: 'sales' });
  };

  const handleEdit = (u: User) => {
    setFormData(u);
    setIsAdding(true);
    setTimeout(() => {
      document.getElementById('main-content')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }, 10);
  };

  const handleDelete = async (id: number, username: string) => {
    if (id === 1) return alert('Không thể xóa tài khoản admin mặc định');
    if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      await supabase.from('users').delete().eq('id', id);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Xóa nhân viên ${username}` }]);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'sales': return 'Nhân viên bán hàng';
      case 'warehouse': return 'Thủ kho';
      default: return role;
    }
  };

  // ... Giữ nguyên phần return (Giao diện) bên dưới