import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardList, Search, Download, BarChart2, Settings, LogOut, User } from 'lucide-react';
import uomLogo from '../assets/uom-logo.png';
import '../styles/AdminDashboard.css';
import '../styles/admin-tables.css';
import usePageTitle from '../utils/usePageTitle';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Programs', icon: GraduationCap },
  { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
  { to: '/admin/search', label: 'Search', icon: Search },
  { to: '/admin/download', label: 'Download', icon: Download },
  { to: '/admin/marks', label: 'Marks', icon: BarChart2 },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

// Admin header, tab bar, login check and logout shared by the admin pages.
// onClick is for pages that react to clicks anywhere on the page (Marks clears its
// selected row); clicks on the header and tabs then don't count.
function AdminLayout({ children, onClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  // "Admin · Search · UoM CSE Postgraduate": the tab that is active for this address
  const activeItem = NAV_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  usePageTitle(`Admin · ${activeItem?.label || 'Portal'}`);

  useEffect(() => {
    if (!localStorage.getItem('user')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const stopClick = onClick ? (event) => event.stopPropagation() : undefined;

  return (
    <div className="admin-app" onClick={onClick}>
      <a
        href="#main"
        className="skip-link"
        onClick={(event) => {
          // Focus the content without adding a #main history entry
          const main = document.getElementById('main');
          if (!main) return;
          event.preventDefault();
          main.focus();
        }}
      >
        Skip to main content
      </a>
      <header className="admin-header" onClick={stopClick}>
        <div className="admin-header-content">
          <div className="header-left">
            <img src={uomLogo} alt="" className="uom-logo" />
            <div className="header-text">
              <h1 className="university-name">University of Moratuwa</h1>
              <p className="portal-subtitle">Postgraduate Management Information System</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                <User size={20} color="white" />
              </div>
              <div className="user-details">
                <span className="user-role">Admin User</span>
                <span className="user-email">{user?.email || 'admin@uom.lk'}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-navbar" aria-label="Admin" onClick={stopClick}>
        <div className="navbar-content">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // Active on its own page and its sub-pages (e.g. one programme's applications)
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <button
                key={item.to}
                className={isActive ? 'navbar-btn active' : 'navbar-btn'}
                aria-current={isActive ? 'page' : undefined}
                onClick={pathname === item.to ? undefined : () => navigate(item.to)}
              >
                <Icon size={18} className="nav-icon" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}

export default AdminLayout;
