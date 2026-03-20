import React, { useState } from 'react';
import { useSupabaseQuery } from '../supabase';
import { db, User, addLog } from '../db';
import { Button, Input, Label, Select, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Users() {
  const { user } = useAuth();
  const users = useSupabaseQuery<User[]>('users');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<User>({ username: '', password: '', name: '', role: 'sales' });

  const handleSave = async () => {
    if (!formData.username || !formData.password || !formData.name) return alert('Vui lòng nhập đủ thông tin');
    
    const existing = await db.users.where('username').equals(formData.username).first();
    if (existing && !formData.id) {
      return alert('Tên đăng nhập đã tồn tại');
    }

    if (formData.id) {
      await db.users.update(formData.id, formData);
      if (user) await addLog(user.username, `Cập nhật thông tin nhân viên ${formData.username}`);
    } else {
      await db.users.add(formData);
      if (user) await addLog(user.username, `Thêm nhân viên mới ${formData.username}`);
    }
    
    setIsAdding(false);
    setFormData({ username: '', password: '', name: '', role: 'sales' });
  };

  const handleEdit = (user: User) => {
    setFormData(user);
    setIsAdding(true);
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleDelete = async (id: number) => {
    if (id === 1) return alert('Không thể xóa tài khoản admin mặc định');
    if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      const deletedUser = await db.users.get(id);
      await db.users.delete(id);
      if (user && deletedUser) await addLog(user.username, `Xóa nhân viên ${deletedUser.username}`);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Quản lý Nhân viên</h2>
        <Button onClick={() => {
          setIsAdding(!isAdding);
          setFormData({ username: '', password: '', name: '', role: 'sales' });
        }} className="w-full sm:w-auto">
          {isAdding ? 'Hủy' : 'Thêm Nhân viên'}
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{formData.id ? 'Sửa thông tin' : 'Thêm Nhân viên mới'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên đầy đủ</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                  <option value="sales">Nhân viên bán hàng</option>
                  <option value="warehouse">Thủ kho</option>
                  <option value="admin">Quản trị viên</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tên đăng nhập</Label>
                <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!formData.id && formData.id === 1} />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
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
                <th className="px-6 py-3">Tên đăng nhập</th>
                <th className="px-6 py-3">Tên đầy đủ</th>
                <th className="px-6 py-3">Vai trò</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users?.map(u => (
                <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{u.username}</td>
                  <td className="px-6 py-4">{u.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-red-100 text-red-800' :
                      u.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {getRoleName(u.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(u)}>Sửa</Button>
                    {u.id !== 1 && (
                      <Button variant="destructive" size="sm" onClick={() => u.id && handleDelete(u.id)}>Xóa</Button>
                    )}
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
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
