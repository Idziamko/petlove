import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Title from './Title';
import NoticeFilters, { type NoticeFiltersValue } from './NoticeFilters';
import Pagination from './Pagination';
import Icon from './Icon';
import Loader from './Loader';
import HeaderBar from './HeaderBar';
import { useAppStore } from './store';
import { useDialogA11y } from './useDialogA11y';
import { petNoticeFromApi, type PetNotice } from './models';
import { citiesApi, getApiErrorMessage, noticesApi } from './api';

export default function NoticesPage() {
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
    const isFirstFavorite = favoriteIds.length === 0;
    const updated = await toggleFavorite(id);
    if (updated && !wasFavorite && isFirstFavorite) {
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
                      <Icon name="heart-outline" />
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
              className="notice-modal-card"
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
                <Icon name="modal-close" width="24" height="24" />
              </button>

              <div className="notice-modal-image">
                <img src={focusedPet.imageUrl} alt={focusedPet.name} />
                <span className="notice-modal-badge">{focusedPet.category}</span>
              </div>
              <h2 className="notice-modal-title">{focusedPet.title}</h2>
              <div className="notice-modal-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon key={star} name="star" className={star <= Math.round(focusedPet.rating) ? '' : 'star-empty'} width="16" height="16" />
                ))}
                <span>{focusedPet.rating}</span>
              </div>
              <div className="notice-modal-specs">
                {[['Name', focusedPet.name], ['Birthday', focusedPet.birthday ? focusedPet.birthday.split('-').reverse().join('.') : 'Unknown'], ['Sex', focusedPet.gender], ['Species', focusedPet.species]].map(([label, value]) => (
                  <div key={label}><small>{label}</small><span>{value}</span></div>
                ))}
              </div>
              <p className="notice-modal-comment">{focusedPet.description}</p>
              {focusedPet.price && <p className="notice-modal-price">{focusedPet.price}</p>}
              <div className="notice-modal-actions">
                <button type="button" className="notice-modal-favorite" onClick={() => handleFavoriteToggle(focusedPet.id)}>
                  {favoriteIds.includes(focusedPet.id) ? 'Remove from' : 'Add to'}
                  <Icon name="heart-outline" width="18" height="18" />
                </button>
                {focusedPet.contact ? (
                  <a href={focusedPet.contact} className="notice-modal-contact">Contact</a>
                ) : (
                  <span className="notice-modal-contact notice-modal-contact-disabled">Contact</span>
                )}
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
                <Icon name="modal-close" width="24" height="24" />
              </button>
              <div className="attention-modal-content">
                <div className="attention-modal-icon">
                  <Icon name="modal-emoji-circle" width="80" height="80" />
                  <span aria-hidden="true">🐶</span>
                </div>
                <div className="attention-modal-copy">
                  <div className="attention-modal-text">
                    <h2>Attention</h2>
                    <p>We would like to remind you that certain functionality is available only to authorized users. If you have an account, please log in with your credentials. If you do not already have an account, you must register to access these features.</p>
                  </div>
                  <div className="auth-buttons-inline">
                    <Link to="/login" className="btn-primary-filled" onClick={() => setAuthPromptOpen(false)}>Log In</Link>
                    <Link to="/register" className="btn-auth-outline" onClick={() => setAuthPromptOpen(false)}>Registration</Link>
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
                <Icon name="modal-close" width="24" height="24" />
              </button>
              <div className="congrats-modal-content">
                <div className="attention-modal-icon">
                  <Icon name="modal-emoji-circle" width="80" height="80" />
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
