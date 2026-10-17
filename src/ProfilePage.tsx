import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Icon from './Icon';
import HeaderBar from './HeaderBar';
import { useAppStore } from './store';
import { useDialogA11y } from './useDialogA11y';
import { EMAIL_PATTERN, focusUrlField } from './formUtils';
import { userProfileFromApi, type PetNotice } from './models';
import { getApiErrorMessage, usersApi } from './api';

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
          <span className="profile-notice-rating"><Icon name="star" width="16" height="16" />{notice.rating}</span>
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
              <Icon name="trash" width="18" height="18" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProfilePage() {
  const { currentUser, setCurrentUser, userPets, removeUserPet, toggleFavorite, favoriteNotices, viewedNotices, notifyError } = useAppStore();
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
      const payload = {
        name: values.name,
        email: values.email,
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
        ...(values.avatar.trim() ? { avatar: values.avatar.trim() } : {}),
      };
      const updatedUser = await usersApi.edit(payload);
      setCurrentUser(userProfileFromApi(updatedUser));
      setIsEditing(false);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to update your profile right now.');
      setStatus(message);
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const notices = activeProfileTab === 'favorites' ? favoriteNotices : viewedNotices;

  return (
    <div className="layout-page-container standard-page-layout profile-page">
      <HeaderBar />
      <main className="profile-layout" aria-label="Profile">
        <aside className={`profile-side-card${userPets.length ? ' profile-side-card-has-pets' : ' profile-side-card-empty'}${currentUser.avatar ? ' profile-side-card-photo' : ''}`} aria-label="User Profile Details">
          <div className="profile-role-badge">User <Icon name="user-badge" width="18" height="18" /></div>
          <button type="button" className="profile-upload-button" onClick={() => setIsEditing(true)}>
            <span className="profile-upload-avatar">
              {currentUser.avatar ? <img className="profile-avatar-photo" src={currentUser.avatar} alt={currentUser.name} /> : <Icon name="user-02" width="50" height="50" />}
            </span>
            <span>Upload photo</span>
          </button>
          <button type="button" className="profile-edit-button" onClick={() => setIsEditing(true)} aria-label="Edit profile">
            <Icon name="edit" width="18" height="18" />
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
            <div className="profile-section-heading"><h2>My pets</h2><Link to="/add-pet">Add pet <Icon name="plus" width="18" height="18" /></Link></div>
            <div className="profile-pets-list">
              {userPets.map((pet) => (
                <article key={pet.id} className="profile-user-pet-card">
                  <img src={pet.imageUrl} alt={pet.name} className="profile-user-pet-image" />
                  <div className="profile-user-pet-copy">
                    <strong>{pet.title}</strong>
                    <div><span><small>Name</small>{pet.name}</span><span><small>Birthday</small>{profileDate(pet.birthday)}</span><span><small>Sex</small>{pet.sex}</span><span><small>Species</small>{pet.species}</span></div>
                  </div>
                  <button type="button" className="profile-user-pet-remove" onClick={() => removeUserPet(pet.id)} aria-label={`Remove ${pet.name}`}><Icon name="trash" width="18" height="18" /></button>
                </article>
              ))}
            </div>
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
              <Icon name="modal-close" width="24" height="24" />
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
              {({ isSubmitting, errors, touched, status, values }) => (
                <Form className="profile-edit-panel" noValidate>
                  <h2 id="profile-edit-title">Edit information</h2>
                  {status && <p className="input-error-caption" role="alert">{String(status)}</p>}
                    <div className="profile-edit-photo-block">
                      <div className="profile-edit-photo-preview">
                        {values.avatar ? <img src={values.avatar} alt="" /> : <Icon name="profile-user" width="50" height="50" />}
                      </div>
                      <div className="profile-edit-photo-controls">
                        <Field
                          id="edit-avatar-input"
                          name="avatar"
                          type="url"
                          aria-label="Avatar URL"
                          placeholder="Enter URL"
                          className={`profile-edit-url-input ${touched.avatar && errors.avatar ? 'has-error' : ''}`}
                        />
                        <button
                          type="button"
                          className="profile-edit-upload-button"
                          aria-label="Paste an avatar image URL"
                          title="Paste a direct image URL"
                          onClick={() => focusUrlField('edit-avatar-input')}
                        >
                          Upload photo <Icon name="upload-cloud" width="18" height="18" />
                        </button>
                      </div>
                    </div>
                    <ErrorMessage name="avatar" component="span" className="input-error-caption" />
                    <div className="profile-edit-fields">
                      <Field id="edit-name-input" name="name" type="text" aria-label="Name" className={touched.name && errors.name ? 'has-error' : ''} />
                      <ErrorMessage name="name" component="span" className="input-error-caption" />
                      <Field id="edit-email-input" name="email" type="email" aria-label="Email" className={touched.email && errors.email ? 'has-error' : ''} />
                      <ErrorMessage name="email" component="span" className="input-error-caption" />
                      <Field id="edit-phone-input" name="phone" type="tel" aria-label="Phone" placeholder="+380" className={touched.phone && errors.phone ? 'has-error' : ''} />
                      <ErrorMessage name="phone" component="span" className="input-error-caption" />
                    </div>
                    <button type="submit" className="profile-edit-save" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</button>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  );
}
