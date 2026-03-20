import React, { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery } from '../supabase';
import { db, SaleItem, Sale, addLog, Company, Customer, Product } from '../db';
import { Button, Input, Label, Select, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';

export default function Sales() {
  const { user } = useAuth();
  const sales = useSupabaseQuery<Sale[]>('sales', q => q.order('date', { ascending: false }));
  const customers = useSupabaseQuery<Customer[]>('customers');
  const products = useSupabaseQuery<Product[]>('products');

  const [isAdding, setIsAdding] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customerId, setCustomerId] = useState<number>(0);
  const [status, setStatus] = useState<'đã thanh toán' | 'chưa thanh toán'>('đã thanh toán');
  const [expectedPaymentDate, setExpectedPaymentDate] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  
  const companyData = useSupabaseQuery<Company[]>('company');
  const companySettings = companyData?.[0] || ({} as Company);

  const [currentItem, setCurrentItem] = useState<SaleItem>({ productId: 0, quantity: 1, price: 0, total: 0 });

  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [regionFilter, setRegionFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

  const resetForm = () => {
    setIsAdding(false);
    setEditingSaleId(null);
    setItems([]);
    setCustomerId(0);
    setStatus('đã thanh toán');
    setExpectedPaymentDate('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCurrentItem({ productId: 0, quantity: 1, price: 0, total: 0 });
  };

  const toggleExpand = (id: number) => {
    if (expandedSaleId === id) {
      setExpandedSaleId(null);
    } else {
      setExpandedSaleId(id);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.productId || currentItem.quantity <= 0) return alert('Vui lòng chọn sản phẩm và số lượng');
    
    const product = products?.find(p => p.id === currentItem.productId);
    if (product && currentItem.quantity > product.currentStock) {
      return alert(`Số lượng tồn kho không đủ. Tồn kho hiện tại: ${product.currentStock}`);
    }

    setItems([...items, { ...currentItem, total: currentItem.quantity * currentItem.price }]);
    setCurrentItem({ productId: 0, quantity: 1, price: 0, total: 0 });
  };

  const handleProductChange = (productId: number) => {
    setCurrentItem({
      ...currentItem,
      productId,
      price: 0,
      total: 0
    });
  };

  const handleQuantityChange = (quantity: number) => {
    setCurrentItem({
      ...currentItem,
      quantity,
      total: quantity * currentItem.price
    });
  };

  const handlePriceChange = (price: number) => {
    setCurrentItem({
      ...currentItem,
      price,
      total: currentItem.quantity * price
    });
  };

  const handleSave = async () => {
    if (!customerId) return alert('Vui lòng chọn khách hàng');
    if (items.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm');

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    let logMessage = '';
    await db.transaction('rw', db.sales, db.products, async () => {
      if (editingSaleId) {
        const oldSale = await db.sales.get(editingSaleId);
        if (oldSale) {
          // Hoàn trả tồn kho cũ
          for (const item of oldSale.items) {
            const product = await db.products.get(item.productId);
            if (product && product.id) {
              await db.products.update(product.id, {
                currentStock: product.currentStock + item.quantity
              });
            }
          }
          logMessage = `Cập nhật đơn hàng ${oldSale.orderCode}`;
        }

        await db.sales.update(editingSaleId, {
          date,
          customerId,
          items,
          totalAmount,
          status,
          expectedPaymentDate: status === 'chưa thanh toán' ? expectedPaymentDate : undefined
        });
      } else {
        // Generate Order Code
        const todaySales = await db.sales.where('date').equals(date).toArray();
        const orderNumber = (todaySales.length + 1).toString().padStart(3, '0');
        const orderCode = `BH-${format(new Date(date), 'yyMMdd')}-${orderNumber}`;

        await db.sales.add({
          orderCode,
          date,
          customerId,
          items,
          totalAmount,
          status,
          expectedPaymentDate: status === 'chưa thanh toán' ? expectedPaymentDate : undefined
        });
        logMessage = `Tạo đơn hàng ${orderCode}`;
      }

      // Trừ tồn kho mới
      for (const item of items) {
        const product = await db.products.get(item.productId);
        if (product && product.id) {
          await db.products.update(product.id, {
            currentStock: product.currentStock - item.quantity
          });
        }
      }
    });

    if (user && logMessage) await addLog(user.username, logMessage);

    resetForm();
    alert(editingSaleId ? 'Cập nhật đơn hàng thành công!' : 'Tạo đơn hàng thành công!');
  };

  const handlePrint = (sale: Sale) => {
    setSaleToPrint(sale);
  };

  const handleEdit = (sale: Sale) => {
    setDate(sale.date);
    setCustomerId(sale.customerId);
    setStatus(sale.status);
    setExpectedPaymentDate(sale.expectedPaymentDate || '');
    setItems(sale.items);
    setEditingSaleId(sale.id!);
    setIsAdding(true);
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const getCustomerName = (id: number) => customers?.find(c => c.id === id)?.name || 'Unknown';
  const getProductName = (id: number) => products?.find(p => p.id === id)?.name || 'Unknown';

  const todaySales = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return sales?.filter(s => s.date === todayStr) || [];
  }, [sales]);

  const regions = useMemo(() => {
    if (!customers) return [];
    const uniqueRegions = new Set(customers.map(c => c.region));
    return Array.from(uniqueRegions);
  }, [customers]);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    let filtered = [...sales];
    const now = new Date();
    
    // Time filter
    if (timeFilter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
      startOfWeek.setHours(0, 0, 0, 0);
      filtered = filtered.filter(s => new Date(s.date) >= startOfWeek);
    } else if (timeFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(s => new Date(s.date) >= startOfMonth);
    } else if (timeFilter === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(s => new Date(s.date) >= startOfYear);
    } else if (timeFilter === 'custom') {
      filtered = filtered.filter(s => s.date >= startDate && s.date <= endDate);
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(s => {
        const customer = customers?.find(c => c.id === s.customerId);
        return customer?.region === regionFilter;
      });
    }

    // Customer type filter
    if (customerTypeFilter !== 'all') {
      filtered = filtered.filter(s => {
        const customer = customers?.find(c => c.id === s.customerId);
        return customer?.type === customerTypeFilter;
      });
    }

    return filtered;
  }, [sales, customers, timeFilter, startDate, endDate, regionFilter, customerTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Print Preview Modal */}
      {saleToPrint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:bg-transparent print:static print:inset-auto print:flex-none print:items-start print:justify-start">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
            
            {/* Action buttons - hidden when printing */}
            <div className="flex justify-end space-x-3 mb-6 print:hidden">
              <Button variant="outline" onClick={() => setSaleToPrint(null)}>Đóng</Button>
              <Button onClick={() => {
                if (window.self !== window.top) {
                  alert("Tính năng in bị chặn trong chế độ xem trước.\n\nVui lòng nhấn nút 'Mở ứng dụng trong tab mới' (biểu tượng mũi tên ↗️ ở góc trên bên phải màn hình AI Studio) để có thể in hóa đơn.");
                } else {
                  window.print();
                }
              }}>In hóa đơn</Button>
            </div>

            {/* Invoice Content */}
            <style type="text/css" media="print">
              {`
                @page { size: A5 landscape; margin: 10mm; }
              `}
            </style>
            <div className="print-area">
              {/* Header: Logo, Company Info, and Invoice Meta */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-start space-x-6">
                  {companySettings.logo && (
                    <img src={companySettings.logo} alt="Logo" className="w-[172px] max-h-[172px] object-contain object-left-top mt-2" />
                  )}
                  <div className="pt-2">
                    <h2 className="text-xl font-bold uppercase">{companySettings.name || 'TÊN CÔNG TY'}</h2>
                    <p className="text-[12.5px] text-gray-600 mt-1">ĐC: {companySettings.address || 'Địa chỉ công ty'}</p>
                    <p className="text-[12.5px] text-gray-600">ĐT: {companySettings.phone || 'Số điện thoại'}</p>
                    {companySettings.taxId && <p className="text-[12.5px] text-gray-600">MST: {companySettings.taxId}</p>}
                  </div>
                </div>
                <div className="text-right pt-2">
                  <p className="text-[12.5px] text-gray-600">Mã HĐ: <span className="font-medium">{saleToPrint.orderCode}</span></p>
                  <p className="text-[12.5px] text-gray-600">Ngày: {format(new Date(saleToPrint.date), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Invoice Title */}
              <div className="text-center border-b pb-6 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 uppercase">Hóa Đơn Bán Hàng</h1>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">Thông tin khách hàng:</h3>
                <p className="text-sm"><span className="text-gray-600">Tên khách hàng:</span> <span className="font-medium">{getCustomerName(saleToPrint.customerId)}</span></p>
                <p className="text-sm"><span className="text-gray-600">Điện thoại:</span> {customers?.find(c => c.id === saleToPrint.customerId)?.phone || '---'}</p>
                <p className="text-sm"><span className="text-gray-600">Địa chỉ:</span> {customers?.find(c => c.id === saleToPrint.customerId)?.address || '---'}</p>
              </div>

              <table className="w-full text-sm text-left mb-6 border-collapse">
                <thead className="bg-gray-100 border-b-2 border-gray-800">
                  <tr>
                    <th className="py-2 px-2 border">STT</th>
                    <th className="py-2 px-2 border">Tên hàng hóa, dịch vụ</th>
                    <th className="py-2 px-2 border text-right">Số lượng</th>
                    <th className="py-2 px-2 border text-right">Đơn giá</th>
                    <th className="py-2 px-2 border text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {saleToPrint.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-2 border text-center">{idx + 1}</td>
                      <td className="py-2 px-2 border">{getProductName(item.productId)}</td>
                      <td className="py-2 px-2 border text-right">{item.quantity}</td>
                      <td className="py-2 px-2 border text-right">{item.price.toLocaleString()}</td>
                      <td className="py-2 px-2 border text-right font-medium">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={4} className="py-3 px-2 border text-right uppercase">Tổng cộng tiền thanh toán:</td>
                    <td className="py-3 px-2 border text-right text-lg">{saleToPrint.totalAmount.toLocaleString()} đ</td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex justify-between mt-12 text-center">
                <div>
                  <p className="font-bold">Khách hàng</p>
                  <p className="text-sm text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="text-sm italic mb-1">Ngày ..... tháng ..... năm 20...</p>
                  <p className="font-bold">Người bán hàng</p>
                  <p className="text-sm text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold">Bán hàng</h2>
        <Button onClick={() => isAdding ? resetForm() : setIsAdding(true)} className="w-full sm:w-auto">
          {isAdding ? 'Hủy' : 'ĐƠN HÀNG MỚI'}
        </Button>
      </div>

      <div className="print:hidden space-y-6">
        {isAdding && (
          <Card>
            <CardHeader>
              <CardTitle>{editingSaleId ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ngày bán</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Khách hàng</Label>
                <Select value={customerId} onChange={e => setCustomerId(Number(e.target.value))}>
                  <option value={0}>-- Chọn khách hàng --</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái thanh toán</Label>
                <Select value={status} onChange={e => setStatus(e.target.value as 'đã thanh toán' | 'chưa thanh toán')}>
                  <option value="đã thanh toán">Đã thanh toán</option>
                  <option value="chưa thanh toán">Chưa thanh toán (Công nợ)</option>
                </Select>
              </div>
              {status === 'chưa thanh toán' && (
                <div className="space-y-2">
                  <Label>Ngày dự kiến thanh toán</Label>
                  <Input type="date" value={expectedPaymentDate} onChange={e => setExpectedPaymentDate(e.target.value)} />
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Thêm sản phẩm</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Sản phẩm</Label>
                  <Select value={currentItem.productId} onChange={e => handleProductChange(Number(e.target.value))}>
                    <option value={0}>-- Chọn sản phẩm --</option>
                    {products?.map(p => (
                      <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                        {p.name} (Tồn: {p.currentStock})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Số lượng</Label>
                  <Input type="number" min="1" value={currentItem.quantity} onChange={e => handleQuantityChange(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Đơn giá bán</Label>
                  <Input type="number" value={currentItem.price} onChange={e => handlePriceChange(Number(e.target.value))} />
                </div>
                <div className="sm:col-span-2 md:col-span-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={handleAddItem} className="w-full sm:w-auto">Thêm vào đơn</Button>
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
                          <td className="px-4 py-2 text-right">{item.total.toLocaleString()}</td>
                          <td className="px-4 py-2 text-center">
                            <button className="text-red-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}>X</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-gray-50">
                        <td colSpan={3} className="px-4 py-2 text-right">Tổng cộng:</td>
                        <td className="px-4 py-2 text-right text-blue-600">
                          {items.reduce((sum, item) => sum + item.total, 0).toLocaleString()} đ
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSave} className="w-full sm:w-auto">Hoàn tất đơn hàng</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn hàng trong ngày ({format(new Date(), 'dd/MM/yyyy')})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Mã ĐH</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3 text-right">Tổng tiền</th>
                <th className="px-6 py-3 text-center">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {todaySales?.sort((a, b) => b.id! - a.id!).map(s => (
                <React.Fragment key={s.id}>
                  <tr className="bg-white border-b hover:bg-gray-50">
                    <td 
                      className="px-6 py-4 font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => toggleExpand(s.id!)}
                    >
                      {s.orderCode}
                    </td>
                    <td className="px-6 py-4">{getCustomerName(s.customerId)}</td>
                    <td className="px-6 py-4 text-right font-bold">{s.totalAmount.toLocaleString()} đ</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'đã thanh toán' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>Sửa</Button>
                      <Button variant="default" size="sm" onClick={() => handlePrint(s)}>In</Button>
                    </td>
                  </tr>
                  {expandedSaleId === s.id && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="bg-white p-4 rounded border shadow-sm">
                          <h4 className="font-semibold mb-2 text-gray-700">Chi tiết sản phẩm</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm whitespace-nowrap">
                              <thead className="text-xs text-gray-500 uppercase border-b">
                                <tr>
                                  <th className="pb-2 text-left">Sản phẩm</th>
                                  <th className="pb-2 text-right">Số lượng</th>
                                  <th className="pb-2 text-right">Đơn giá</th>
                                  <th className="pb-2 text-right">Thành tiền</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.items.map((item, idx) => (
                                  <tr key={idx} className="border-b last:border-0">
                                    <td className="py-2">{getProductName(item.productId)}</td>
                                    <td className="py-2 text-right">{item.quantity}</td>
                                    <td className="py-2 text-right">{item.price.toLocaleString()} đ</td>
                                    <td className="py-2 text-right font-medium">{item.total.toLocaleString()} đ</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {todaySales?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Chưa có đơn hàng nào trong ngày</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Thời gian</Label>
              <Select value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)}>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
                <option value="custom">Tùy chọn</option>
              </Select>
            </div>
            {timeFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Từ ngày</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Khu vực</Label>
              <Select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                <option value="all">Tất cả khu vực</option>
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loại khách hàng</Label>
              <Select value={customerTypeFilter} onChange={e => setCustomerTypeFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="sỉ">Sỉ</option>
                <option value="lẻ">Lẻ</option>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Mã ĐH</th>
                  <th className="px-6 py-3">Ngày</th>
                  <th className="px-6 py-3">Khách hàng</th>
                  <th className="px-6 py-3">Khu vực</th>
                  <th className="px-6 py-3">Loại</th>
                  <th className="px-6 py-3 text-right">Tổng tiền</th>
                  <th className="px-6 py-3 text-center">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => {
                  const customer = customers?.find(c => c.id === s.customerId);
                  return (
                    <React.Fragment key={`filtered-${s.id}`}>
                      <tr className="bg-white border-b hover:bg-gray-50">
                        <td 
                          className="px-6 py-4 font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => toggleExpand(s.id!)}
                        >
                          {s.orderCode}
                        </td>
                        <td className="px-6 py-4">{format(new Date(s.date), 'dd/MM/yyyy')}</td>
                        <td className="px-6 py-4">{customer?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">{customer?.region || '---'}</td>
                        <td className="px-6 py-4">{customer?.type || '---'}</td>
                        <td className="px-6 py-4 text-right font-bold">{s.totalAmount.toLocaleString()} đ</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'đã thanh toán' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>Sửa</Button>
                          <Button variant="default" size="sm" onClick={() => handlePrint(s)}>In</Button>
                        </td>
                      </tr>
                      {expandedSaleId === s.id && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="bg-white p-4 rounded border shadow-sm">
                              <h4 className="font-semibold mb-2 text-gray-700">Chi tiết sản phẩm</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm whitespace-nowrap">
                                  <thead className="text-xs text-gray-500 uppercase border-b">
                                    <tr>
                                      <th className="pb-2 text-left">Sản phẩm</th>
                                      <th className="pb-2 text-right">Số lượng</th>
                                      <th className="pb-2 text-right">Đơn giá</th>
                                      <th className="pb-2 text-right">Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {s.items.map((item, idx) => (
                                      <tr key={idx} className="border-b last:border-0">
                                        <td className="py-2">{getProductName(item.productId)}</td>
                                        <td className="py-2 text-right">{item.quantity}</td>
                                        <td className="py-2 text-right">{item.price.toLocaleString()} đ</td>
                                        <td className="py-2 text-right font-medium">{item.total.toLocaleString()} đ</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">Không tìm thấy đơn hàng nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
