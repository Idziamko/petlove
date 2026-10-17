import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './not-found.css';

export default function NotFoundPage({ header }: { header: ReactNode }) {
  return <div className="layout-page-container not-found-page">
    {header}
    <main className="not-found-panel">
      <div className="not-found-content">
        <h1 className="not-found-number" aria-label="404">
          <span aria-hidden="true">4</span>
          <span className="not-found-circle" aria-hidden="true"><span className="not-found-image"><img src={`${import.meta.env.BASE_URL}images/not-found-1x.webp`} srcSet={`${import.meta.env.BASE_URL}images/not-found-1x.webp 1x, ${import.meta.env.BASE_URL}images/not-found-2x.webp 2x`} alt="" /></span></span>
          <span aria-hidden="true">4</span>
        </h1>
        <div className="not-found-message">
          <p>Ooops! This page not found :(</p>
          <Link to="/home">To home page</Link>
        </div>
      </div>
    </main>
  </div>;
}
