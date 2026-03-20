import React, { useMemo } from 'react';
import { useSupabaseQuery } from '../supabase';
import { Company, Product, Customer, Sale, Purchase } from '../db';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { Package, Users, ShoppingCart, Truck, AlertTriangle, FileText, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const company = useSupabaseQuery<Company>('company', q => q.limit(1).maybeSingle());
  const products = useSupabaseQuery<Product[]>('products');
  const customers = useSupabaseQuery<Customer[]>('customers');
  const sales = useSupabaseQuery<Sale[]>('sales');
  const purchases = useSupabaseQuery<Purchase[]>('purchases');

  const lowStockProducts = useMemo(() => products?.filter(p => p.currentStock < p.minStock) || [], [products]);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const todaySales = useMemo(() => sales?.filter(s => s.date === todayStr) || [], [sales, todayStr]);
  const todayRevenue = useMemo(() => todaySales.reduce((sum, s) => sum + s.totalAmount, 0), [todaySales]);

  const thisMonthRevenue = useMemo(() => {
    if (!sales) return 0;
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return sales
      .filter(s => isWithinInterval(new Date(s.date), { start, end }))
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const totalDebt = useMemo(() => {
    if (!sales) return 0;
    return sales
      .filter(s => s.status === 'chưa thanh toán')
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const todayPurchasesCount = useMemo(() => {
    if (!purchases) return 0;
    return purchases.filter(p => p.date === todayStr).length;
  }, [purchases, todayStr]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Xin chào, {user?.name || 'Quản trị viên'}</h2>
          <p className="text-gray-500">Tổng quan hoạt động kinh doanh hôm nay</p>
        </div>
        {company?.logo && (
          <img src={company.logo} alt="Company Logo" className="h-12 object-contain" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Doanh thu hôm nay</p>
              <h3 className="text-2xl font-bold text-gray-900">{todayRevenue.toLocaleString()} đ</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Doanh thu tháng này</p>
              <h3 className="text-2xl font-bold text-gray-900">{thisMonthRevenue.toLocaleString()} đ</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tổng công nợ</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalDebt.toLocaleString()} đ</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phiếu nhập hôm nay</p>
              <h3 className="text-2xl font-bold text-gray-900">{todayPurchasesCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Cảnh báo tồn kho thấp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <ul className="space-y-3">
                {lowStockProducts.map(p => (
                  <li key={p.id} className="flex justify-between items-center p-3 bg-red-50 rounded-md border border-red-100">
                    <div>
                      <span className="font-medium text-red-900">{p.name}</span>
                      <span className="text-sm text-red-600 ml-2">({p.sku})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-700">Tồn: {p.currentStock} {p.unit}</div>
                      <div className="text-xs text-red-500">Tối thiểu: {p.minStock}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">Tất cả sản phẩm đều đủ tồn kho</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng mới nhất hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySales.length > 0 ? (
              <ul className="space-y-3">
                {todaySales.slice(0, 5).map(s => (
                  <li key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-100">
                    <div>
                      <span className="font-medium text-blue-600">{s.orderCode}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {customers?.find(c => c.id === s.customerId)?.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{s.totalAmount.toLocaleString()} đ</div>
                      <div className={`text-xs ${s.status === 'đã thanh toán' ? 'text-green-600' : 'text-red-600'}`}>
                        {s.status}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có đơn hàng nào hôm nay</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
