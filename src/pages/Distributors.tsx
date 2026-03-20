import React, { useState } from 'react';
import { useSupabaseQuery } from '../supabase';
import { db, Distributor, addLog } from '../db';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Distributors() {
  const { user } = useAuth();
  const distributors = useSupabaseQuery<Distributor[]>('distributors');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Distributor>({ name: '', address: '', phone: '' });

  const handleSave = async () => {
    if (!formData.name) return alert('Vui lòng nhập tên nhà phân phối');
    
    if (editingId) {
      await db.distributors.update(editingId, formData);
      if (user) await addLog(user.username, `Cập nhật nhà phân phối ${formData.name}`);
    } else {
      await db.distributors.add(formData);
      if (user) await addLog(user.username, `Thêm nhà phân phối ${formData.name}`);
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
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc muốn xóa nhà phân phối này?')) {
      const distributor = await db.distributors.get(id);
      await db.distributors.delete(id);
      if (user && distributor) await addLog(user.username, `Xóa nhà phân phối ${distributor.name}`);
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
              {distributors?.map(d => (
                <tr key={d.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{d.name}</td>
                  <td className="px-6 py-4">{d.phone}</td>
                  <td className="px-6 py-4">{d.address}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(d)}>Sửa</Button>
                    <Button variant="destructive" size="sm" onClick={() => d.id && handleDelete(d.id)}>Xóa</Button>
                  </td>
                </tr>
              ))}
              {distributors?.length === 0 && (
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
