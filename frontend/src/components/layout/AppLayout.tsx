import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, Package, ShoppingCart, Truck,
  Receipt, TrendingDown, TrendingUp, BarChart3, UserCog, Bell, Settings,
  Menu, X, Moon, Sun, LogOut, Search, Store,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore, UserRole } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATOR', 'CASHIER', 'STORE_MANAGER'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'OPERATOR'] },
  { to: '/services', label: 'E-Services', icon: Briefcase, roles: ['ADMIN', 'OPERATOR'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER'] },
  { to: '/inventory', label: 'Inventory', icon: Store, roles: ['ADMIN', 'STORE_MANAGER'] },
  { to: '/pos', label: 'POS Billing', icon: ShoppingCart, roles: ['ADMIN', 'CASHIER'] },
  { to: '/purchases', label: 'Purchases', icon: Truck, roles: ['ADMIN', 'STORE_MANAGER'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'STORE_MANAGER'] },
  { to: '/expenses', label: 'Expenses', icon: TrendingDown, roles: ['ADMIN'] },
  { to: '/income', label: 'Income', icon: TrendingUp, roles: ['ADMIN'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN'] },
  { to: '/employees', label: 'Employees', icon: UserCog, roles: ['ADMIN'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'OPERATOR', 'CASHIER', 'STORE_MANAGER'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasRole } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const filteredNav = navItems.filter((item) => hasRole(...item.roles));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center border-b px-4">
          <div>
            <h1 className="text-lg font-bold text-primary">Yoga Infotech</h1>
            <p className="text-xs text-muted-foreground">E-Service Center</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-card/95 px-4 backdrop-blur">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Global search..."
              className="h-9 w-full max-w-sm rounded-md border bg-background pl-9 pr-3 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/search?q=${(e.target as HTMLInputElement).value}`);
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
