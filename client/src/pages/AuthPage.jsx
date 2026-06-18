import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser, loginUser } from '../api/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Eye, EyeOff, Ticket } from 'lucide-react';
import logo from '../assets/logo.png';

const AuthPage = ({ mode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('auth-page-active');
    return () => {
      document.body.classList.remove('auth-page-active');
    };
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await loginUser({ email: form.email, password: form.password });
      } else {
        if (form.name.trim().length < 2) {
          toast.error('Name must be at least 2 characters.');
          setLoading(false);
          return;
        }
        res = await registerUser(form);
      }
      login(res.data.token, res.data.user);
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left visual panel */}
      <div className="auth-visual">
        <div className="auth-visual-content">
          <Link to="/" className="auth-logo-link" style={{ display: 'inline-block', marginBottom: '28px' }}>
            <img src={logo} alt="SortMyScene" style={{ height: '35px', width: 'auto', display: 'block' }} />
          </Link>
          <h2 className="auth-visual-heading">
            Book front-row<br />seats to the<br /><em>moments</em><br />that matter.
          </h2>
          <p className="auth-visual-sub">
            Concerts, sports, theatre, conferences — every experience, one seamless platform.
          </p>
          <div className="auth-visual-stats">
            <div>
              <div className="auth-stat-value">4.2K<span style={{color:'var(--p-400)'}}>+</span></div>
              <div className="auth-stat-label">Events Live</div>
            </div>
            <div>
              <div className="auth-stat-value">98<span style={{color:'var(--p-400)'}}>%</span></div>
              <div className="auth-stat-label">Satisfaction</div>
            </div>
            <div>
              <div className="auth-stat-value">2M<span style={{color:'var(--p-400)'}}>+</span></div>
              <div className="auth-stat-label">Tickets Sold</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-header">
          <Link to="/" className="auth-mobile-logo" style={{ display: 'none', marginBottom: '24px' }}>
            <img src={logo} alt="SortMyScene" style={{ height: '30px', width: 'auto' }} />
          </Link>
          <div className="auth-eyebrow">
            {isLogin ? 'Welcome back' : 'Get started'}
          </div>
          <h1 className="auth-title">
            {isLogin ? 'Sign in to your\naccount' : 'Create your\naccount'}
          </h1>
          <p className="auth-sub" style={{marginTop: '8px'}}>
            {isLogin
              ? 'Enter your credentials to access your account.'
              : 'Join thousands of event-goers and start booking today.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div>
              <label className="field-label" htmlFor="auth-name">Full name</label>
              <div className="input-group">
                <User size={16} className="input-icon" />
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                  minLength={2}
                  className="auth-input"
                />
              </div>
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="auth-email">Email address</label>
            <div className="input-group">
              <Mail size={16} className="input-icon" />
              <input
                id="auth-email"
                name="email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="auth-password">Password</label>
            <div className="input-group">
              <Lock size={16} className="input-icon" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="auth-input"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <button
              id="auth-submit-btn"
              type="submit"
              className="btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading && <span className="spinner-sm" />}
              {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </div>

          <div className="auth-divider">or</div>

          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              id="auth-toggle-btn"
              type="button"
              className="auth-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setForm({ name: '', email: '', password: '' });
              }}
            >
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
