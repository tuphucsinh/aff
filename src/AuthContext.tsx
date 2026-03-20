import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, db, addLog } from './db';

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
        const users = await db.users.toArray();
        const adminUser = users.find(u => u.username === 'admin');
        if (!adminUser) {
          await db.users.add({
            username: 'admin',
            password: 'admin',
            name: 'Quản trị viên',
            role: 'admin'
          });
        } else if (adminUser.password === '123' && adminUser.id) {
          // Force update default admin password to 'admin' if it was '123'
          await db.users.update(adminUser.id, { password: 'admin' });
        }

        const storedUserId = sessionStorage.getItem('aff_user_id') || localStorage.getItem('aff_user_id');
        if (storedUserId) {
          const parsedId = Number(storedUserId);
          if (!isNaN(parsedId)) {
            const storedUser = await db.users.get(parsedId);
            if (storedUser) {
              setUser(storedUser);
            }
          } else {
            // Invalid ID (e.g. old Supabase UUID), clear it
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
      await addLog(user.username, 'Đăng xuất hệ thống');
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
