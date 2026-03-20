import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../supabase';
import { db, Product, addLog } from '../db';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function Products() {
  const { user } = useAuth();
  const products = useSupabaseQuery<Product[]>('products');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Product>({ 
    name: '', sku: '', unit: '', minStock: 0, currentStock: 0
  });

  const canEdit = user?.role === 'admin' || user?.role === 'warehouse';

  const lowStockProducts = useMemo(() => {
    return products?.filter(p => p.currentStock < p.minStock) || [];
  }, [products]);

  const handleSave = async () => {
    if (!formData.name) return alert('Vui lòng nhập tên sản phẩm');
    await db.products.add({
      ...formData,
      minStock: Number(formData.minStock),
      currentStock: Number(formData.currentStock),
    });
    if (user) await addLog(user.username, `Thêm sản phẩm ${formData.name}`);
    setIsAdding(false);
    setFormData({ name: '', sku: '', unit: '', minStock: 0, currentStock: 0 });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      const product = await db.products.get(id);
      await db.products.delete(id);
      if (user && product) await addLog(user.username, `Xóa sản phẩm ${product.name}`);
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

      {/* Cảnh báo tồn kho */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
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
              {products?.map(p => (
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
              {products?.length === 0 && (
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
