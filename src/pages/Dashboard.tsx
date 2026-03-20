import React, { useMemo } from 'react';
import { Company, Product, Customer, Sale, Purchase } from '../db';
import { supabase, useSupabaseQuery } from '../supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { Package, Users, ShoppingCart, Truck, AlertTriangle, FileText, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Lấy dữ liệu từ Supabase
  const companyData = useSupabaseQuery<Company[]>('company') || [];
  const company = companyData[0];
  const products = useSupabaseQuery<Product[]>('products') || [];
  const customers = useSupabaseQuery<Customer[]>('customers') || [];
  const sales = useSupabaseQuery<Sale[]>('sales') || [];
  const purchases = useSupabaseQuery<Purchase[]>('purchases') || [];

  // ... Giữ nguyên tất cả logic tính toán (lowStockProducts, todaySales,...) và phần return giao diện.