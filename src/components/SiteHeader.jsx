import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import uomLogo from '../assets/uom-logo.png';

// Maroon header shared by the public pages.
function SiteHeader({ subtitle = 'Postgraduate Management Information System', showAdminLogin = false }) {
  const navigate = useNavigate();

  // Focus the page content without changing the URL: following "#main" adds a history entry
  // without the router state, and the application form then loses its programme.
  const skipToMain = (event) => {
    const main = document.getElementById('main');
    if (!main) return;
    event.preventDefault();
    main.focus();
  };

  return (
    <header className="header">
      <a href="#main" className="skip-link" onClick={skipToMain}>Skip to main content</a>
      <div className="header-content">
        <Link to="/" className="header-brand">
          {/* alt="" because the university name is visible text in the same link */}
          <img src={uomLogo} alt="" className="uom-logo" />
          <span className="header-text">
            <span className="university-name">University of Moratuwa</span>
            <span className="portal-subtitle">{subtitle}</span>
          </span>
        </Link>

        {showAdminLogin && (
          <button
            type="button"
            className="admin-login-btn"
            onClick={() => navigate('/login')}
            aria-label="Admin login"
          >
            <LogIn size={16} strokeWidth={2.5} aria-hidden="true" />
            <span className="admin-login-label">Admin Login</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default SiteHeader;
