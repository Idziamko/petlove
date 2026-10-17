import { Navigate, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Icon from './Icon';
import HeaderBar from './HeaderBar';
import { useAppStore } from './store';
import { focusUrlField } from './formUtils';
import { getApiErrorMessage, type NoticeSex, type NoticeSpecies } from './api';

export default function AddPetPage() {
  const { addUserPet, currentUser, notifyError } = useAppStore();
  const navigate = useNavigate();
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
          <img src={`${import.meta.env.BASE_URL}images/add-pet-art-1x.webp`} srcSet={`${import.meta.env.BASE_URL}images/add-pet-art-1x.webp 1x, ${import.meta.env.BASE_URL}images/add-pet-art-2x.webp 2x`} alt="" />
          <div className="add-pet-art-shape" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/add-pet-shape.svg)` }} />
        </section>
        <section className="add-pet-form-card">
          <header className="add-pet-heading">
            <h1>Add my pet / <span>Personal details</span></h1>
          </header>

          <Formik
            initialValues={{
              title: '',
              name: '',
              birthday: '',
              species: '',
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
                navigate('/profile', { replace: true });
              } catch (error) {
                const message = getApiErrorMessage(error, 'Unable to save this pet right now.');
                setStatus(message);
                notifyError(message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched, status, values }) => (
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
                    <Icon name="female" width="24" height="24" className="add-pet-sex-icon-default" />
                    <Icon name="female-selected" width="24" height="24" className="add-pet-sex-icon-selected" />
                  </label>
                  <label className="add-pet-sex-option add-pet-sex-male">
                    <Field type="radio" name="sex" value="Male" aria-label="Male" />
                    <Icon name="male" width="24" height="24" className="add-pet-sex-icon-default" />
                    <Icon name="male-selected" width="24" height="24" className="add-pet-sex-icon-selected" />
                  </label>
                  <label className="add-pet-sex-option add-pet-sex-multiple">
                    <Field type="radio" name="sex" value="Multiple" aria-label="Multiple" />
                    <Icon name="multiple" width="17.9993" height="16" className="add-pet-sex-icon-default" />
                    <Icon name="multiple-selected" width="17.9993" height="16" className="add-pet-sex-icon-selected" />
                  </label>
                </div>
                <ErrorMessage name="sex" component="div" className="input-error-caption add-pet-sex-error" />

                <div className="add-pet-photo-row">
                  <div className="add-pet-photo-preview" aria-hidden="true">
                    {values.imageUrl ? <img src={values.imageUrl} alt="" /> : <Icon name="paw" width="44" height="44" />}
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
                    <button
                      type="button"
                      className="add-pet-upload-button"
                      aria-label="Paste a pet image URL"
                      title="Paste a direct image URL"
                      onClick={() => focusUrlField('pet-image-input')}
                    >
                      Upload photo <Icon name="upload-cloud" width="18" height="18" />
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
                      <Icon name="calendar" width="20" height="20" className="add-pet-calendar-icon" />
                    </div>
                    <ErrorMessage name="birthday" component="div" className="input-error-caption" />
                  </div>

                  <div className="input-field-group add-pet-species-field">
                    <Field
                      id="pet-species-select"
                      as="select"
                      name="species"
                      className="filter-select-control w-full"
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="" disabled>Type of pet</option>
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
                    <Icon name="chevron-down" className="add-pet-species-arrow" width="20" height="20" />
                    <ErrorMessage name="species" component="div" className="input-error-caption" />
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
