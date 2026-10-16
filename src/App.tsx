import React, { useState, useMemo, createContext, useContext } from 'react';
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
import PetBlock from './PetBlock';
import {
  authApi,
  citiesApi,
  friendsApi,
  getApiErrorMessage,
  getStoredToken,
  newsApi,
  noticesApi,
  usersApi,
  type Friend,
  type NewsItem,
  type Notice,
  type CurrentUser,
  type NoticeSex,
  type NoticeSpecies,
} from './api';
interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string;
}

interface PetNotice {
  id: string;
  title: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  category: 'found' | 'free' | 'sell';
  gender: 'female' | 'male';
  birthday: string;
  location: string;
  rating: number;
  imageUrl: string;
  description: string;
  price?: string;
}

interface NewsStory {
  id: string;
  title: string;
  snippet: string;
  category: string;
  date: string;
  imageUrl: string;
  url?: string;
}

interface ShelterFriend {
  id: string;
  name: string;
  status: string;
  time: string;
  address: string;
  addressUrl?: string;
  url?: string;
  email: string;
  phone: string;
  imageUrl: string;
}

interface UserPetRecord {
  id: string;
  name: string;
  species: string;
  birthday: string;
  sex: string;
  comments: string;
  imageUrl: string;
}

interface AppStoreContextType {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  userPets: UserPetRecord[];
  addUserPet: (pet: Omit<UserPetRecord, 'id'>) => void;
  removeUserPet: (id: string) => void;
  clearPrivateData: () => void;
}

const EMAIL_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

function petNoticeFromApi(notice: Notice, locationNames: Record<string, string> = {}): PetNotice {
  const location = typeof notice.location === 'string'
    ? locationNames[notice.location] || notice.location
    : `${notice.location.cityEn}, ${notice.location.stateEn}`;
  const species = notice.species === 'dog' || notice.species === 'cat' || notice.species === 'bird'
    ? notice.species
    : 'other';
  const category = notice.category === 'sell'
    ? 'sell'
    : notice.category === 'found' || notice.category === 'lost'
      ? 'found'
      : 'free';
  const gender = notice.sex === 'female' ? 'female' : 'male';

  return {
    id: notice._id,
    title: notice.title,
    name: notice.name,
    species,
    category,
    gender,
    birthday: notice.birthday,
    location,
    rating: Number(notice.popularity) || 0,
    imageUrl: notice.imageUrl || notice.imgURL || notice.imgUrl || `${import.meta.env.BASE_URL}images/home.webp`,
    description: notice.comment,
    price: typeof notice.price === 'number' ? `$${notice.price}` : undefined,
  };
}

function newsStoryFromApi(item: NewsItem): NewsStory {
  return {
    id: item._id,
    title: item.title,
    snippet: item.text,
    category: 'Guidance',
    date: item.date,
    imageUrl: item.imgUrl,
    url: item.url,
  };
}

function shelterFriendFromApi(friend: Friend): ShelterFriend {
  const openDay = friend.workDays?.find((day) => day.isOpen);
  return {
    id: friend._id,
    name: friend.title,
    status: 'Verified partner',
    time: openDay ? `${openDay.from || ''} – ${openDay.to || ''}`.trim() : 'By appointment',
    address: friend.address || 'Address unavailable',
    addressUrl: friend.addressUrl || undefined,
    url: friend.url,
    email: friend.email || '',
    phone: friend.phone || '',
    imageUrl: friend.imageUrl,
  };
}

function userPetsFromApi(pets: CurrentUser['pets'] = []): UserPetRecord[] {
  return pets.map((pet) => ({
    id: pet._id,
    name: pet.name,
    species: pet.species,
    birthday: pet.birthday,
    sex: pet.sex,
    comments: pet.title,
    imageUrl: pet.imgURL,
  }));
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
const AppStoreContext = createContext<AppStoreContextType | null>(null);

function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be accessed within AppStoreProvider');
  }
  return context;
}

