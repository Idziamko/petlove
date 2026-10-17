import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Icon from './Icon';
import PetBlock from './PetBlock';
import HeaderBar from './HeaderBar';
import { useAppStore } from './store';
import { EMAIL_PATTERN } from './formUtils';
import { authApi, getApiErrorMessage } from './api';

export default function RegisterPage() {
  const { currentUser, refreshUser, notifyError } = useAppStore();
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
                const message = getApiErrorMessage(error, 'Unable to create the account right now.');
                setStatus(message);
                notifyError(message);
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
                      <Icon name={showPassword ? 'eye' : 'eye-off'} width="22" height="22" />
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
