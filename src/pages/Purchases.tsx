import React, { useState } from 'react';
import { PurchaseItem, Purchase, Distributor, Product } from '../db';
import { supabase, useSupabaseQuery } from '../supabase';
import { Button, Input, Label, Select, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';

export default function Purchases() {
  const { user } = useAuth();
  const purchases = useSupabaseQuery<Purchase[]>('purchases') || [];
  const distributors = useSupabaseQuery<Distributor[]>('distributors') || [];
  const products = useSupabaseQuery<Product[]>('products') || [];

  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [distributorId, setDistributorId] = useState<number>(0);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  
  const [currentItem, setCurrentItem] = useState<PurchaseItem>({ productId: 0, quantity: 1, price: 0 });

  const handleAddItem = () => {
    if (!currentItem.productId || currentItem.quantity <= 0) return alert('Vui lòng chọn sản phẩm và số lượng');
    setItems([...items, { ...currentItem }]);
    setCurrentItem({ productId: 0, quantity: 1, price: 0 });
  };

  const handleSave = async () => {
    if (!distributorId) return alert('Vui lòng chọn nhà phân phối');
    if (items.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm');

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const year = new Date(date).getFullYear();
    const yearPurchases = purchases.filter(p => p.date.startsWith(year.toString()));
    const sequence = (yearPurchases.length + 1).toString().padStart(3, '0');
    const purchaseCode = `NH-${year}-${sequence}`;

    const { error: insertError } = await supabase.from('purchases').insert([{
      purchaseCode,
      date,
      distributorId,
      items,
      total
    }]);

    if (insertError) return alert('Lỗi lưu đơn nhập: ' + insertError.message);

    // Cập nhật tồn kho cho từng sản phẩm
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        await supabase.from('products')
          .update({ currentStock: product.currentStock + item.quantity })
          .eq('id', product.id);
      }
    }

    if (user) await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: `Nhập hàng ${purchaseCode}` }]);

    setIsAdding(false);
    setItems([]);
    setDistributorId(0);
    alert('Nhập hàng thành công!');
  };

  const getDistributorName = (id: number) => distributors.find(d => d.id === id)?.name || 'Unknown';
  const getProductName = (id: number) => products.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Quản lý Nhập hàng</h2>
        <Button onClick={() => setIsAdding(!isAdding)} className="w-full sm:w-auto">
          {isAdding ? 'Hủy' : 'Nhập hàng mới'}
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Phiếu nhập hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tương tự code cũ, giữ nguyên giao diện UI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày nhập</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nhà phân phối</Label>
                <Select value={distributorId} onChange={e => setDistributorId(Number(e.target.value))}>
                  <option value={0}>-- Chọn nhà phân phối --</option>
                  {distributors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Thêm sản phẩm</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Sản phẩm</Label>
                  <Select value={currentItem.productId} onChange={e => setCurrentItem({...currentItem, productId: Number(e.target.value), price: 0})}>
                    <option value={0}>-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Tồn: {p.currentStock})</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min="1" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Đơn giá nhập</Label>
                  <Input type="number" value={currentItem.price} onChange={e => setCurrentItem({...currentItem, price: Number(e.target.value)})} />
                </div>
                <div className="sm:col-span-2 md:col-span-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={handleAddItem} className="w-full sm:w-auto">Thêm vào phiếu</Button>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm text-left border whitespace-nowrap">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2">Sản phẩm</th>
                        <th className="px-4 py-2 text-right">Số lượng</th>
                        <th className="px-4 py-2 text-right">Đơn giá</th>
                        <th className="px-4 py-2 text-right">Thành tiền</th>
                        <th className="px-4 py-2 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-2">{getProductName(item.productId)}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{item.price.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{(item.quantity * item.price).toLocaleString()}</td>
                          <td className="px-4 py-2 text-center">
                            <button className="text-red-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}>X</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-50">
                        <td colSpan={3} className="px-4 py-2 text-right">Tổng cộng:</td>
                        <td className="px-4 py-2 text-right">
                          {items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} đ
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSave} className="w-full sm:w-auto">Hoàn tất nhập hàng</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử nhập hàng</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Mã phiếu</th>
                <th className="px-6 py-3">Ngày nhập</th>
                <th className="px-6 py-3">Nhà phân phối</th>
                <th className="px-6 py-3 text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{p.purchaseCode}</td>
                  <td className="px-6 py-4">{format(new Date(p.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4">{getDistributorName(p.distributorId)}</td>
                  <td className="px-6 py-4 text-right font-bold text-blue-600">{p.total.toLocaleString()} đ</td>
                </tr>
              ))}
              {purchases.length === 0 && (
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