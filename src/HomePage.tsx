import type { ReactNode } from 'react';
import './home.css';

export default function HomePage({ header }: { header: ReactNode }) {
  return (
    <main className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        {header}
        <h1 id="home-title" className="home-title">
          Take good <span>care</span> of your small pets
        </h1>
        <p className="home-description">
          Choosing a pet for your home is a choice that is meant to enrich your life
          with immeasurable joy and tenderness.
        </p>
      </section>
      <div className="home-photo">
        <img
          src={`${import.meta.env.BASE_URL}images/home.webp`}
          alt="A woman holding her dog outdoors"
        />
      </div>
    </main>
  );
}
