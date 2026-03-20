import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './db';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  login: (user: User, rememberMe: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: users } = await supabase.from('users').select('*');
        const adminUser = users?.find(u => u.username === 'admin');
        
        if (!adminUser) {
          await supabase.from('users').insert([{
            username: 'admin',
            password: 'admin',
            name: 'Quản trị viên',
            role: 'admin'
          }]);
        } else if (adminUser.password === '123' && adminUser.id) {
          await supabase.from('users').update({ password: 'admin' }).eq('id', adminUser.id);
        }

        const storedUserId = sessionStorage.getItem('aff_user_id') || localStorage.getItem('aff_user_id');
        if (storedUserId) {
          const parsedId = Number(storedUserId);
          if (!isNaN(parsedId)) {
            const { data: storedUser } = await supabase.from('users').select('*').eq('id', parsedId).single();
            if (storedUser) {
              setUser(storedUser as User);
            }
          } else {
            sessionStorage.removeItem('aff_user_id');
            localStorage.removeItem('aff_user_id');
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = (u: User, rememberMe: boolean) => {
    setUser(u);
    if (u.id) {
      if (rememberMe) {
        localStorage.setItem('aff_user_id', u.id.toString());
        sessionStorage.removeItem('aff_user_id');
      } else {
        sessionStorage.setItem('aff_user_id', u.id.toString());
        localStorage.removeItem('aff_user_id');
      }
    }
  };

  const logout = async () => {
    if (user) {
      await supabase.from('logs').insert([{ timestamp: new Date().toISOString(), username: user.username, action: 'Đăng xuất hệ thống' }]);
    }
    setUser(null);
    localStorage.removeItem('aff_user_id');
    sessionStorage.removeItem('aff_user_id');
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};