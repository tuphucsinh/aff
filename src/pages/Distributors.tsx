import React, { useState } from 'react';
import { Distributor } from '../db';
import { supabase, useSupabaseQuery } from '../supabase';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Distributors() {
  const { user } = useAuth();
  const distributors = useSupabaseQuery<Distributor[]>('distributors') || [];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Distributor>({ name: '', address: '', phone: '' });

  const handleSave = async () => {
    if (!formData.name) return alert('Vui lòng nhập tên nhà phân phối');
    
    if (editingId) {
      const { error } = await supabase.from('distributors').update(formData).eq('id', editingId);
      if (error) return alert('Lỗi cập nhật: ' + error.message);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Cập nhật NPP ${formData.name}` }]);
    } else {
      const { error } = await supabase.from('distributors').insert([formData]);
      if (error) return alert('Lỗi thêm mới: ' + error.message);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Thêm NPP ${formData.name}` }]);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', address: '', phone: '' });
  };

  const handleEdit = (distributor: Distributor) => {
    setFormData({
      name: distributor.name,
      address: distributor.address,
      phone: distributor.phone
    });
    setEditingId(distributor.id!);
    setIsAdding(true);
    setTimeout(() => {
      document.getElementById('main-content')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }, 10);
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm('Bạn có chắc muốn xóa nhà phân phối này?')) {
      const { error } = await supabase.from('distributors').delete().eq('id', id);
      if (error) return alert('Lỗi xóa: ' + error.message);
      if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Xóa NPP ${name}` }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Quản lý Nhà phân phối</h2>
        <Button onClick={() => {
          if (isAdding) {
            setIsAdding(false);
            setEditingId(null);
            setFormData({ name: '', address: '', phone: '' });
          } else {
            setIsAdding(true);
          }
        }} className="w-full sm:w-auto">
          {isAdding ? 'Hủy' : 'Thêm Nhà phân phối'}
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Sửa Nhà phân phối' : 'Thêm Nhà phân phối mới'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên nhà phân phối</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Địa chỉ</Label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full sm:w-auto">Lưu</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Tên</th>
                <th className="px-6 py-3">Số điện thoại</th>
                <th className="px-6 py-3">Địa chỉ</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {distributors.map(d => (
                <tr key={d.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{d.name}</td>
                  <td className="px-6 py-4">{d.phone}</td>
                  <td className="px-6 py-4">{d.address}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(d)}>Sửa</Button>
                    <Button variant="destructive" size="sm" onClick={() => d.id && handleDelete(d.id, d.name)}>Xóa</Button>
                  </td>
                </tr>
              ))}
              {distributors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}