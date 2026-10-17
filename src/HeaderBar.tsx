import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';
import MobileMenu from './MobileMenu';
import { useAppStore } from './store';
import { useDialogA11y } from './useDialogA11y';
import { authApi, getApiErrorMessage } from './api';

interface HeaderBarProps {
  variant?: 'hero' | 'standard';
}

export default function HeaderBar({ variant = 'standard' }: HeaderBarProps) {
  const { currentUser, setCurrentUser, clearPrivateData, notifyError } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const logoutDialogRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  React.useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  React.useEffect(() => {
    const closeOnDesktop = () => { if (window.innerWidth >= 1280) setMenuOpen(false); };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, []);

  useDialogA11y(logoutOpen, logoutDialogRef, () => setLogoutOpen(false));
  React.useEffect(() => {
    const openProfileLogout = () => setLogoutOpen(true);
    window.addEventListener('petlove:profile-logout', openProfileLogout);
    return () => window.removeEventListener('petlove:profile-logout', openProfileLogout);
  }, []);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await authApi.signOut();
    } catch (error) {
      const message = getApiErrorMessage(error, 'The server could not close the session, but this device has been logged out.');
      setLogoutError(message);
      notifyError(message);
    } finally {
      navigate('/home', { replace: true });
      setLogoutOpen(false);
      setMenuOpen(false);
      window.setTimeout(() => {
        setCurrentUser(null);
        clearPrivateData();
      }, 0);
    }
  };

  const isHero = variant === 'hero';

  return (
    <header className={`pet-header ${isHero ? 'header-hero-mode' : 'header-standard-mode'}`}>
      <div className="header-inner">
        <Link to="/home" className="site-brand" aria-label="Petlove homepage">
          <span>petl</span><Icon name="heart-circle" width="23" height="23" className="brand-heart" /><span>ve</span>
        </Link>
        <nav className="desktop-nav-pills" aria-label="Primary navigation">
          <NavLink
            to="/news"
            className={({ isActive }) => `nav-link-pill ${isActive ? 'pill-active' : ''}`}
          >
            News
          </NavLink>
          <NavLink
            to="/notices"
            className={({ isActive }) => `nav-link-pill ${isActive ? 'pill-active' : ''}`}
          >
            Find pet
          </NavLink>
          <NavLink
            to="/friends"
            className={({ isActive }) => `nav-link-pill ${isActive ? 'pill-active' : ''}`}
          >
            Our friends
          </NavLink>
        </nav>
        <div className={`desktop-auth-actions${currentUser ? ' signed-in-actions' : ''}`}>
          {currentUser ? (
            <div className="logged-user-cluster">
              <Link to="/profile" className="user-profile-chip" title="View profile">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="user-chip-avatar" />
                ) : (
                  <Icon name="profile-user" width="50" height="50" className="user-chip-avatar" />
                )}
                <span className="user-chip-name">{currentUser.name.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="header-logout"
                aria-label="Log out of account"
              >
                LOG OUT
              </button>
            </div>
          ) : (
            <div className="guest-action-cluster">
              <Link to="/login" className="btn-auth-solid">
                LOG IN
              </Link>
              <Link to="/register" className="btn-auth-outline">
                REGISTRATION
              </Link>
            </div>
          )}
        </div>
        {currentUser && (
          <Link to="/profile" className="mobile-user-link" aria-label="View profile">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="mobile-user-avatar" />
            ) : (
              <Icon name="profile-user" width="50" height="50" className="mobile-user-avatar" />
            )}
          </Link>
        )}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <Icon name="menu-mobile" className="menu-icon-mobile" />
          <Icon name="menu-tablet" className="menu-icon-tablet" />
        </button>
      </div>
      {menuOpen && <MobileMenu white={isHero} signedIn={Boolean(currentUser)} onClose={() => setMenuOpen(false)} onLogout={() => setLogoutOpen(true)} />}

      {logoutOpen && (
        <div className="modal-dialog-overlay" onClick={() => setLogoutOpen(false)}>
          <div
            ref={logoutDialogRef}
            className="attention-modal-card logout-modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
          >
            <button
              type="button"
              className="modal-dismiss-btn"
              onClick={() => setLogoutOpen(false)}
              aria-label="Close logout confirmation"
            >
              <Icon name="modal-close" width="24" height="24" />
            </button>
            <div className="logout-modal-content">
              <div className="logout-modal-icon">
                <Icon name="modal-emoji-circle" width="80" height="80" />
                <span aria-hidden="true">🐈</span>
              </div>
              <div className="logout-modal-copy">
                <h2>Already leaving?</h2>
                {logoutError && <p className="input-error-caption" role="alert">{logoutError}</p>}
                <div className="auth-buttons-inline">
                  <button type="button" className="btn-primary-filled" onClick={handleLogout}>Yes</button>
                  <button type="button" className="logout-cancel-btn" onClick={() => setLogoutOpen(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
