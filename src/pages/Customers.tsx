import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer, addLog } from '../db';
import { Button, Input, Label, Select, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Customers() {
  const { user } = useAuth();
  const customers = useLiveQuery(() => db.customers.toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Customer>({ name: '', type: 'lẻ', region: '', address: '', phone: '' });

  const handleSave = async () => {
    if (!formData.name) return alert('Vui lòng nhập tên khách hàng');
    
    if (editingId) {
      await db.customers.update(editingId, formData);
      if (user) await addLog(user.username, `Cập nhật khách hàng ${formData.name}`);
    } else {
      await db.customers.add(formData);
      if (user) await addLog(user.username, `Thêm khách hàng ${formData.name}`);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', type: 'lẻ', region: '', address: '', phone: '' });
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      type: customer.type,
      region: customer.region,
      address: customer.address,
      phone: customer.phone
    });
    setEditingId(customer.id!);
    setIsAdding(true);
    setTimeout(() => {
      document.getElementById('main-content')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }, 10);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc muốn xóa khách hàng này?')) {
      const customer = await db.customers.get(id);
      await db.customers.delete(id);
      if (user && customer) await addLog(user.username, `Xóa khách hàng ${customer.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Quản lý Khách hàng</h2>
        <Button onClick={() => {
          if (isAdding) {
            setIsAdding(false);
            setEditingId(null);
            setFormData({ name: '', type: 'lẻ', region: '', address: '', phone: '' });
          } else {
            setIsAdding(true);
          }
        }} className="w-full sm:w-auto">
          {isAdding ? 'Hủy' : 'Thêm Khách hàng'}
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Sửa Khách hàng' : 'Thêm Khách hàng mới'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên khách hàng</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Loại khách</Label>
                <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'sỉ' | 'lẻ'})}>
                  <option value="lẻ">Khách lẻ</option>
                  <option value="sỉ">Khách sỉ</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Khu vực</Label>
                <Input value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} />
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
                <th className="px-6 py-3">Loại</th>
                <th className="px-6 py-3">Khu vực</th>
                <th className="px-6 py-3">Số điện thoại</th>
                <th className="px-6 py-3">Địa chỉ</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map(c => (
                <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4">{c.type === 'sỉ' ? 'Sỉ' : 'Lẻ'}</td>
                  <td className="px-6 py-4">{c.region}</td>
                  <td className="px-6 py-4">{c.phone}</td>
                  <td className="px-6 py-4">{c.address}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(c)}>Sửa</Button>
                    <Button variant="destructive" size="sm" onClick={() => c.id && handleDelete(c.id)}>Xóa</Button>
                  </td>
                </tr>
              ))}
              {customers?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
