import Loader from './Loader';
import { useEffect, useState, type ReactNode } from 'react';
import { newsApi, getApiErrorMessage, type NewsItem } from './api';
import Pagination from './Pagination';
import SearchField from './SearchField';
import Title from './Title';
import './news.css';

export default function NewsPage({ header }: { header: ReactNode }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ keyword: '', page: 1 });
  const [stories, setStories] = useState<NewsItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    newsApi.list({ keyword: query.keyword || undefined, page: query.page, limit: 6 })
      .then((result) => {
        if (!active) return;
        setStories(result.results);
        setTotalPages(result.totalPages);
      })
      .catch((reason) => {
        if (active) setError(getApiErrorMessage(reason, 'Unable to load news. Please try again.'));
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [query, retry]);

  return (
    <div className="layout-page-container news-page">
      {header}
      <main className="news-content">
        <div className="news-heading">
          <Title>News</Title>
          <SearchField
            id="news-search"
            label="news"
            value={search}
            className="news-search"
            clearClassName="news-clear"
            onChange={setSearch}
            onSubmit={() => setQuery({ keyword: search.trim(), page: 1 })}
            onClear={() => { setSearch(''); setQuery({ keyword: '', page: 1 }); }}
          />
        </div>
        {isLoading ? <Loader /> : error ? (
          <div role="alert"><p>{error}</p><button type="button" className="btn-auth-outline" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
        ) : stories.length === 0 ? <p>No news found. Try another search.</p> : (
          <div className="news-cards">
            {stories.map((story) => (
              <article className="news-card" key={story._id}>
                <img className="news-image" src={story.imgUrl} alt="" loading="lazy" />
                <div className="news-text">
                  <h2>{story.title}</h2>
                  <p>{story.text}</p>
                </div>
                <div className="news-meta">
                  <time dateTime={story.date}>{new Date(story.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</time>
                  <a href={story.url} target="_blank" rel="noopener noreferrer">Read more</a>
                </div>
              </article>
            ))}
          </div>
        )}
        {!error && stories.length > 0 && <Pagination page={query.page} totalPages={totalPages} disabled={isLoading} onChange={(page) => setQuery((current) => ({ ...current, page }))} />}
      </main>
    </div>
  );
}
