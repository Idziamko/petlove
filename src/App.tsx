import React, { useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import HomePage from './HomePage';
import NotFoundPage from './NotFoundPage';
import NewsPage from './NewsPage';
import FriendsPage from './FriendsPage';
import Title from './Title';
import NoticeFilters, { type NoticeFiltersValue } from './NoticeFilters';
import Pagination from './Pagination';
import Icon from './Icon';
import MobileMenu from './MobileMenu';
import Loader from './Loader';
import PetBlock from './PetBlock';
import { AppStoreProvider, useAppStore } from './store';
import { petNoticeFromApi, userProfileFromApi, type PetNotice } from './models';
import {
  authApi,
  citiesApi,
  getApiErrorMessage,
  noticesApi,
  usersApi,
  type NoticeSex,
  type NoticeSpecies,
} from './api';
const EMAIL_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

function useDialogA11y(open: boolean, dialogRef: React.RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = React.useRef(onClose);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getFocusable = () => dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )) : [];
    const focusFirst = () => getFocusable()[0]?.focus();
    focusFirst();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [dialogRef, open]);
}

interface HeaderBarProps {
  variant?: 'hero' | 'standard';
}

function HeaderBar({ variant = 'standard' }: HeaderBarProps) {
  const { currentUser, setCurrentUser, clearPrivateData } = useAppStore();
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
    } catch {
      setLogoutError('The server could not close the session, but this device has been logged out.');
    } finally {
      setCurrentUser(null);
      clearPrivateData();
      setLogoutOpen(false);
      setMenuOpen(false);
      navigate('/home');
    }
  };

  const isHero = variant === 'hero';

  return (
    <header className={`pet-header ${isHero ? 'header-hero-mode' : 'header-standard-mode'}`}>
      <div className="header-inner">
        <Link to="/home" className="site-brand" aria-label="Petlove homepage">
          <span>petl</span><img src={`${import.meta.env.BASE_URL}icons/heart-circle.svg`} alt="" className="brand-heart" /><span>ve</span>
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
                  <img src={`${import.meta.env.BASE_URL}icons/profile-user.svg`} alt="" className="user-chip-avatar" />
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
              <img src={`${import.meta.env.BASE_URL}icons/modal-close.svg`} alt="" />
            </button>
            <div className="logout-modal-content">
              <div className="logout-modal-icon">
                <img src={`${import.meta.env.BASE_URL}icons/modal-emoji-circle.svg`} alt="" />
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
function LoginPage() {
  const { currentUser, refreshUser } = useAppStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .matches(EMAIL_PATTERN, 'Please provide a valid email')
      .required('Email address is required'),
    password: Yup.string()
      .min(7, 'Password must be at least 7 characters')
      .required('Password is required'),
  });

  if (currentUser) return <Navigate to="/profile" replace />;

  return (
    <div className="layout-page-container standard-page-layout auth-page">
      <HeaderBar />

      <main className="auth-split-grid">
        <div className="auth-form-card">
          <header className="auth-card-heading">
            <h1 className="auth-screen-title">Log in</h1>
            <p className="auth-screen-desc">
              Welcome! Please enter your credentials to login to the platform:
            </p>
          </header>

          {bannerMessage && (
            <div className="form-message form-message-success" role="alert">
              <span className="banner-icon-mark">✓</span>
              <span>{bannerMessage}</span>
            </div>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                await authApi.signIn(values);
                await refreshUser();
                setBannerMessage('Signed in successfully! Redirecting to your dashboard...');
                navigate('/profile', { replace: true });
              } catch (error) {
                setStatus(getApiErrorMessage(error, 'Unable to sign in right now.'));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched, status }) => (
              <Form className="formik-auth-form" noValidate>
                {status && (
                  <div className="form-message form-message-error" role="alert">
                    <span className="banner-icon-mark">!</span>
                    <span>{status}</span>
                  </div>
                )}
                <div className="input-field-group">
                  <label htmlFor="login-email-input" className="input-field-label">
                    Email
                  </label>
                  <Field
                    id="login-email-input"
                    name="email"
                    type="email"
                    placeholder="Email"
                    className={`text-input-field ${touched.email && errors.email ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="email" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group">
                  <label htmlFor="login-pass-input" className="input-field-label">
                    Password
                  </label>
                  <div className="password-control-wrapper">
                    <Field
                      id="login-pass-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className={`text-input-field ${touched.password && errors.password ? 'has-error' : ''}`}
                    />
                    <button
                      type="button"
                      className="password-toggle-trigger"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <img src={`${import.meta.env.BASE_URL}icons/${showPassword ? 'eye' : 'eye-off'}.svg`} alt="" />
                    </button>
                  </div>
                  <ErrorMessage name="password" component="div" className="input-error-caption" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-filled full-width"
                >
                  {isSubmitting ? 'LOGGING IN...' : 'LOG IN'}
                </button>

                <div className="auth-reroute-footer">
                  <span>Don&apos;t have an account?</span>{' '}
                  <Link to="/register" className="auth-hyperlink">
                    Register
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
        <PetBlock variant="login" />
      </main>
    </div>
  );
}
function RegisterPage() {
  const { currentUser, refreshUser } = useAppStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const registrationSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, 'Name must be at least 2 characters')
      .required('Full name is required'),
    email: Yup.string()
      .matches(EMAIL_PATTERN, 'Please provide a valid email')
      .required('Email address is required'),
    password: Yup.string()
      .min(7, 'Password must be at least 7 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password'),
  });

  if (currentUser) return <Navigate to="/profile" replace />;

  return (
    <div className="layout-page-container standard-page-layout auth-page register-page">
      <HeaderBar />

      <main className="auth-split-grid">
        <div className="auth-form-card">
          <header className="auth-card-heading">
            <h1 className="auth-screen-title">Registration</h1>
            <p className="auth-screen-desc">
              Thank you for your interest in our platform.
            </p>
          </header>

          {bannerMessage && (
            <div className="form-message form-message-success" role="alert">
              <span className="banner-icon-mark">✓</span>
              <span>{bannerMessage}</span>
            </div>
          )}

          <Formik
            initialValues={{ name: '', email: '', password: '', confirmPassword: '' }}
            validationSchema={registrationSchema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                await authApi.signUp({
                  name: values.name,
                  email: values.email,
                  password: values.password
                });
                await refreshUser();
                setBannerMessage('Account created successfully! Redirecting...');
                navigate('/profile', { replace: true });
              } catch (error) {
                setStatus(getApiErrorMessage(error, 'Unable to create the account right now.'));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched, status }) => (
              <Form className="formik-auth-form" noValidate>
                {status && (
                  <div className="form-message form-message-error" role="alert">
                    <span className="banner-icon-mark">!</span>
                    <span>{status}</span>
                  </div>
                )}
                <div className="input-field-group">
                  <label htmlFor="reg-name-input" className="input-field-label">
                    Name
                  </label>
                  <Field
                    id="reg-name-input"
                    name="name"
                    type="text"
                    placeholder="Name"
                    className={`text-input-field ${touched.name && errors.name ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="name" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group">
                  <label htmlFor="reg-email-input" className="input-field-label">
                    Email
                  </label>
                  <Field
                    id="reg-email-input"
                    name="email"
                    type="email"
                    placeholder="Email"
                    className={`text-input-field ${touched.email && errors.email ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="email" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group">
                  <label htmlFor="reg-pass-input" className="input-field-label">
                    Password
                  </label>
                  <div className="password-control-wrapper">
                    <Field
                      id="reg-pass-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className={`text-input-field ${touched.password && errors.password ? 'has-error' : ''}`}
                    />
                    <button
                      type="button"
                      className="password-toggle-trigger"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <img src={`${import.meta.env.BASE_URL}icons/${showPassword ? 'eye' : 'eye-off'}.svg`} alt="" />
                    </button>
                  </div>
                  <ErrorMessage name="password" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group">
                  <label htmlFor="reg-confirm-input" className="input-field-label">
                    Confirm Password
                  </label>
                  <Field
                    id="reg-confirm-input"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    className={`text-input-field ${touched.confirmPassword && errors.confirmPassword ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="confirmPassword" component="div" className="input-error-caption" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-filled full-width"
                >
                  {isSubmitting ? 'CREATING ACCOUNT...' : 'REGISTRATION'}
                </button>

                <div className="auth-reroute-footer">
                  <span>Already have an account?</span>{' '}
                  <Link to="/login" className="auth-hyperlink">
                    Log In
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
        <PetBlock variant="register" />
      </main>
    </div>
  );
}
function NoticesPage() {
  const { currentUser, favoriteIds, toggleFavorite, refreshUser } = useAppStore();
  const [filters, setFilters] = useState<NoticeFiltersValue>({});
  const [retry, setRetry] = useState(0);
  const [focusedPet, setFocusedPet] = useState<PetNotice | null>(null);
  const [notices, setNotices] = useState<PetNotice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [loadingNoticeId, setLoadingNoticeId] = useState('');
  const detailDialogRef = React.useRef<HTMLDivElement>(null);
  const authDialogRef = React.useRef<HTMLDivElement>(null);
  const congratsDialogRef = React.useRef<HTMLDivElement>(null);

  const handleFavoriteToggle = async (id: string) => {
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    const wasFavorite = favoriteIds.includes(id);
    await toggleFavorite(id);
    if (!wasFavorite) {
      setFocusedPet(null);
      setCongratsOpen(true);
    }
  };

  const openNotice = async (pet: PetNotice) => {
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    setLoadingNoticeId(pet.id);
    setDetailError('');
    try {
      const notice = await noticesApi.byId(pet.id);
      setFocusedPet(petNoticeFromApi(notice));
      await refreshUser();
    } catch (reason) {
      setDetailError(getApiErrorMessage(reason, 'Unable to load this notice. Please try again.'));
    } finally {
      setLoadingNoticeId('');
    }
  };

  useDialogA11y(Boolean(focusedPet), detailDialogRef, () => setFocusedPet(null));
  useDialogA11y(authPromptOpen, authDialogRef, () => setAuthPromptOpen(false));
  useDialogA11y(congratsOpen, congratsDialogRef, () => setCongratsOpen(false));

  const [locations, setLocations] = useState<Record<string, string>>({});
  React.useEffect(() => {
    let active = true;
    citiesApi.locations().then(items => {
      if (active) setLocations(Object.fromEntries(items.map(item => [item._id, `${item.cityEn}, ${item.stateEn}`])));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    noticesApi.list({
      keyword: filters.keyword,
      category: filters.category,
      species: filters.species,
      sex: filters.sex,
      locationId: filters.locationId,
      byPopularity: filters.sort === 'Popular' ? false : filters.sort === 'Unpopular' ? true : undefined,
      byPrice: filters.sort === 'Cheap' ? true : filters.sort === 'Expensive' ? false : undefined,
      page,
      limit: 6,
    }).then(response => {
      if (!active) return;
      setNotices(response.results.map(notice => petNoticeFromApi(notice, locations)));
      setTotalPages(response.totalPages || 1);
    }).catch(reason => {
      if (active) setLoadError(getApiErrorMessage(reason, 'Unable to load pet notices right now.'));
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [filters, page, retry, locations]);

  const filteredNotices = notices;

  return (
    <div className="layout-page-container standard-page-layout notices-page">
      <HeaderBar />

      <main className="content-readable-area">
        <Title className="page-headline-title">Find your favorite pet</Title>
        <NoticeFilters value={filters} onChange={next => { setFilters(next); setPage(1); }} />
        {isLoading ? (
          <Loader />
        ) : loadError ? (
          <div className="state-empty-box" role="alert">
            <span className="state-empty-symbol">⚠️</span>
            <h2 className="state-empty-title">Unable to load pet notices</h2>
            <p className="state-empty-desc">{loadError}</p>
            <button type="button" onClick={() => setRetry(previous => previous + 1)} className="btn-primary-filled">Try again</button>
          </div>
        ) : filteredNotices.length > 0 ? (
          <>
          <div className="notices-cards-grid">
            {filteredNotices.map((pet) => {
              const isFav = favoriteIds.includes(pet.id);
              return (
                <article key={pet.id} className="notice-pet-card">
                  <div className="notice-image-container">
                    <img src={pet.imageUrl} alt={pet.name} className="notice-main-photo" />

                  </div>

                  <div className="notice-content-body">
                    <div className="notice-heading-row">
                      <h2 className="notice-pet-name">{pet.title}</h2>
                      <div className="notice-rating-chip">
                        <Icon name="star" />
                        <span>{pet.rating}</span>
                      </div>
                    </div>

                    <div className="notice-spec-pills-row">
                      {[['Name', pet.name], ['Birthday', pet.birthday ? pet.birthday.split('-').reverse().join('.') : 'Unknown'], ['Sex', pet.gender], ['Species', pet.species], ['Category', pet.category]].map(([label, value]) => <div className="spec-pill" key={label}><span className="spec-label">{label}</span><span className="spec-val">{value}</span></div>)}
                    </div>

                    <p className="notice-summary-desc">{pet.description}</p>

                    <p className="notice-price">{pet.price || ''}</p>
                    <div className="notice-action-row">
                      <button
                        type="button"
                        onClick={() => openNotice(pet)}
                        disabled={loadingNoticeId === pet.id}
                        className="btn-primary-filled full-width"
                      >
                        {loadingNoticeId === pet.id ? 'Loading…' : 'Learn more'}
                      </button>
                    <button
                      type="button"
                        onClick={() => handleFavoriteToggle(pet.id)}
                      className={`notice-heart-button ${isFav ? 'is-fav' : ''}`}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Icon name="heart" />
                    </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} disabled={isLoading} onChange={next => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        ) : (
          <div className="state-empty-box">
            <span className="state-empty-symbol">🐾</span>
            <h2 className="state-empty-title">No pet notices found</h2>
            <p className="state-empty-desc">
              We couldn&apos;t find any companions matching your exact search parameters.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="btn-primary-filled"
            >
              Reset all filters
            </button>
          </div>
        )}
        {focusedPet && (
          <div className="modal-dialog-overlay" onClick={() => setFocusedPet(null)}>
            <div
              ref={detailDialogRef}
              className="pet-detail-modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Details for ${focusedPet.name}`}
            >
              <button
                type="button"
                className="modal-dismiss-btn"
                onClick={() => setFocusedPet(null)}
                aria-label="Close modal dialog"
              >
                <img src={`${import.meta.env.BASE_URL}icons/modal-close.svg`} alt="" />
              </button>

              <div className="modal-content-split">
                <div className="modal-left-image">
                  <img src={focusedPet.imageUrl} alt={focusedPet.name} className="modal-hero-photo" />
                  <span className="modal-chip-tag">{focusedPet.category}</span>
                </div>

                <div className="modal-right-details">
                  <div className="modal-header-meta">
                    <h2 className="modal-title-text">{focusedPet.name}</h2>
                    <span className="modal-score">★ {focusedPet.rating.toFixed(1)}</span>
                  </div>

                  <p className="modal-headline-blurb">{focusedPet.title}</p>

                  <div className="modal-specs-table">
                    <div className="table-row">
                      <span className="table-key">Name:</span>
                      <span className="table-value">{focusedPet.name}</span>
                    </div>
                    <div className="table-row">
                      <span className="table-key">Birthday:</span>
                      <span className="table-value">{focusedPet.birthday}</span>
                    </div>
                    <div className="table-row">
                      <span className="table-key">Sex:</span>
                      <span className="table-value">{focusedPet.gender}</span>
                    </div>
                    <div className="table-row">
                      <span className="table-key">Species:</span>
                      <span className="table-value">{focusedPet.species}</span>
                    </div>
                    <div className="table-row">
                      <span className="table-key">Location:</span>
                      <span className="table-value">{focusedPet.location}</span>
                    </div>
                    {focusedPet.price && (
                      <div className="table-row">
                        <span className="table-key">Adoption Fee:</span>
                        <span className="table-value table-price">{focusedPet.price}</span>
                      </div>
                    )}
                  </div>

                  <p className="modal-full-narrative">{focusedPet.description}</p>

                  <div className="modal-actions-bar">
                    <button
                      type="button"
                      onClick={() => handleFavoriteToggle(focusedPet.id)}
                      className={`btn-auth-outline ${favoriteIds.includes(focusedPet.id) ? 'fav-highlight' : ''}`}
                    >
                      {favoriteIds.includes(focusedPet.id) ? '♥ Favorited' : '♡ Add to favorites'}
                    </button>
                    {focusedPet.contact ? (
                      <a href={focusedPet.contact} className="btn-primary-filled">Contact</a>
                    ) : <span>Contact details are not provided.</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailError && <p role="alert" className="input-error-caption">{detailError}</p>}
        {authPromptOpen && (
          <div className="modal-dialog-overlay" onClick={() => setAuthPromptOpen(false)}>
            <div
              ref={authDialogRef}
              className="attention-modal-card"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Authentication required"
            >
              <button
                type="button"
                className="modal-dismiss-btn"
                onClick={() => setAuthPromptOpen(false)}
                aria-label="Close authentication prompt"
              >
                <img src={`${import.meta.env.BASE_URL}icons/modal-close.svg`} alt="" />
              </button>
              <div className="attention-modal-content">
                <div className="attention-modal-icon">
                  <img src={`${import.meta.env.BASE_URL}icons/modal-emoji-circle.svg`} alt="" />
                  <span aria-hidden="true">🐶</span>
                </div>
                <div className="attention-modal-copy">
                  <div className="attention-modal-text">
                    <h2>Attention</h2>
                    <p>We would like to remind you that certain functionality is available only to authorized users. If you have an account, please log in with your credentials. If you do not already have an account, you must register to access these features.</p>
                  </div>
                  <div className="auth-buttons-inline">
                    <Link to="/login" className="btn-primary-filled" onClick={() => setAuthPromptOpen(false)}>LOG IN</Link>
                    <Link to="/register" className="btn-auth-outline" onClick={() => setAuthPromptOpen(false)}>REGISTRATION</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {congratsOpen && (
          <div className="modal-dialog-overlay" onClick={() => setCongratsOpen(false)}>
            <div
              ref={congratsDialogRef}
              className="attention-modal-card congrats-modal-card"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Favorite added"
            >
              <button
                type="button"
                className="modal-dismiss-btn"
                onClick={() => setCongratsOpen(false)}
                aria-label="Close congratulations"
              >
                <img src={`${import.meta.env.BASE_URL}icons/modal-close.svg`} alt="" />
              </button>
              <div className="congrats-modal-content">
                <div className="attention-modal-icon">
                  <img src={`${import.meta.env.BASE_URL}icons/modal-emoji-circle.svg`} alt="" />
                  <span aria-hidden="true">🐈</span>
                </div>
                <div className="congrats-modal-copy">
                  <div className="congrats-modal-text">
                    <h2>Congrats</h2>
                    <p>The first fluff in the favorites! May your friendship be the happiest and filled with fun.</p>
                  </div>
                  <Link to="/profile" className="btn-primary-filled" onClick={() => setCongratsOpen(false)}>Go to profile</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
function profileDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

function ProfileNoticeCard({ notice, removable, onRemove }: { notice: PetNotice; removable?: boolean; onRemove?: () => void }) {
  return (
    <article className={`profile-notice-card${removable ? ' profile-notice-card-removable' : ''}`}>
      <img src={notice.imageUrl} alt={notice.name} className="profile-notice-image" />
      <div className="profile-notice-content">
        <div className="profile-notice-heading">
          <h3>{notice.title}</h3>
          <span className="profile-notice-rating"><img src={`${import.meta.env.BASE_URL}icons/star.svg`} alt="" />{notice.rating}</span>
        </div>
        <div className="profile-notice-specs">
          <span><small>Name</small>{notice.name}</span>
          <span><small>Birthday</small>{profileDate(notice.birthday)}</span>
          <span><small>Sex</small>{notice.gender}</span>
          <span><small>Species</small>{notice.species}</span>
          <span><small>Category</small>{notice.category}</span>
        </div>
        <p className="profile-notice-description">{notice.description}</p>
        <div className="profile-notice-actions">
          <Link to="/notices" className="profile-notice-learn">Learn more</Link>
          {removable && onRemove && (
            <button type="button" className="profile-notice-remove" onClick={onRemove} aria-label={`Remove ${notice.name} from favorites`}>
              <img src={`${import.meta.env.BASE_URL}icons/trash.svg`} alt="" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProfilePage() {
  const { currentUser, setCurrentUser, userPets, removeUserPet, toggleFavorite, favoriteNotices, viewedNotices } = useAppStore();
  const [activeProfileTab, setActiveProfileTab] = useState<'favorites' | 'viewed'>('favorites');
  const [isEditing, setIsEditing] = useState(false);
  const profileEditDialogRef = React.useRef<HTMLDivElement>(null);
  useDialogA11y(isEditing, profileEditDialogRef, () => setIsEditing(false));
  if (!currentUser) return <Navigate to="/login" replace />;

  const profileSchema = Yup.object().shape({
    name: Yup.string().required('Full name is required'),
    email: Yup.string()
      .matches(EMAIL_PATTERN, 'Please provide a valid email')
      .required('Email address is required'),
    avatar: Yup.string()
      .matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp)$/, 'Use a direct image URL'),
    phone: Yup.string().matches(/^\+38\d{10}$/, {
      message: 'Use the +380XXXXXXXXX format',
      excludeEmptyString: true,
    }),
  });

  const handleSaveProfile = async (
    values: { name: string; email: string; avatar: string; phone: string },
    { setSubmitting, setStatus }: { setSubmitting: (isSubmitting: boolean) => void; setStatus: (status?: unknown) => void },
  ) => {
    try {
      const updatedUser = await usersApi.edit(values);
      setCurrentUser(userProfileFromApi(updatedUser));
      setIsEditing(false);
    } catch (error) {
      setStatus(getApiErrorMessage(error, 'Unable to update your profile right now.'));
    } finally {
      setSubmitting(false);
    }
  };

  const notices = activeProfileTab === 'favorites' ? favoriteNotices : viewedNotices;

  return (
    <div className="layout-page-container standard-page-layout profile-page">
      <HeaderBar />
      <main className="profile-layout" aria-label="Profile">
        <aside className={`profile-side-card${userPets.length ? '' : ' profile-side-card-empty'}`} data-pet-count={Math.min(userPets.length, 2)} aria-label="User Profile Details">
          <div className="profile-role-badge">User <img src={`${import.meta.env.BASE_URL}icons/user-badge.svg`} alt="" /></div>
          <button type="button" className="profile-upload-button" onClick={() => setIsEditing(true)}>
            <span className="profile-upload-avatar">
              {currentUser.avatar ? <img className="profile-avatar-photo" src={currentUser.avatar} alt={currentUser.name} /> : <img src={`${import.meta.env.BASE_URL}icons/user-02.svg`} alt="" />}
            </span>
            <span>Upload photo</span>
          </button>
          <button type="button" className="profile-edit-button" onClick={() => setIsEditing(true)} aria-label="Edit profile">
            <img src={`${import.meta.env.BASE_URL}icons/edit.svg`} alt="" />
          </button>

          <section className="profile-information">
            <h2>My information</h2>
            <div className="profile-information-fields">
              <div>{currentUser.name}</div>
              <div>{currentUser.email}</div>
              <div className="profile-information-phone">{currentUser.phone || '+380'}</div>
            </div>
          </section>

          <section className="profile-my-pets">
            <div className="profile-section-heading"><h2>My pets</h2><Link to="/add-pet">Add pet <img src={`${import.meta.env.BASE_URL}icons/plus.svg`} alt="" /></Link></div>
            {userPets.map((pet) => (
              <article key={pet.id} className="profile-user-pet-card">
                <img src={pet.imageUrl} alt={pet.name} className="profile-user-pet-image" />
                <div className="profile-user-pet-copy">
                  <strong>{pet.name}</strong>
                  <div><span><small>Name</small>{pet.name}</span><span><small>Birthday</small>{profileDate(pet.birthday)}</span><span><small>Sex</small>{pet.sex}</span><span><small>Species</small>{pet.species}</span></div>
                </div>
                <button type="button" className="profile-user-pet-remove" onClick={() => removeUserPet(pet.id)} aria-label={`Remove ${pet.name}`}><img src={`${import.meta.env.BASE_URL}icons/trash.svg`} alt="" /></button>
              </article>
            ))}
          </section>
          <button type="button" className="profile-logout-link" onClick={() => window.dispatchEvent(new Event('petlove:profile-logout'))}>LOG OUT</button>
        </aside>

        <section className="profile-notices-panel" aria-label="Saved pet notices">
          <div className="profile-tabs">
            <button type="button" className={activeProfileTab === 'favorites' ? 'active' : ''} onClick={() => setActiveProfileTab('favorites')}>My favorite pets</button>
            <button type="button" className={activeProfileTab === 'viewed' ? 'active' : ''} onClick={() => setActiveProfileTab('viewed')}>Viewed</button>
          </div>
          {notices.length > 0 ? (
            <div className="profile-notices-grid">
              {notices.map((notice) => <ProfileNoticeCard key={notice.id} notice={notice} removable={activeProfileTab === 'favorites'} onRemove={activeProfileTab === 'favorites' ? () => toggleFavorite(notice.id) : undefined} />)}
            </div>
          ) : (
            <div className="profile-empty-state">
              <p>Oops,<strong> looks like there aren&apos;t any furries</strong> on our adorable page yet. Do not worry! View your pets on the &quot;find your favorite pet&quot; page and add them to your favorites.</p>
            </div>
          )}
        </section>
      </main>
      {isEditing && (
        <div className="modal-dialog-overlay profile-edit-overlay" onClick={() => setIsEditing(false)}>
          <div
            ref={profileEditDialogRef}
            className="profile-edit-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close-button profile-edit-close" onClick={() => setIsEditing(false)} aria-label="Close edit profile">
              <span aria-hidden="true">×</span>
            </button>
            <Formik
              initialValues={{
                name: currentUser.name,
                email: currentUser.email,
                avatar: currentUser.avatar,
                phone: currentUser.phone || '',
              }}
              enableReinitialize
              validationSchema={profileSchema}
              onSubmit={handleSaveProfile}
            >
              {({ isSubmitting, errors, touched, status }) => (
                <Form className="profile-edit-panel" noValidate>
                  <h2 id="profile-edit-title">Edit information</h2>
                  {status && <p className="input-error-caption" role="alert">{String(status)}</p>}
                  <label htmlFor="edit-name-input">Name<Field id="edit-name-input" name="name" type="text" className={touched.name && errors.name ? 'has-error' : ''} /></label>
                  <ErrorMessage name="name" component="span" className="input-error-caption" />
                  <label htmlFor="edit-email-input">Email<Field id="edit-email-input" name="email" type="email" className={touched.email && errors.email ? 'has-error' : ''} /></label>
                  <ErrorMessage name="email" component="span" className="input-error-caption" />
                  <label htmlFor="edit-avatar-input">Avatar URL<Field id="edit-avatar-input" name="avatar" type="url" className={touched.avatar && errors.avatar ? 'has-error' : ''} /></label>
                  <ErrorMessage name="avatar" component="span" className="input-error-caption" />
                  <label htmlFor="edit-phone-input">Phone<Field id="edit-phone-input" name="phone" type="tel" placeholder="+380" className={touched.phone && errors.phone ? 'has-error' : ''} /></label>
                  <ErrorMessage name="phone" component="span" className="input-error-caption" />
                  <div className="profile-edit-actions">
                    <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  );
}
function AddPetPage() {
  const { addUserPet, currentUser } = useAppStore();
  const navigate = useNavigate();
  const [successBanner, setSuccessBanner] = useState(false);

  const addPetSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    name: Yup.string().required('Pet name is required'),
    birthday: Yup.string()
      .matches(/^(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})$/, 'Use the DD.MM.YYYY format')
      .required('Birthday or adoption date is required'),
    species: Yup.string().required('Species is required'),
    sex: Yup.string().required('Sex is required'),
    imageUrl: Yup.string().matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp)$/, 'Use a direct image URL').required('Image URL is required'),

  });

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout-page-container standard-page-layout add-pet-page">
      <HeaderBar />

      <main className="add-pet-layout">
        <section className="add-pet-art" aria-label="Pet image preview">
          <img src={`${import.meta.env.BASE_URL}images/add-pet-art.png`} alt="" />
          <div className="add-pet-art-shape" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/add-pet-shape.svg)` }} />
        </section>
        <section className="add-pet-form-card">
          <header className="add-pet-heading">
            <h1>Add my pet <span>/ Personal details</span></h1>
          </header>

          {successBanner && (
            <div className="form-message form-message-success" role="alert">
              <span className="banner-icon-mark">✓</span>
              <span>Pet successfully added to your profile! Redirecting...</span>
            </div>
          )}

          <Formik
            initialValues={{
              title: '',
              name: '',
              birthday: '',
              species: 'Dog',
              sex: '',
              imageUrl: '',
            }}
            validationSchema={addPetSchema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                const birthday = /^\d{2}\.\d{2}\.\d{4}$/.test(values.birthday)
                  ? values.birthday.split('.').reverse().join('-')
                  : values.birthday;
                await addUserPet({
                  name: values.name,
                  title: values.title,
                  imgURL: values.imageUrl,
                  species: values.species.toLowerCase() as NoticeSpecies,
                  birthday,
                  sex: values.sex.toLowerCase() as NoticeSex,
                });
                setSuccessBanner(true);
                navigate('/profile', { replace: true });
              } catch (error) {
                setStatus(getApiErrorMessage(error, 'Unable to save this pet right now.'));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched, status }) => (
              <Form className="add-pet-form" noValidate>
                {status && (
                  <div className="form-message form-message-error" role="alert">
                    <span className="banner-icon-mark">!</span>
                    <span>{status}</span>
                  </div>
                )}
                <div className="add-pet-sex" role="radiogroup" aria-label="Pet sex">
                  <label className="add-pet-sex-option add-pet-sex-female">
                    <Field type="radio" name="sex" value="Female" aria-label="Female" />
                    <img className="add-pet-sex-icon-default" src={`${import.meta.env.BASE_URL}icons/female.svg`} alt="" />
                    <img className="add-pet-sex-icon-selected" src={`${import.meta.env.BASE_URL}icons/female-selected.svg`} alt="" />
                  </label>
                  <label className="add-pet-sex-option add-pet-sex-male">
                    <Field type="radio" name="sex" value="Male" aria-label="Male" />
                    <img className="add-pet-sex-icon-default" src={`${import.meta.env.BASE_URL}icons/male.svg`} alt="" />
                    <img className="add-pet-sex-icon-selected" src={`${import.meta.env.BASE_URL}icons/male-selected.svg`} alt="" />
                  </label>
                  <label className="add-pet-sex-option add-pet-sex-multiple">
                    <Field type="radio" name="sex" value="Multiple" aria-label="Multiple" />
                    <img className="add-pet-sex-icon-default" src={`${import.meta.env.BASE_URL}icons/multiple.svg`} alt="" />
                    <img className="add-pet-sex-icon-selected" src={`${import.meta.env.BASE_URL}icons/multiple-selected.svg`} alt="" />
                  </label>
                </div>

                <div className="add-pet-photo-row">
                  <div className="add-pet-photo-preview" aria-hidden="true">
                    <img src={`${import.meta.env.BASE_URL}icons/paw.svg`} alt="" />
                  </div>
                  <div className="add-pet-photo-controls">
                    <label htmlFor="pet-image-input" className="add-pet-image-input">
                      <Field
                        id="pet-image-input"
                        name="imageUrl"
                        type="url"
                        placeholder="Enter URL"
                        className={touched.imageUrl && errors.imageUrl ? 'has-error' : ''}
                      />
                    </label>
                    <button type="button" className="add-pet-upload-button" onClick={() => document.getElementById('pet-image-input')?.focus()}>
                      Upload photo <img src={`${import.meta.env.BASE_URL}icons/upload-cloud.svg`} alt="" />
                    </button>
                  </div>
                </div>
                <ErrorMessage name="imageUrl" component="div" className="input-error-caption" />

                <div className="input-field-group add-pet-title-field">
                  <Field
                    id="pet-title-input"
                    name="title"
                    type="text"
                    placeholder="Title"
                    className={`text-input-field ${touched.title && errors.title ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="title" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group add-pet-name-field">
                  <Field
                    id="pet-name-input"
                    name="name"
                    type="text"
                    placeholder="Pet’s Name"
                    className={`text-input-field ${touched.name && errors.name ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="name" component="div" className="input-error-caption" />
                </div>

                <div className="form-row-two-col">
                  <div className="input-field-group">
                    <div className="add-pet-birthday-field">
                      <Field
                        id="pet-bday-input"
                        name="birthday"
                        type="text"
                        placeholder="00.00.0000"
                        className={`text-input-field ${touched.birthday && errors.birthday ? 'has-error' : ''}`}
                      />
                      <img src={`${import.meta.env.BASE_URL}icons/calendar.svg`} alt="" className="add-pet-calendar-icon" />
                    </div>
                    <ErrorMessage name="birthday" component="div" className="input-error-caption" />
                  </div>

                  <div className="input-field-group add-pet-species-field">
                    <Field
                      id="pet-species-select"
                      as="select"
                      name="species"
                      className="filter-select-control w-full"
                      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}icons/chevron-down.svg)` }}
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Turtle">Turtle</option>
                      <option value="Fish">Fish</option>
                      <option value="Monkey">Monkey</option>
                      <option value="Snake">Snake</option>
                      <option value="Lizard">Lizard</option>
                      <option value="Frog">Frog</option>
                      <option value="Ants">Ants</option>
                      <option value="Bees">Bees</option>
                      <option value="Butterfly">Butterfly</option>
                      <option value="Spider">Spider</option>
                      <option value="Scorpion">Scorpion</option>
                    </Field>
                  </div>
                </div>

                <div className="add-pet-submit-row">
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="btn-auth-outline"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary-filled"
                  >
                    {isSubmitting ? 'Saving…' : 'Submit'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </section>
      </main>
    </div>
  );
}
export default function App() {
  return (
    <AppStoreProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage header={<HeaderBar variant="hero" />} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/news" element={<NewsPage header={<HeaderBar />} />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/friends" element={<FriendsPage header={<HeaderBar />} />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/add-pet" element={<AddPetPage />} />
        <Route path="*" element={<NotFoundPage header={<HeaderBar />} />} />
      </Routes>
    </AppStoreProvider>
  );
}