function userProfileFromApi(user: { name: string; email: string; phone?: string; avatar?: string }): UserProfile {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar || '',
  };
}
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
        <div className="desktop-auth-actions">
          {currentUser ? (
            <div className="logged-user-cluster">
              <Link to="/profile" className="user-profile-chip" title="View profile">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="user-chip-avatar" />
                ) : (
                  <span className="user-chip-initial">{currentUser.name.charAt(0)}</span>
                )}
                <span className="user-chip-name">{currentUser.name.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="btn-auth-outline"
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
          <span className="menu-bar" />
          <span className="menu-bar" />
          <span className="menu-bar" />
        </button>
      </div>
      {menuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div
            className="mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Mobile Navigation"
          >
            <div className="drawer-top-bar">
              <Link to="/home" className="site-brand" onClick={() => setMenuOpen(false)}>
                <span>petl</span><img src={`${import.meta.env.BASE_URL}icons/heart.svg`} alt="" className="brand-heart" /><span>ve</span>
              </Link>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close drawer"
              >
                ✕
              </button>
            </div>

            <nav className="mobile-drawer-links">
              <NavLink
                to="/news"
                className={({ isActive }) => `drawer-nav-item ${isActive ? 'item-active' : ''}`}
              >
                News
              </NavLink>
              <NavLink
                to="/notices"
                className={({ isActive }) => `drawer-nav-item ${isActive ? 'item-active' : ''}`}
              >
                Find pet
              </NavLink>
              <NavLink
                to="/friends"
                className={({ isActive }) => `drawer-nav-item ${isActive ? 'item-active' : ''}`}
              >
                Our friends
              </NavLink>
            </nav>

            <div className="drawer-footer-actions">
              {currentUser ? (
                <>
                  <Link
                    to="/profile"
                    className="drawer-user-card"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="user-chip-initial">{currentUser.name.charAt(0)}</span>
                    <span className="drawer-user-name">{currentUser.name}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setLogoutOpen(true)}
                    className="btn-primary-filled full-width"
                  >
                    LOG OUT
                  </button>
                </>
              ) : (
                <div className="drawer-auth-buttons">
                  <Link to="/login" className="btn-auth-solid text-center">
                    LOG IN
                  </Link>
                  <Link to="/register" className="btn-auth-outline text-center">
                    REGISTRATION
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
  const { setCurrentUser } = useAppStore();
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
                const response = await authApi.signIn(values);
                setCurrentUser({
                  name: response.name,
                  email: response.email,
                  phone: '',
                  avatar: ''
                });
                setBannerMessage('Signed in successfully! Redirecting to your dashboard...');
                window.setTimeout(() => navigate('/profile'), 600);
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
  const { setCurrentUser } = useAppStore();
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
                const response = await authApi.signUp({
                  name: values.name,
                  email: values.email,
                  password: values.password
                });
                setCurrentUser({
                  name: response.name,
                  email: response.email,
                  phone: '',
                  avatar: ''
                });
                setBannerMessage('Account created successfully! Redirecting...');
                window.setTimeout(() => navigate('/profile'), 600);
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
function NewsPage() {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categories = ['All', 'Guidance'];

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  React.useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);
    newsApi.list({ keyword: query.trim() || undefined, page, limit: 6 })
      .then((response) => {
        if (!isActive) return;
        const nextStories = response.results.map(newsStoryFromApi);
        setStories((previous) => uniqueById(page === 1 ? nextStories : [...previous, ...nextStories]));
        setTotalPages(response.totalPages || 1);
      })
      .catch((error) => {
        if (isActive) setLoadError(getApiErrorMessage(error, 'Unable to load news right now.'));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [query, page]);

  const filteredNews = categoryFilter === 'All'
    ? stories
    : stories.filter((item) => item.category === categoryFilter);

  return (
    <div className="layout-page-container standard-page-layout">
      <HeaderBar />

      <main className="content-readable-area">
        <header className="page-header-row">
          <div>
            <h1 className="page-headline-title">News</h1>
            <p className="page-subline-text">
              Expert advice, heartwarming rescue stories, and veterinary updates.
            </p>
          </div>

          <div className="search-pill-field">
            <span className="search-magnifier-symbol">⌕</span>
            <input
              type="text"
              placeholder="Search news articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-inner-input"
              aria-label="Search news articles"
            />
            {query && (
              <button
                type="button"
                className="search-reset-cross"
                onClick={() => setQuery('')}
                aria-label="Clear news search"
              >
                ✕
              </button>
            )}
          </div>
        </header>
        <div className="filter-pill-scroller" role="tablist" aria-label="Topic filters">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`filter-selector-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
              role="tab"
              aria-selected={categoryFilter === cat}
            >
              {cat}
            </button>
          ))}
        </div>
        {isLoading && stories.length === 0 ? (
          <div className="state-empty-box" role="status">
            <span className="state-empty-symbol">⏳</span>
            <h2 className="state-empty-title">Loading news…</h2>
          </div>
        ) : loadError && stories.length === 0 ? (
          <div className="state-empty-box" role="alert">
            <span className="state-empty-symbol">⚠️</span>
            <h2 className="state-empty-title">Unable to load news</h2>
            <p className="state-empty-desc">{loadError}</p>
            <button type="button" onClick={() => setPage(1)} className="btn-primary-filled">Try again</button>
          </div>
        ) : filteredNews.length > 0 ? (
          <>
            <div className="news-grid-layout">
              {filteredNews.map((story) => (
                <article key={story.id} className="news-story-card">
                  <div className="news-media-frame">
                    <img src={story.imageUrl} alt={story.title} className="news-cover-photo" />
                    <span className="news-category-label">{story.category}</span>
                  </div>
                  <div className="news-body-frame">
                    <h2 className="news-article-title">{story.title}</h2>
                    <p className="news-article-snippet">{story.snippet}</p>
                    <div className="news-meta-row">
                      <time className="news-published-date">{story.date}</time>
                      <a
                        href={story.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="news-read-more-link"
                      >
                        Read more →
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {page < totalPages && (
              <div className="load-more-wrapper">
                <button
                  type="button"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={isLoading}
                  className="btn-auth-outline"
                >
                  {isLoading ? 'Loading articles...' : 'Load more news'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="state-empty-box">
            <span className="state-empty-symbol">📰</span>
            <h2 className="state-empty-title">No news articles found</h2>
            <p className="state-empty-desc">
              We couldn&apos;t find matching articles for &ldquo;{query}&rdquo;. Try another topic.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategoryFilter('All');
              }}
              className="btn-primary-filled"
            >
              Reset filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
function NoticesPage() {
  const { currentUser, favoriteIds, toggleFavorite } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryTab, setCategoryTab] = useState<'all' | 'free' | 'sell' | 'found'>('all');
  const [speciesChoice, setSpeciesChoice] = useState('all');
  const [genderChoice, setGenderChoice] = useState('all');
  const [focusedPet, setFocusedPet] = useState<PetNotice | null>(null);
  const [notices, setNotices] = useState<PetNotice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

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

  const categories: Array<{ id: 'all' | 'free' | 'sell' | 'found'; label: string }> = [
    { id: 'all', label: 'Show all' },
    { id: 'free', label: 'In good hands' },
    { id: 'sell', label: 'For sale' },
    { id: 'found', label: 'Lost / Found' },
  ];

  const speciesOptions = [
    { value: 'all', label: 'All species' },
    { value: 'dog', label: 'Dogs' },
    { value: 'cat', label: 'Cats' },
    { value: 'bird', label: 'Birds' },
  ];

  const genderOptions = [
    { value: 'all', label: 'All genders' },
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
  ];

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryTab, speciesChoice, genderChoice]);

  React.useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      noticesApi.list({
        keyword: searchTerm.trim() || undefined,
        category: categoryTab === 'all' ? undefined : categoryTab,
        species: speciesChoice === 'all' ? undefined : speciesChoice,
        sex: genderChoice === 'all' ? undefined : genderChoice,
        byDate: true,
        page,
        limit: 6,
      }),
      citiesApi.locations().catch(() => []),
    ])
      .then(([response, locations]) => {
        if (!isActive) return;
        const locationNames = Object.fromEntries(
          locations.map((location) => [location._id, `${location.cityEn}, ${location.stateEn}`]),
        );
        const nextNotices = response.results.map((notice) => petNoticeFromApi(notice, locationNames));
        setNotices((previous) => uniqueById(page === 1 ? nextNotices : [...previous, ...nextNotices]));
        setTotalPages(response.totalPages || 1);
      })
      .catch((error) => {
        if (isActive) setLoadError(getApiErrorMessage(error, 'Unable to load pet notices right now.'));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [searchTerm, categoryTab, speciesChoice, genderChoice, page]);

  const filteredNotices = notices;

  return (
    <div className="layout-page-container standard-page-layout">
      <HeaderBar />

      <main className="content-readable-area">
        <header className="page-header-row">
          <div>
            <h1 className="page-headline-title">Find your favorite pet</h1>
            <p className="page-subline-text">
              Browse companions needing loving adoption, foster homes, or safe reunification.
            </p>
          </div>

          <div className="search-pill-field">
            <span className="search-magnifier-symbol">⌕</span>
            <input
              type="text"
              placeholder="Search by name, district, breed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-inner-input"
              aria-label="Search pet notices"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-reset-cross"
                onClick={() => setSearchTerm('')}
                aria-label="Clear pet search"
              >
                ✕
              </button>
            )}
          </div>
        </header>
        <section className="notices-filter-toolbar" aria-label="Search filters">
          <div className="filter-pill-scroller">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`filter-selector-pill ${categoryTab === c.id ? 'active' : ''}`}
                onClick={() => setCategoryTab(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="secondary-controls-row">
            <div className="dropdown-pills-cluster">
              <label htmlFor="notices-species-select" className="sr-only">Species</label>
              <select
                id="notices-species-select"
                value={speciesChoice}
                onChange={(e) => setSpeciesChoice(e.target.value)}
                className="filter-select-control"
              >
                {speciesOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <label htmlFor="notices-gender-select" className="sr-only">Gender</label>
              <select
                id="notices-gender-select"
                value={genderChoice}
                onChange={(e) => setGenderChoice(e.target.value)}
                className="filter-select-control"
              >
                {genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {(searchTerm || categoryTab !== 'all' || speciesChoice !== 'all' || genderChoice !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryTab('all');
                  setSpeciesChoice('all');
                  setGenderChoice('all');
                }}
                className="reset-filters-button"
              >
                Clear all filters
              </button>
            )}
          </div>
        </section>
        {isLoading && notices.length === 0 ? (
          <div className="state-empty-box" role="status">
            <span className="state-empty-symbol">⏳</span>
            <h2 className="state-empty-title">Loading pet notices…</h2>
          </div>
        ) : loadError && notices.length === 0 ? (
          <div className="state-empty-box" role="alert">
            <span className="state-empty-symbol">⚠️</span>
            <h2 className="state-empty-title">Unable to load pet notices</h2>
            <p className="state-empty-desc">{loadError}</p>
            <button type="button" onClick={() => setPage(1)} className="btn-primary-filled">Try again</button>
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
                    <span className="notice-category-badge">
                      {pet.category === 'free' ? 'In good hands' : pet.category === 'sell' ? 'For sale' : 'Found'}
                    </span>
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
                      {isFav ? '♥' : '♡'}
                    </button>
                  </div>

                  <div className="notice-content-body">
                    <div className="notice-heading-row">
                      <h2 className="notice-pet-name">{pet.name}</h2>
                      <div className="notice-rating-chip">
                        <span className="star-symbol">★</span>
                        <span>{pet.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="notice-spec-pills-row">
                      <div className="spec-pill">
                        <span className="spec-label">Species:</span>
                        <span className="spec-val">{pet.species}</span>
                      </div>
                      <div className="spec-pill">
                        <span className="spec-label">Sex:</span>
                        <span className="spec-val">{pet.gender}</span>
                      </div>
                      <div className="spec-pill">
                        <span className="spec-label">Birthday:</span>
                        <span className="spec-val">{pet.birthday}</span>
                      </div>
                      <div className="spec-pill">
                        <span className="spec-label">Location:</span>
                        <span className="spec-val">{pet.location}</span>
                      </div>
                    </div>

                    <p className="notice-summary-desc">{pet.description}</p>

                    <div className="notice-action-row">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            setAuthPromptOpen(true);
                            return;
                          }
                          setFocusedPet(pet);
                        }}
                        className="btn-primary-filled full-width"
                      >
                        Learn more
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {page < totalPages && (
            <div className="load-more-wrapper">
              <button
                type="button"
                onClick={() => setPage((previous) => previous + 1)}
                disabled={isLoading}
                className="btn-auth-outline"
              >
                {isLoading ? 'Loading notices...' : 'Load more notices'}
              </button>
            </div>
          )}
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
                setSearchTerm('');
                setCategoryTab('all');
                setSpeciesChoice('all');
                setGenderChoice('all');
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
                    <a
                      href={`mailto:adoption@petlove.org?subject=Inquiry regarding ${focusedPet.name}`}
                      className="btn-primary-filled"
                    >
                      Contact shelter
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
function FriendsPage() {
  const [partnerQuery, setPartnerQuery] = useState('');
  const [friends, setFriends] = useState<ShelterFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;
    friendsApi.list()
      .then((response) => {
        if (isActive) setFriends(response.map(shelterFriendFromApi));
      })
      .catch((error) => {
        if (isActive) setLoadError(getApiErrorMessage(error, 'Unable to load our partners right now.'));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      return (
        friend.name.toLowerCase().includes(partnerQuery.toLowerCase()) ||
        friend.address.toLowerCase().includes(partnerQuery.toLowerCase())
      );
    });
  }, [friends, partnerQuery]);

  return (
    <div className="layout-page-container standard-page-layout">
      <HeaderBar />

      <main className="content-readable-area">
        <header className="page-header-row">
          <div>
            <h1 className="page-headline-title">Our friends</h1>
            <p className="page-subline-text">
              Trusted shelters, veterinary hospitals, and voluntary rescue networks.
            </p>
          </div>

          <div className="search-pill-field">
            <span className="search-magnifier-symbol">⌕</span>
            <input
              type="text"
              placeholder="Search shelter or city..."
              value={partnerQuery}
              onChange={(e) => setPartnerQuery(e.target.value)}
              className="search-inner-input"
              aria-label="Search friends and shelters"
            />
            {partnerQuery && (
              <button
                type="button"
                className="search-reset-cross"
                onClick={() => setPartnerQuery('')}
                aria-label="Clear partner search"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="state-empty-box" role="status">
            <span className="state-empty-symbol">⏳</span>
            <h2 className="state-empty-title">Loading partners…</h2>
          </div>
        ) : loadError ? (
          <div className="state-empty-box" role="alert">
            <span className="state-empty-symbol">⚠️</span>
            <h2 className="state-empty-title">Unable to load partners</h2>
            <p className="state-empty-desc">{loadError}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-primary-filled">Try again</button>
          </div>
        ) : filteredFriends.length > 0 ? (
          <div className="friends-grid-layout">
            {filteredFriends.map((partner) => (
              <article key={partner.id} className="partner-card">
                <div className="partner-top-header">
                  <img src={partner.imageUrl} alt={partner.name} className="partner-avatar-img" />
                  <div>
                    <h2 className="partner-name-heading">{partner.name}</h2>
                    <span className="partner-status-tag">{partner.status}</span>
                  </div>
                </div>

                <div className="partner-info-list">
                  <div className="partner-info-item">
                    <span className="info-key">Hours:</span>
                    <span className="info-val">{partner.time}</span>
                  </div>
                  <div className="partner-info-item">
                    <span className="info-key">Address:</span>
                    {partner.addressUrl ? (
                      <a href={partner.addressUrl} target="_blank" rel="noreferrer" className="info-link">
                        {partner.address}
                      </a>
                    ) : (
                      <span className="info-val">{partner.address}</span>
                    )}
                  </div>
                  <div className="partner-info-item">
                    <span className="info-key">Email:</span>
                    {partner.email ? (
                      <a href={`mailto:${partner.email}`} className="info-link">
                        {partner.email}
                      </a>
                    ) : (
                      <span className="info-val">Not provided</span>
                    )}
                  </div>
                  <div className="partner-info-item">
                    <span className="info-key">Phone:</span>
                    {partner.phone ? (
                      <a href={`tel:${partner.phone}`} className="info-link">
                        {partner.phone}
                      </a>
                    ) : (
                      <span className="info-val">Not provided</span>
                    )}
                  </div>
                </div>

                <div className="partner-card-footer">
                  <a
                    href={partner.url || partner.addressUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-auth-outline full-width text-center"
                  >
                    Visit official portal ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="state-empty-box">
            <span className="state-empty-symbol">🏥</span>
            <h2 className="state-empty-title">No partner organizations found</h2>
            <p className="state-empty-desc">
              We couldn&apos;t find any verified partners matching &ldquo;{partnerQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setPartnerQuery('')}
              className="btn-primary-filled"
            >
              Show all partners
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
function ProfilePage() {
  const { currentUser, setCurrentUser, userPets, removeUserPet, favoriteIds, toggleFavorite } = useAppStore();
  const [activeProfileTab, setActiveProfileTab] = useState<'pets' | 'favorites'>('pets');
  const [isEditing, setIsEditing] = useState(false);
  const [favoriteNotices, setFavoriteNotices] = useState<PetNotice[]>([]);

  React.useEffect(() => {
    let isActive = true;
    if (!currentUser || favoriteIds.length === 0) {
      setFavoriteNotices([]);
      return () => {
        isActive = false;
      };
    }

    Promise.all(favoriteIds.map((id) => noticesApi.byId(id).then(petNoticeFromApi).catch(() => null)))
      .then((items) => {
        if (isActive) setFavoriteNotices(items.filter((item): item is PetNotice => item !== null));
      });

    return () => {
      isActive = false;
    };
  }, [currentUser, favoriteIds]);

  if (!currentUser) {
    return (
      <div className="layout-page-container standard-page-layout">
        <HeaderBar />
        <main className="content-readable-area">
          <div className="state-empty-box">
            <span className="state-empty-symbol">🔒</span>
            <h2 className="state-empty-title">Sign in to view your profile</h2>
            <p className="state-empty-desc">
              Manage your registered pets, view saved favorites, and update your personal information.
            </p>
            <div className="auth-buttons-inline">
              <Link to="/login" className="btn-primary-filled">
                LOG IN
              </Link>
              <Link to="/register" className="btn-auth-outline">
                REGISTRATION
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
    imageUrl: Yup.string().url('Please enter a valid image URL').required('Image URL is required'),
    comments: Yup.string().min(10, 'Please write a brief description').required('Comments are required'),
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
              comments: '',
            }}
            validationSchema={addPetSchema}
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                await usersApi.addPet({
                  name: values.name,
                  title: values.title,
                  imgURL: values.imageUrl,
                  species: values.species.toLowerCase() as NoticeSpecies,
                  birthday: values.birthday,
                  sex: values.sex.toLowerCase() as NoticeSex,
                });
                addUserPet({
                  name: values.name,
                  species: values.species,
                  birthday: values.birthday,
                  sex: values.sex,
                  imageUrl: values.imageUrl,
                  comments: values.comments,
                });
                setSuccessBanner(true);
                window.setTimeout(() => navigate('/profile'), 600);
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
                      <option value="Other">Other</option>
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
                    placeholder="https://images.unsplash.com/..."
                    className={`text-input-field ${touched.imageUrl && errors.imageUrl ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="imageUrl" component="div" className="input-error-caption" />
                </div>

                <div className="input-field-group">
                  <label htmlFor="pet-comments-input" className="input-field-label">
                    Comments & Description
                  </label>
                  <Field
                    id="pet-comments-input"
                    as="textarea"
                    rows={4}
                    name="comments"
                    placeholder="Tell us about food habits, personality, medical info..."
                    className={`text-input-field textarea-field ${touched.comments && errors.comments ? 'has-error' : ''}`}
                  />
                  <ErrorMessage name="comments" component="div" className="input-error-caption" />
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userPets, setUserPets] = useState<UserPetRecord[]>([]);

  React.useEffect(() => {
    let isActive = true;
    const token = getStoredToken();

    if (!token) {
      setIsSessionReady(true);
      return () => {
        isActive = false;
      };
    }

    usersApi.full()
      .then((user) => {
        if (!isActive) return;
        setCurrentUser(userProfileFromApi(user));
        setFavoriteIds((user.noticesFavorites || []).map((notice) => notice._id));
        setUserPets(userPetsFromApi(user.pets));
      })
      .catch(() => {
        if (isActive) setCurrentUser(null);
      })
      .finally(() => {
        if (isActive) setIsSessionReady(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const toggleFavorite = (id: string) => {
    const isCurrentlyFavorite = favoriteIds.includes(id);
    setFavoriteIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

    if (currentUser) {
      const request = isCurrentlyFavorite
        ? noticesApi.removeFavorite(id)
        : noticesApi.addFavorite(id);
      request.catch(() => {
        setFavoriteIds((prev) => isCurrentlyFavorite ? [...prev, id] : prev.filter((item) => item !== id));
      });
    }
  };

  const addUserPet = (pet: Omit<UserPetRecord, 'id'>) => {
    const newRecord: UserPetRecord = {
      ...pet,
      id: `pet-${Date.now()}`
    };
    setUserPets((prev) => [newRecord, ...prev]);
  };

  const removeUserPet = async (id: string) => {
    if (!currentUser) {
      setUserPets((prev) => prev.filter((p) => p.id !== id));
      return;
    }

    try {
      const updatedUser = await usersApi.removePet(id);
      setUserPets(userPetsFromApi(updatedUser.pets));
    } catch {
      setUserPets((prev) => prev);
    }
  };

  const clearPrivateData = () => {
    setFavoriteIds([]);
    setUserPets([]);
  };

  if (!isSessionReady) {
    return <div className="app-session-loading" role="status">Loading your Petlove session…</div>;
  }

  return (
    <AppStoreContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        favoriteIds,
        toggleFavorite,
        userPets,
        addUserPet,
        removeUserPet,
        clearPrivateData,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage header={<HeaderBar variant="hero" />} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/add-pet" element={<AddPetPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppStoreContext.Provider>
  );
}
