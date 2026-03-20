import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../supabase';
import { db, Sale, Purchase, Customer, Product } from '../db';
import { Card, CardContent, CardHeader, CardTitle, Select, Button, Input, Label } from '../components/ui';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Printer } from 'lucide-react';

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [productFilter, setProductFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');

  const sales = useSupabaseQuery<Sale[]>('sales');
  const purchases = useSupabaseQuery<Purchase[]>('purchases');
  const customers = useSupabaseQuery<Customer[]>('customers');
  const products = useSupabaseQuery<Product[]>('products');

  const regions = useMemo(() => {
    if (!customers) return [];
    const uniqueRegions = new Set(customers.map(c => c.region).filter(Boolean));
    return Array.from(uniqueRegions);
  }, [customers]);

  const { filteredSales, filteredPurchases } = useMemo(() => {
    if (!sales || !purchases || !customers) return { filteredSales: [], filteredPurchases: [] };

    const now = new Date();
    let start, end;

    if (dateFilter === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (dateFilter === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (dateFilter === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (dateFilter === 'year') {
      start = startOfYear(now);
      end = endOfYear(now);
    } else {
      start = startOfDay(parseISO(startDate));
      end = endOfDay(parseISO(endDate));
    }

    let fSales = sales.filter(s => {
      const date = new Date(s.date);
      return isWithinInterval(date, { start, end });
    });

    let fPurchases = purchases.filter(p => {
      const date = new Date(p.date);
      return isWithinInterval(date, { start, end });
    });

    // Filter by product
    if (productFilter !== 'all') {
      const productId = Number(productFilter);
      fSales = fSales.filter(s => s.items.some(item => item.productId === productId));
      fPurchases = fPurchases.filter(p => p.items.some(item => item.productId === productId));
    }

    // Filter by region
    if (regionFilter !== 'all') {
      const customerIdsInRegion = customers.filter(c => c.region === regionFilter).map(c => c.id);
      fSales = fSales.filter(s => customerIdsInRegion.includes(s.customerId));
      // Purchases don't have regions in this context, but we can leave it as is or filter if needed.
    }

    // Filter by customer type
    if (customerTypeFilter !== 'all') {
      const customerIdsWithType = customers.filter(c => c.type === customerTypeFilter).map(c => c.id);
      fSales = fSales.filter(s => customerIdsWithType.includes(s.customerId));
    }

    return { filteredSales: fSales, filteredPurchases: fPurchases };
  }, [sales, purchases, customers, dateFilter, startDate, endDate, productFilter, regionFilter, customerTypeFilter]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalDebt = filteredSales.filter(s => s.status === 'chưa thanh toán').reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);

  // Prepare chart data
  const chartData = [
    {
      name: 'Thống kê',
      'Doanh thu': totalRevenue,
      'Nhập hàng': totalPurchases,
      'Công nợ': totalDebt,
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold">Báo cáo & Thống kê</h2>
        <Button onClick={() => window.print()} className="flex items-center w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" />
          In Báo Cáo
        </Button>
      </div>

      <div className="hidden print:block mb-6">
        <h2 className="text-2xl font-bold text-center">BÁO CÁO THỐNG KÊ</h2>
        <p className="text-center text-gray-600 mt-2">
          {dateFilter === 'today' ? 'Hôm nay' : 
           dateFilter === 'week' ? 'Tuần này' : 
           dateFilter === 'month' ? 'Tháng này' : 
           dateFilter === 'year' ? 'Năm nay' : 
           `Từ ${format(parseISO(startDate), 'dd/MM/yyyy')} đến ${format(parseISO(endDate), 'dd/MM/yyyy')}`}
        </p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Thời gian</Label>
              <Select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}>
                <option value="today">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
                <option value="custom">Tùy chọn</option>
              </Select>
            </div>
            
            {dateFilter === 'custom' && (
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
              <Label>Sản phẩm</Label>
              <Select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                <option value="all">Tất cả sản phẩm</option>
                {products?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Tổng doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{totalRevenue.toLocaleString()} đ</div>
            <p className="text-xs text-blue-600 mt-1">{filteredSales.length} đơn hàng</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Công nợ (Chưa thanh toán)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{totalDebt.toLocaleString()} đ</div>
            <p className="text-xs text-red-600 mt-1">
              {filteredSales.filter(s => s.status === 'chưa thanh toán').length} đơn hàng
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Tổng chi nhập hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{totalPurchases.toLocaleString()} đ</div>
            <p className="text-xs text-green-600 mt-1">{filteredPurchases.length} phiếu nhập</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ tổng quan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} đ`} />
                <Legend />
                <Bar dataKey="Doanh thu" fill="#3b82f6" />
                <Bar dataKey="Nhập hàng" fill="#22c55e" />
                <Bar dataKey="Công nợ" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết công nợ khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Số điện thoại</th>
                <th className="px-6 py-3">Khu vực</th>
                <th className="px-6 py-3 text-right">Tổng nợ</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map(c => {
                const customerDebt = sales?.filter(s => s.customerId === c.id && s.status === 'chưa thanh toán')
                  .reduce((sum, s) => sum + s.totalAmount, 0) || 0;
                
                if (customerDebt === 0) return null;
                if (regionFilter !== 'all' && c.region !== regionFilter) return null;
                if (customerTypeFilter !== 'all' && c.type !== customerTypeFilter) return null;

                return (
                  <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4">{c.phone}</td>
                    <td className="px-6 py-4">{c.region}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">{customerDebt.toLocaleString()} đ</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
