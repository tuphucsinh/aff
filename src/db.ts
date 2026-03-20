import Dexie, { Table } from 'dexie';

export interface Company {
  id?: number;
  name: string;
  address: string;
  phone: string;
  taxId: string;
  logo: string; // base64
}

export interface Distributor {
  id?: number;
  name: string;
  address: string;
  phone: string;
}

export interface Customer {
  id?: number;
  name: string;
  type: 'sỉ' | 'lẻ';
  region: string;
  address: string;
  phone: string;
}

export interface Product {
  id?: number;
  name: string;
  sku: string;
  unit: string;
  minStock: number;
  currentStock: number;
}

export interface PurchaseItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface Purchase {
  id?: number;
  purchaseCode?: string;
  date: string;
  distributorId: number;
  items: PurchaseItem[];
  total: number;
}

export interface SaleItem {
  productId: number;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id?: number;
  orderCode: string;
  date: string;
  customerId: number;
  items: SaleItem[];
  totalAmount: number;
  status: 'đã thanh toán' | 'chưa thanh toán';
  expectedPaymentDate?: string;
  paymentDate?: string;
}

export interface User {
  id?: number;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'sales' | 'warehouse';
}

export interface Log {
  id?: number;
  timestamp: string;
  username: string;
  action: string;
}

export class AFFDatabase extends Dexie {
  company!: Table<Company>;
  distributors!: Table<Distributor>;
  customers!: Table<Customer>;
  products!: Table<Product>;
  purchases!: Table<Purchase>;
  sales!: Table<Sale>;
  users!: Table<User>;
  logs!: Table<Log>;

  constructor() {
    super('AFFDatabase_v2');
    this.version(1).stores({
      company: '++id',
      distributors: '++id, name',
      customers: '++id, name, region',
      products: '++id, name, sku',
      purchases: '++id, date, distributorId',
      sales: '++id, date, customerId, status',
      users: '++id, username',
      logs: '++id, timestamp, username'
    });
    this.version(2).stores({
      company: '++id',
      distributors: '++id, name',
      customers: '++id, name, region',
      products: '++id, name, sku',
      purchases: '++id, date, distributorId',
      sales: '++id, date, customerId, status',
      users: '++id, username',
      logs: '++id, timestamp, username'
    });
  }
}

export const db = new AFFDatabase();

export const addLog = async (username: string, action: string) => {
  try {
    await db.logs.add({
      timestamp: new Date().toISOString(),
      username,
      action
    });
  } catch (error) {
    console.error('Failed to add log', error);
  }
};
