/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Distributors from './pages/Distributors';
import Reports from './pages/Reports';
import SettingsInfo from './pages/SettingsInfo';
import SettingsBackup from './pages/SettingsBackup';
import SettingsLogs from './pages/SettingsLogs';
import UsersPage from './pages/Users';
import DebtsPage from './pages/Debts';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './AuthContext';

const AppContent = () => {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          
          {/* Sales role routes */}
          {(user.role === 'admin' || user.role === 'sales') && (
            <>
              <Route path="sales" element={<Sales />} />
              <Route path="debts" element={<DebtsPage />} />
              <Route path="customers" element={<Customers />} />
            </>
          )}

          {/* Warehouse role routes */}
          {(user.role === 'admin' || user.role === 'warehouse') && (
            <>
              <Route path="purchases" element={<Purchases />} />
              <Route path="distributors" element={<Distributors />} />
            </>
          )}

          {/* Shared routes */}
          <Route path="products" element={<Products />} />

          {/* Admin only routes */}
          {user.role === 'admin' && (
            <>
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings/info" element={<SettingsInfo />} />
              <Route path="settings/backup" element={<SettingsBackup />} />
              <Route path="settings/logs" element={<SettingsLogs />} />
              <Route path="settings" element={<Navigate to="/settings/info" replace />} />
            </>
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
