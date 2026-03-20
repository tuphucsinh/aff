import { supabase, notifyTableChange } from './supabase';

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

class SupabaseTable<T> {
  constructor(public tableName: string) {}

  async toArray(): Promise<T[]> {
    const { data, error } = await supabase.from(this.tableName).select('*');
    if (error) console.error(error);
    return data || [];
  }

  async add(item: T): Promise<any> {
    const { data, error } = await supabase.from(this.tableName).insert(item).select().single();
    if (error) console.error(error);
    notifyTableChange(this.tableName);
    return data?.id;
  }

  async update(id: number, item: Partial<T>): Promise<any> {
    const { error } = await supabase.from(this.tableName).update(item).eq('id', id);
    if (error) console.error(error);
    notifyTableChange(this.tableName);
  }

  async delete(id: number): Promise<any> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) console.error(error);
    notifyTableChange(this.tableName);
  }

  async get(id: number): Promise<T | undefined> {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') console.error(error);
    return data || undefined;
  }

  async clear(): Promise<any> {
    const { error } = await supabase.from(this.tableName).delete().neq('id', 0);
    if (error) console.error(error);
    notifyTableChange(this.tableName);
  }

  async bulkAdd(items: T[]): Promise<any> {
    const { error } = await supabase.from(this.tableName).insert(items);
    if (error) console.error(error);
    notifyTableChange(this.tableName);
  }

  where(field: string) {
    return {
      equals: (value: any) => {
        return {
          first: async () => {
            const { data, error } = await supabase.from(this.tableName).select('*').eq(field, value).limit(1).single();
            if (error && error.code !== 'PGRST116') console.error(error);
            return data || undefined;
          },
          toArray: async () => {
            const { data, error } = await supabase.from(this.tableName).select('*').eq(field, value);
            if (error) console.error(error);
            return data || [];
          }
        };
      }
    };
  }

  orderBy(field: string) {
    return {
      reverse: () => {
        return {
          limit: (n: number) => {
            return {
              toArray: async () => {
                const { data, error } = await supabase.from(this.tableName).select('*').order(field, { ascending: false }).limit(n);
                if (error) console.error(error);
                return data || [];
              }
            };
          }
        };
      }
    };
  }

  toCollection() {
    return {
      first: async () => {
        const { data, error } = await supabase.from(this.tableName).select('*').limit(1).single();
        if (error && error.code !== 'PGRST116') console.error(error);
        return data || undefined;
      }
    };
  }

  async count(): Promise<number> {
    const { count, error } = await supabase.from(this.tableName).select('*', { count: 'exact', head: true });
    if (error) console.error(error);
    return count || 0;
  }
}

export const db = {
  company: new SupabaseTable<Company>('company'),
  distributors: new SupabaseTable<Distributor>('distributors'),
  customers: new SupabaseTable<Customer>('customers'),
  products: new SupabaseTable<Product>('products'),
  purchases: new SupabaseTable<Purchase>('purchases'),
  sales: new SupabaseTable<Sale>('sales'),
  users: new SupabaseTable<User>('users'),
  logs: new SupabaseTable<Log>('logs'),
  transaction: async (mode: string, ...args: any[]) => {
    // Supabase doesn't support client-side transactions across tables easily.
    // We will just execute the callback sequentially.
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      await callback();
    }
  }
};

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
