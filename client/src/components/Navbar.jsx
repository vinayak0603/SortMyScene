import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, LogOut, LogIn, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === '/auth') {
    return null;
  }

  const handleLogout = () => {
    logout();
    toast.success('Signed out.');
    navigate('/auth');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand" id="nav-brand">
            <img src={logo} alt="SortMyScene" style={{ height: '30px', width: 'auto', display: 'block' }} />
          </Link>

          <div className="navbar-actions desktop-only">
            {user ? (
              <>
                <Link
                  to="/my-tickets"
                  id="my-tickets-btn"
                  className="btn-ghost"
                  style={{ color: 'var(--p-300)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Ticket size={15} />
                  My Tickets
                </Link>
                <div className="navbar-user">
                  <div className="navbar-user-avatar">{initials}</div>
                  <span className="navbar-user-name">{user.name.split(' ')[0]}</span>
                </div>
                <button
                  id="logout-btn"
                  className="btn-ghost"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </>
            ) : (
              <button
                id="login-btn"
                className="btn-primary btn-sm"
                onClick={() => navigate('/auth')}
              >
                <LogIn size={14} />
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link
          to="/"
          className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}
          id="mobile-nav-home"
        >
          <Compass size={20} />
          <span>Explore</span>
        </Link>
        
        {user ? (
          <>
            <Link
              to="/my-tickets"
              className={`mobile-nav-item ${pathname === '/my-tickets' ? 'active' : ''}`}
              id="mobile-nav-tickets"
            >
              <Ticket size={20} />
              <span>Tickets</span>
            </Link>
            <div className="mobile-nav-item mobile-profile-item">
              <div className="navbar-user-avatar" style={{ width: '20px', height: '20px', fontSize: '0.65rem', marginBottom: '2px' }}>
                {initials}
              </div>
              <span>{user.name.split(' ')[0]}</span>
            </div>
            <button
              onClick={handleLogout}
              className="mobile-nav-item"
              id="mobile-nav-logout"
            >
              <LogOut size={20} />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className={`mobile-nav-item ${pathname === '/auth' ? 'active' : ''}`}
            id="mobile-nav-login"
          >
            <LogIn size={20} />
            <span>Sign in</span>
          </Link>
        )}
      </nav>
    </>
  );
};

export default Navbar;
