import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2, LayoutDashboard, FolderKanban, Package, Users, Settings, Mail, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Materials', path: '/materials', icon: Package },
    { label: 'Vendors', path: '/vendors', icon: Users },
    { label: 'Rules & Markups', path: '/rules', icon: Settings },
    { label: 'Templates', path: '/templates', icon: Mail },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'PRECONSTRUCTION_MANAGER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'ESTIMATOR':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold">GC Interface</span>
              </div>
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? 'secondary' : 'ghost'}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'flex items-center gap-2',
                        isActive && 'bg-secondary'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{user?.name}</span>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRoleBadgeColor(user?.role || ''))}>
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}