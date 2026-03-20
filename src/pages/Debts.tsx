import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Sale, addLog, Customer, Product } from '../db';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { format, isPast, isToday } from 'date-fns';
import { useAuth } from '../AuthContext';

export default function Debts() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [confirmSale, setConfirmSale] = useState<Sale | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  
  const allSales = useLiveQuery(() => db.sales.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const handlePay = async () => {
    if (confirmSale && confirmSale.id) {
      await db.sales.update(confirmSale.id, { 
        status: 'đã thanh toán',
        paymentDate: new Date().toISOString()
      });
      if (user) await addLog(user.username, `Xác nhận thanh toán đơn hàng ${confirmSale.orderCode}`);
      setConfirmSale(null);
      setSuccessMessage('Đã cập nhật trạng thái thanh toán!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const getCustomerName = (id: number) => customers?.find(c => c.id === id)?.name || 'Unknown';
  const getCustomerPhone = (id: number) => customers?.find(c => c.id === id)?.phone || '';
  const getProductName = (id: number) => products?.find(p => p.id === id)?.name || 'Unknown';

  const toggleExpand = (id: number) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  const debtList = useMemo(() => {
    const filteredSales = allSales?.filter(sale => {
      if (activeTab === 'unpaid') return sale.status === 'chưa thanh toán';
      return sale.status === 'đã thanh toán' && sale.paymentDate;
    }) || [];

    const debtsByCustomer = filteredSales.reduce((acc, sale) => {
      if (!acc[sale.customerId]) {
        acc[sale.customerId] = {
          customerId: sale.customerId,
          totalDebt: 0,
          orders: []
        };
      }
      acc[sale.customerId].totalDebt += sale.totalAmount;
      acc[sale.customerId].orders.push(sale);
      return acc;
    }, {} as Record<number, { customerId: number, totalDebt: number, orders: Sale[] }>) || {};

    return Object.values(debtsByCustomer).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [allSales, activeTab]);

  return (
    <div className="space-y-6 relative">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50 transition-opacity">
          {successMessage}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Xác nhận thanh toán</h3>
            <p className="mb-6 text-gray-600">
              Xác nhận khách hàng đã thanh toán đơn hàng <span className="font-bold text-gray-800">{confirmSale.orderCode}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setConfirmSale(null)}>Hủy</Button>
              <Button variant="default" onClick={handlePay}>Xác nhận</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Quản lý Công nợ</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button 
            variant={activeTab === 'unpaid' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('unpaid')}
            className="flex-1 sm:flex-none"
          >
            Chưa thu
          </Button>
          <Button 
            variant={activeTab === 'paid' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('paid')}
            className="flex-1 sm:flex-none"
          >
            Đã thu
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {debtList.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-500">
              {activeTab === 'unpaid' ? 'Không có công nợ nào cần thu.' : 'Chưa có công nợ nào đã thu.'}
            </CardContent>
          </Card>
        ) : (
          debtList.map(customerDebt => (
            <Card key={customerDebt.customerId} className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-lg text-blue-800">
                      {getCustomerName(customerDebt.customerId)}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">SĐT: {getCustomerPhone(customerDebt.customerId)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500">{activeTab === 'unpaid' ? 'Tổng nợ' : 'Tổng đã thu'}</p>
                    <p className={`text-2xl font-bold ${activeTab === 'unpaid' ? 'text-red-600' : 'text-green-600'}`}>
                      {customerDebt.totalDebt.toLocaleString()} đ
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-gray-700 uppercase bg-white border-b">
                    <tr>
                      <th className="px-6 py-3">Mã đơn hàng</th>
                      <th className="px-6 py-3">Ngày phát sinh</th>
                      {activeTab === 'unpaid' ? (
                        <th className="px-6 py-3">Dự kiến thanh toán</th>
                      ) : (
                        <th className="px-6 py-3">Ngày thanh toán</th>
                      )}
                      <th className="px-6 py-3 text-right">Số tiền</th>
                      {activeTab === 'unpaid' && <th className="px-6 py-3 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {customerDebt.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => {
                      const expectedDate = order.expectedPaymentDate ? new Date(order.expectedPaymentDate) : null;
                      const isOverdue = expectedDate && isPast(expectedDate) && !isToday(expectedDate);

                      return (
                        <React.Fragment key={order.id}>
                          <tr className="bg-white border-b hover:bg-gray-50">
                            <td 
                              className="px-6 py-4 font-medium text-blue-600 cursor-pointer hover:underline"
                              onClick={() => toggleExpand(order.id!)}
                            >
                              {order.orderCode}
                            </td>
                            <td className="px-6 py-4">{format(new Date(order.date), 'dd/MM/yyyy')}</td>
                            
                            {activeTab === 'unpaid' ? (
                              <td className="px-6 py-4">
                                {expectedDate ? (
                                  <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                                    {format(expectedDate, 'dd/MM/yyyy')}
                                    {isOverdue && ' (Quá hạn)'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Chưa hẹn</span>
                                )}
                              </td>
                            ) : (
                              <td className="px-6 py-4 text-green-600 font-medium">
                                {order.paymentDate ? format(new Date(order.paymentDate), 'dd/MM/yyyy HH:mm') : ''}
                              </td>
                            )}

                            <td className={`px-6 py-4 text-right font-medium ${activeTab === 'unpaid' ? 'text-red-600' : 'text-green-600'}`}>
                              {order.totalAmount.toLocaleString()} đ
                            </td>
                            
                            {activeTab === 'unpaid' && (
                              <td className="px-6 py-4 text-right">
                                <Button variant="default" size="sm" onClick={() => setConfirmSale(order)}>
                                  Xác nhận đã thu
                                </Button>
                              </td>
                            )}
                          </tr>
                          {expandedOrderId === order.id && (
                            <tr className="bg-gray-50 border-b">
                              <td colSpan={activeTab === 'unpaid' ? 5 : 4} className="px-6 py-4">
                                <div className="bg-white p-4 rounded border shadow-sm">
                                  <h4 className="font-semibold mb-2 text-gray-700">Chi tiết sản phẩm</h4>
                                  <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-500 uppercase border-b">
                                      <tr>
                                        <th className="pb-2 text-left">Sản phẩm</th>
                                        <th className="pb-2 text-right">Số lượng</th>
                                        <th className="pb-2 text-right">Đơn giá</th>
                                        <th className="pb-2 text-right">Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.items.map((item, idx) => (
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
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
