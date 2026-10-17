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

interface HeaderBarProps {
  variant?: 'hero' | 'standard';
}

function HeaderBar({ variant = 'standard' }: HeaderBarProps) {
  const { currentUser, setCurrentUser, clearPrivateData } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
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

  React.useEffect(() => {
    if (!logoutOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLogoutOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [logoutOpen]);

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
          <span>petl</span><img src={`${import.meta.env.BASE_URL}icons/heart.svg`} alt="" className="brand-heart" /><span>ve</span>
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
                  <img src={`${import.meta.env.BASE_URL}icons/user-circle.svg`} alt="" className="user-chip-avatar" />
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
            className="attention-modal-card"
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
              ✕
            </button>
            <h2 className="state-empty-title">Log out of Petlove?</h2>
            <p className="state-empty-desc">Your local session will be cleared from this device.</p>
            {logoutError && <p className="input-error-caption" role="alert">{logoutError}</p>}
            <div className="auth-buttons-inline">
              <button type="button" className="btn-auth-outline" onClick={() => setLogoutOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary-filled" onClick={handleLogout}>Yes, log out</button>
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
  const [detailError, setDetailError] = useState('');
  const [loadingNoticeId, setLoadingNoticeId] = useState('');

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

  React.useEffect(() => {
    if (!authPromptOpen && !focusedPet) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAuthPromptOpen(false);
        setFocusedPet(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [authPromptOpen, focusedPet]);

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
                      onClick={() => {
                        if (!currentUser) {
                          setAuthPromptOpen(true);
                          return;
                        }
                        toggleFavorite(pet.id);
                      }}
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
                ✕
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
                      onClick={() => toggleFavorite(focusedPet.id)}
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
                ✕
              </button>
              <span className="state-empty-symbol">🔒</span>
              <h2 className="state-empty-title">Sign in to continue</h2>
              <p className="state-empty-desc">Create an account or log in to save favorites and view full pet details.</p>
              <div className="auth-buttons-inline">
                <Link to="/login" className="btn-primary-filled" onClick={() => setAuthPromptOpen(false)}>LOG IN</Link>
                <Link to="/register" className="btn-auth-outline" onClick={() => setAuthPromptOpen(false)}>REGISTRATION</Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
function ProfilePage() {
  const { currentUser, setCurrentUser, userPets, removeUserPet, toggleFavorite, favoriteNotices } = useAppStore();
  const [activeProfileTab, setActiveProfileTab] = useState<'pets' | 'favorites'>('pets');
  const [isEditing, setIsEditing] = useState(false);
  if (!currentUser) return <Navigate to="/login" replace />;

  const profileSchema = Yup.object().shape({
    name: Yup.string().required('Full name is required'),
    phone: Yup.string().matches(/^\+38\d{10}$/, {
      message: 'Use the +380XXXXXXXXX format',
      excludeEmptyString: true,
    }),
  });

  const handleSaveProfile = async (
    values: { name: string; phone: string },
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

  return (
    <div className="layout-page-container standard-page-layout">
      <HeaderBar />

      <main className="content-readable-area profile-layout-columns">
        <aside className="profile-user-card" aria-label="User Profile Details">
          <div className="profile-card-header">
            <div className="profile-avatar-circle">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-letter">{currentUser.name.charAt(0)}</span>
              )}
            </div>
            <h2 className="profile-user-name">{currentUser.name}</h2>
            <span className="profile-user-badge">Registered Guardian</span>
          </div>

          {!isEditing ? (
            <div className="profile-details-table">
              <div className="profile-detail-row">
                <span className="p-key">Name:</span>
                <span className="p-val">{currentUser.name}</span>
              </div>
              <div className="profile-detail-row">
                <span className="p-key">Email:</span>
                <span className="p-val">{currentUser.email}</span>
              </div>
              <div className="profile-detail-row">
                <span className="p-key">Phone:</span>
                <span className="p-val">{currentUser.phone || 'Not specified'}</span>
              </div>

              <div className="profile-actions-stack">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn-auth-outline full-width"
                >
                  Edit profile details
                </button>
                <Link to="/add-pet" className="btn-primary-filled full-width text-center">
                  + Add pet
                </Link>
              </div>
            </div>
          ) : (
            <Formik
              initialValues={{ name: currentUser.name, phone: currentUser.phone || '' }}
              enableReinitialize
              validationSchema={profileSchema}
              onSubmit={handleSaveProfile}
            >
              {({ isSubmitting, errors, touched, status }) => (
                <Form className="profile-edit-form" noValidate>
                  {status && (
                    <div className="form-message form-message-error" role="alert">
                      <span className="banner-icon-mark">!</span>
                      <span>{status}</span>
                    </div>
                  )}
                  <div className="input-field-group">
                    <label htmlFor="edit-name-input" className="input-field-label">Full Name</label>
                    <Field
                      id="edit-name-input"
                      name="name"
                      type="text"
                      className={`text-input-field ${touched.name && errors.name ? 'has-error' : ''}`}
                    />
                    <ErrorMessage name="name" component="div" className="input-error-caption" />
                  </div>

                  <div className="input-field-group">
                    <label htmlFor="edit-phone-input" className="input-field-label">Phone Number</label>
                    <Field
                      id="edit-phone-input"
                      name="phone"
                      type="tel"
                      placeholder="+380XXXXXXXXX"
                      className={`text-input-field ${touched.phone && errors.phone ? 'has-error' : ''}`}
                    />
                    <ErrorMessage name="phone" component="div" className="input-error-caption" />
                  </div>

                  <div className="edit-buttons-row">
                    <button type="submit" disabled={isSubmitting} className="btn-primary-filled">
                      {isSubmitting ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="btn-auth-outline">
                      Cancel
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </aside>
        <section className="profile-tab-section" aria-label="User pets and favorites">
          <div className="profile-tabs-header">
            <div className="tab-pill-switcher">
              <button
                type="button"
                className={`tab-switch-pill ${activeProfileTab === 'pets' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('pets')}
              >
                My pets ({userPets.length})
              </button>
              <button
                type="button"
                className={`tab-switch-pill ${activeProfileTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('favorites')}
              >
                Favorites ({favoriteNotices.length})
              </button>
            </div>

            <Link to="/add-pet" className="btn-pill-add-action">
              Add pet +
            </Link>
          </div>

          {activeProfileTab === 'pets' ? (
            userPets.length > 0 ? (
              <div className="user-pets-list">
                {userPets.map((p) => (
                  <article key={p.id} className="user-pet-card-horizontal">
                    <img src={p.imageUrl} alt={p.name} className="user-pet-thumb" />
                    <div className="user-pet-info">
                      <div className="user-pet-title-row">
                        <h3 className="user-pet-name">{p.name}</h3>
                        <button
                          type="button"
                          onClick={() => removeUserPet(p.id)}
                          className="btn-pet-delete"
                          title="Remove pet card"
                          aria-label={`Remove ${p.name}`}
                        >
                          🗑
                        </button>
                      </div>

                      <div className="user-pet-meta-chips">
                        <span><strong>Species:</strong> {p.species}</span>
                        <span><strong>Birthday:</strong> {p.birthday}</span>
                        <span><strong>Sex:</strong> {p.sex}</span>
                      </div>

                      <p className="user-pet-notes">{p.comments}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="state-empty-box">
                <span className="state-empty-symbol">🐾</span>
                <h3 className="state-empty-title">No pets added yet</h3>
                <p className="state-empty-desc">
                  Register your companion to keep veterinary records and adoption info easily accessible.
                </p>
                <Link to="/add-pet" className="btn-primary-filled">
                  Add your first pet
                </Link>
              </div>
            )
          ) : (
            favoriteNotices.length > 0 ? (
              <div className="notices-cards-grid">
                {favoriteNotices.map((pet) => (
                  <article key={pet.id} className="notice-pet-card">
                    <div className="notice-image-container">
                      <img src={pet.imageUrl} alt={pet.name} className="notice-main-photo" />
                      <button
                        type="button"
                        onClick={() => toggleFavorite(pet.id)}
                        className="notice-heart-button is-fav"
                        aria-label="Remove from favorites"
                      >
                        ♥
                      </button>
                    </div>
                    <div className="notice-content-body">
                      <h3 className="notice-pet-name">{pet.name}</h3>
                      <p className="notice-summary-desc">{pet.title}</p>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(pet.id)}
                        className="btn-auth-outline full-width"
                      >
                        Remove from favorites
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="state-empty-box">
                <span className="state-empty-symbol">♡</span>
                <h3 className="state-empty-title">No favorites saved yet</h3>
                <p className="state-empty-desc">
                  Explore notices and click the heart icon on any pet you want to keep in mind.
                </p>
                <Link to="/notices" className="btn-primary-filled">
                  Browse pet notices
                </Link>
              </div>
            )
          )}
        </section>
      </main>
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
      .matches(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
      .required('Birthday or adoption date is required'),
    species: Yup.string().required('Species is required'),
    sex: Yup.string().required('Sex is required'),
    imageUrl: Yup.string().matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp)$/, 'Use a direct image URL').required('Image URL is required'),

  });

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout-page-container standard-page-layout">
      <HeaderBar />

      <main className="content-readable-area form-page-center">
        <div className="add-pet-form-card">
          <header className="auth-card-heading">
            <h1 className="auth-screen-title">Add pet</h1>
            <p className="auth-screen-desc">
              Fill in your companion&apos;s details to save them into your profile.
            </p>
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
              sex: 'Male',
              imageUrl: '',
            }}
            validationSchema={addPetSchema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                await addUserPet({
                  name: values.name,
                  title: values.title,
                  imgURL: values.imageUrl,
                  species: values.species.toLowerCase() as NoticeSpecies,
                  birthday: values.birthday,
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
              <Form className="formik-auth-form" noValidate>
                {status && (
                  <div className="form-message form-message-error" role="alert">
                    <span className="banner-icon-mark">!</span>
                    <span>{status}</span>
                  </div>
                )}
                <div className="input-field-group">
                  <label htmlFor="pet-title-input" className="input-field-label">
                    Title
                  </label>
                  <Field
                    id="pet-title-input"
                    name="title"
                    type="text"
                    placeholder="e.g. Joyful golden buddy"
                    className={`text-input-field ${touched.title && errors.title ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="title" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group">
                  <label htmlFor="pet-name-input" className="input-field-label">
                    Pet&apos;s Name
                  </label>
                  <Field
                    id="pet-name-input"
                    name="name"
                    type="text"
                    placeholder="e.g. Milo"
                    className={`text-input-field ${touched.name && errors.name ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="name" component="div" className="input-error-caption" />
                </div>

                <div className="form-row-two-col">
                  <div className="input-field-group">
                    <label htmlFor="pet-bday-input" className="input-field-label">
                      Birthday / Date
                    </label>
                    <Field
                      id="pet-bday-input"
                      name="birthday"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      className={`text-input-field ${touched.birthday && errors.birthday ? 'has-error' : ''}`}
                    />
                    <ErrorMessage name="birthday" component="div" className="input-error-caption" />
                  </div>

                  <div className="input-field-group">
                    <label htmlFor="pet-species-select" className="input-field-label">
                      Species
                    </label>
                    <Field
                      id="pet-species-select"
                      as="select"
                      name="species"
                      className="filter-select-control w-full"
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

                <div className="input-field-group">
                  <span className="input-field-label">Sex</span>
                  <div className="radio-pill-group" role="radiogroup" aria-label="Pet sex">
                    <label className="radio-pill-option">
                      <Field type="radio" name="sex" value="Female" />
                      <span>Female</span>
                    </label>
                    <label className="radio-pill-option">
                      <Field type="radio" name="sex" value="Male" />
                      <span>Male</span>
                    </label>
                  </div>
                </div>

                <div className="input-field-group">
                  <label htmlFor="pet-image-input" className="input-field-label">
                    Image URL
                  </label>
                  <Field
                    id="pet-image-input"
                    name="imageUrl"
                    type="url"
                    placeholder="https://example.com/pet.webp"
                    className={`text-input-field ${touched.imageUrl && errors.imageUrl ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="imageUrl" component="div" className="input-error-caption" />
                </div>

                <div className="form-submit-actions-row">
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
                    {isSubmitting ? 'SAVING...' : 'SAVE PET'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
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
