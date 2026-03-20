import React, { useState, useEffect } from 'react';
import { Company } from '../db';
import { supabase, useSupabaseQuery } from '../supabase';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function SettingsInfo() {
  const { user } = useAuth();
  
  // Lấy thông tin công ty (lấy bản ghi đầu tiên)
  const companyData = useSupabaseQuery<Company[]>('company') || [];
  const company = companyData[0];
  
  const [formData, setFormData] = useState<Company>({
    name: '', address: '', phone: '', taxId: '', logo: ''
  });

  useEffect(() => {
    if (company) setFormData(company);
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (company?.id) {
      const { error } = await supabase.from('company').update(formData).eq('id', company.id);
      if (error) return alert('Lỗi lưu thông tin: ' + error.message);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: 'Cập nhật thông tin công ty' }]);
    } else {
      const { error } = await supabase.from('company').insert([formData]);
      if (error) return alert('Lỗi thêm thông tin: ' + error.message);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: 'Thêm thông tin công ty' }]);
    }
    alert('Đã lưu thông tin công ty thành công lên Cloud!');
  };

  // Giữ nguyên phần return (<div... trở xuống)