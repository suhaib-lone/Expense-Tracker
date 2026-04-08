import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet,
  LogOut,
  Sparkles,
  Menu,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { logout } from '../utils/auth';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userCreated, setUserCreated] = useState('');

  useEffect(() => {
    // Get user info from localStorage
    const userDataStr = sessionStorage.getItem('expense_user');
    console.log('User data from localStorage:', userDataStr); // Debug log
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        console.log('Parsed user data:', userData); // Debug log
        setUserName(userData.name || 'User');
        setUserEmail(userData.email || '');
        setUserPhone(userData.phone || '');
        setUserCreated(userData.created_at ? new Date(userData.created_at).toLocaleDateString() : '');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Expenses',
      path: '/expenses',
      icon: Receipt,
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      gradient: 'from-emerald-500 to-teal-500'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white w-64 z-40 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-400 to-cyan-400 p-2.5 rounded-xl">
              <Wallet className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                ExpenseAI
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Prophet Powered
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 border-b border-slate-700">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? `bg-gradient-to-r ${item.gradient} shadow-lg shadow-${item.gradient.split('-')[1]}-500/50`
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4">
          <button
            onClick={() => setShowAccountDetails(!showAccountDetails)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all"
          >
            <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-2.5 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">Account</p>
              <p className="text-xs text-slate-400">{showAccountDetails ? 'Hide details' : 'View details'}</p>
            </div>
          </button>

          {/* Account Details Dropdown */}
          {showAccountDetails && (
            <div className="mt-3 space-y-3">
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-4 h-4 text-violet-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-semibold truncate">{userName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm truncate">{userEmail || 'No email'}</p>
                  </div>
                </div>
                
                {userPhone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-cyan-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm">{userPhone}</p>
                    </div>
                  </div>
                )}
                
                {userCreated && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Member Since</p>
                      <p className="text-sm">{userCreated}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button - appears when details are shown */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Spacer to prevent content being hidden behind bottom area */}
        <div className="h-20"></div>
      </div>
    </>
  );
}
