import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }
      result = await register(username, email, password);
    }

    setLoading(false);

    if (result.success) {
      // Close the auth modal
      onClose();
      
      // Ensure map tab is active
      const mapTab = document.querySelector('.nav-tabs button:first-child');
      if (mapTab) {
        mapTab.click();
      }
      
      // Show welcome toast
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          message: `🎉 Welcome to Eco Guardian! Explore environmental issues on the map.`,
          type: 'success'
        }
      });
      window.dispatchEvent(toastEvent);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>×</button>
        <div className="auth-logo">
          <i className="fas fa-leaf"></i>
        </div>
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Login to report environmental issues' : 'Join the movement to protect Sri Lanka'}
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="loading-spinner-small"></span>
            ) : (
              isLogin ? '🔐 Login' : '📝 Register'
            )}
          </button>
        </form>
        
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Create Account' : 'Login'}
          </button>
        </p>
        
      </div>
    </div>
  );
}

export default AuthModal;