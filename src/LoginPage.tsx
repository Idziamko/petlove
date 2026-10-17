import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Icon from './Icon';
import PetBlock from './PetBlock';
import HeaderBar from './HeaderBar';
import { useAppStore } from './store';
import { EMAIL_PATTERN, isPasswordSecure } from './formUtils';
import { authApi, getApiErrorMessage } from './api';

export default function LoginPage() {
  const { currentUser, refreshUser, notifyError } = useAppStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .matches(EMAIL_PATTERN, 'Enter a valid Email')
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
                const message = getApiErrorMessage(error, 'Unable to sign in right now.');
                setStatus(message);
                notifyError(message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, errors, touched, status, values, setFieldValue }) => (
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
                  <div className="password-control-wrapper">
                    <Field
                      id="login-email-input"
                      name="email"
                      type="email"
                      placeholder="Email"
                      className={`text-input-field ${touched.email && errors.email ? 'has-error' : ''}`}
                    />
                    {touched.email && errors.email && (
                      <button type="button" className="field-icon-button" onClick={() => setFieldValue('email', '')} aria-label="Clear email">
                        <Icon name="cross-small" width="22" height="22" />
                      </button>
                    )}
                  </div>
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
                      className={`text-input-field ${touched.password && errors.password ? 'has-error' : ''} ${isPasswordSecure(touched.password, errors.password, values.password) ? 'has-success' : ''}`}
                    />
                    {isPasswordSecure(touched.password, errors.password, values.password) && <Icon name="check" className="field-check-icon" width="22" height="22" />}
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
                  {isPasswordSecure(touched.password, errors.password, values.password) && <div className="input-success-caption">Password is secure</div>}
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
