import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Truck, 
  BarChart3, 
  Settings,
  Building2,
  UserCog,
  FileText,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from './ui';
import { useAuth } from '../AuthContext';

type NavItem = {
  name: string;
  href?: string;
  icon: React.ElementType;
  roles: string[];
  subItems?: { name: string; href: string }[];
};

const navItems: NavItem[] = [
  { name: 'Tổng quan', href: '/', icon: LayoutDashboard, roles: ['admin', 'sales', 'warehouse'] },
  { name: 'Bán hàng', href: '/sales', icon: ShoppingCart, roles: ['admin', 'sales'] },
  { name: 'Công nợ', href: '/debts', icon: FileText, roles: ['admin', 'sales'] },
  { name: 'Nhập hàng', href: '/purchases', icon: Truck, roles: ['admin', 'warehouse'] },
  { name: 'Sản phẩm & Kho', href: '/products', icon: Package, roles: ['admin', 'sales', 'warehouse'] },
  { name: 'Khách hàng', href: '/customers', icon: Users, roles: ['admin', 'sales'] },
  { name: 'Nhà phân phối', href: '/distributors', icon: Building2, roles: ['admin', 'warehouse'] },
  { name: 'Báo cáo', href: '/reports', icon: BarChart3, roles: ['admin'] },
  { name: 'Nhân viên', href: '/users', icon: UserCog, roles: ['admin'] },
  { 
    name: 'Cài đặt', 
    icon: Settings, 
    roles: ['admin'],
    subItems: [
      { name: 'Thông tin', href: '/settings/info' },
      { name: 'Sao lưu & Phục hồi', href: '/settings/backup' },
      { name: 'Nhật ký hoạt động', href: '/settings/logs' }
    ]
  },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Cài đặt': location.pathname.startsWith('/settings')
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const visibleNavItems = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-gray-100 print:h-auto print:bg-white">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 print:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">AFF Manager</h1>
          <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={closeMobileMenu}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {visibleNavItems.map((item) => {
              if (item.subItems) {
                const isExpanded = expandedMenus[item.name];
                const isActive = item.subItems.some(sub => location.pathname === sub.href);
                return (
                  <li key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive && !isExpanded
                          ? "bg-blue-50 text-blue-700" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-blue-700" : "text-gray-400")} />
                        {item.name}
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {isExpanded && (
                      <ul className="pl-10 space-y-1">
                        {item.subItems.map(subItem => (
                          <li key={subItem.name}>
                            <Link
                              to={subItem.href}
                              onClick={closeMobileMenu}
                              className={cn(
                                "block px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                location.pathname === subItem.href
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              )}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href!}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive 
                        ? "bg-blue-50 text-blue-700" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-blue-700" : "text-gray-400")} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 print:hidden">
          <button 
            className="mr-4 md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 truncate">
            {navItems.flatMap(i => i.subItems ? i.subItems : [{ name: i.name, href: i.href || '' }]).find(item => item.href === location.pathname)?.name || 'AFF Manager'}
          </h2>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
