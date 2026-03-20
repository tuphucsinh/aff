import React, { useState, useMemo } from 'react';
import { Sale, Customer, Product } from '../db';
import { supabase, useSupabaseQuery } from '../supabase';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { format, isPast, isToday } from 'date-fns';
import { useAuth } from '../AuthContext';

export default function Debts() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [confirmSale, setConfirmSale] = useState<Sale | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  
  // Thay thế Dexie bằng Supabase
  const allSales = useSupabaseQuery<Sale[]>('sales') || [];
  const customers = useSupabaseQuery<Customer[]>('customers') || [];
  const products = useSupabaseQuery<Product[]>('products') || [];

  const handlePay = async () => {
    if (confirmSale && confirmSale.id) {
      // Cập nhật trạng thái thanh toán lên Supabase
      const { error } = await supabase.from('sales').update({ 
        status: 'đã thanh toán',
        paymentDate: new Date().toISOString()
      }).eq('id', confirmSale.id);

      if (error) {
        alert('Lỗi khi thanh toán: ' + error.message);
        return;
      }

      if (user) {
        await supabase.from('logs').insert([{ 
          timestamp: new Date().toISOString(), 
          username: user.username, 
          action: `Xác nhận thanh toán đơn hàng ${confirmSale.orderCode}` 
        }]);
      }

      setConfirmSale(null);
      setSuccessMessage('Đã cập nhật trạng thái thanh toán!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const getCustomerName = (id: number) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getCustomerPhone = (id: number) => customers.find(c => c.id === id)?.phone || '';
  const getProductName = (id: number) => products.find(p => p.id === id)?.name || 'Unknown';

  const toggleExpand = (id: number) => {
    if (expandedOrderId === id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(id);
    }
  };

  const debtList = useMemo(() => {
    const filteredSales = allSales.filter(sale => {
      if (activeTab === 'unpaid') return sale.status === 'chưa thanh toán';
      return sale.status === 'đã thanh toán' && sale.paymentDate;
    });

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
    }, {} as Record<number, { customerId: number, totalDebt: number, orders: Sale[] }>);

    return Object.values(debtsByCustomer).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [allSales, activeTab]);

  // Giữ nguyên phần return (<div... trở xuống)