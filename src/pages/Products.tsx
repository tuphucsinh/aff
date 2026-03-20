import React, { useState, useMemo } from 'react';
import { Product } from '../db'; // Giữ lại interface để định dạng dữ liệu
import { supabase, useSupabaseQuery } from '../supabase'; // Dùng Supabase thay cho Dexie
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Products() {
  const { user } = useAuth();
  // Lấy dữ liệu live từ Supabase
  const products = useSupabaseQuery<Product[]>('products') || [];
  
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Product>({ 
    name: '', sku: '', unit: '', minStock: 0, currentStock: 0
  });

  const canEdit = user?.role === 'admin' || user?.role === 'warehouse';

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock < p.minStock);
  }, [products]);

  const handleSave = async () => {
    if (!formData.name) return alert('Vui lòng nhập tên sản phẩm');
    
    // Thêm dữ liệu lên Supabase
    const { error } = await supabase.from('products').insert([{
      name: formData.name,
      sku: formData.sku,
      unit: formData.unit,
      minStock: Number(formData.minStock),
      currentStock: Number(formData.currentStock),
    }]);

    if (error) {
      alert('Lỗi khi lưu lên Supabase: ' + error.message);
      return;
    }

    // Tùy chọn: Thêm log lên Supabase nếu bạn có bảng logs
    if (user) {
      await supabase.from('logs').insert([{
        timestamp: new Date().toISOString(),
        username: user.username,
        action: `Thêm sản phẩm ${formData.name}`
      }]);
    }

    setIsAdding(false);
    setFormData({ name: '', sku: '', unit: '', minStock: 0, currentStock: 0 });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      // Xóa dữ liệu trên Supabase
      const { error } = await supabase.from('products').delete().eq('id', id);
      
      if (error) {
        alert('Lỗi khi xóa: ' + error.message);
      } else if (user) {
        await supabase.from('logs').insert([{
          timestamp: new Date().toISOString(),
          username: user.username,
          action: `Xóa sản phẩm ID: ${id}`
        }]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Sản phẩm & Kho</h2>
        {canEdit && (
          <Button onClick={() => setIsAdding(!isAdding)} className="w-full sm:w-auto">
            {isAdding ? 'Hủy' : 'Thêm Sản phẩm'}
          </Button>
        )}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Cảnh báo tồn kho thấp</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {lowStockProducts.map(p => (
                    <li key={p.id}>{p.name} (Tồn: {p.currentStock}, Tối thiểu: {p.minStock})</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdding && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Thêm Sản phẩm mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên sản phẩm</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Mã SP (SKU)</Label>
                <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Đơn vị tính</Label>
                <Input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tồn kho hiện tại</Label>
                <Input type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Tồn kho tối thiểu</Label>
                <Input type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
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
                <th className="px-6 py-3">Mã SP</th>
                <th className="px-6 py-3">Tên sản phẩm</th>
                <th className="px-6 py-3">ĐVT</th>
                <th className="px-6 py-3 text-right">Tồn kho</th>
                {canEdit && <th className="px-6 py-3 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{p.sku}</td>
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4">{p.unit}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={p.currentStock < p.minStock ? 'text-red-600 font-bold' : ''}>
                      {p.currentStock}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <Button variant="destructive" onClick={() => p.id && handleDelete(p.id)}>Xóa</Button>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}