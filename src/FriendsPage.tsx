import { useEffect, useState, type ReactNode } from 'react';
import { friendsApi, getApiErrorMessage, type Friend } from './api';
import { friendHours } from './friendHours';
import Title from './Title';
import './friends.css';

function FriendCard({ friend }: { friend: Friend }) {
  return <article className="friend-card">
    <a className="friend-logo" href={friend.url} target="_blank" rel="noopener noreferrer" aria-label={`${friend.title} website`}>
      <img src={friend.imageUrl} alt="" width="90" height="90" loading="lazy" />
    </a>
    <h2 className="friend-title"><a href={friend.url} target="_blank" rel="noopener noreferrer" title={friend.title}>{friend.title}</a></h2>
    <span className="friend-hours">{friendHours(friend.workDays)}</span>
    <dl className="friend-contacts">
      <div><dt>Email:</dt><dd>{friend.email ? <a href={`mailto:${friend.email}`} title={friend.email}>{friend.email}</a> : <span>Not provided</span>}</dd></div>
      <div><dt>Address:</dt><dd>{friend.address && friend.addressUrl ? <a href={friend.addressUrl} title={friend.address} target="_blank" rel="noopener noreferrer">{friend.address}</a> : friend.address ? <span title={friend.address}>{friend.address}</span> : <a href={friend.url} target="_blank" rel="noopener noreferrer">Website only</a>}</dd></div>
      <div><dt>Phone:</dt><dd>{friend.phone ? <a href={`tel:${friend.phone}`} title={friend.phone}>{friend.phone}</a> : <span>Not provided</span>}</dd></div>
    </dl>
  </article>;
}

export default function FriendsPage({ header }: { header: ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    friendsApi.list().then(result => { if (active) setFriends(result); })
      .catch(reason => { if (active) setError(getApiErrorMessage(reason, 'Unable to load our friends. Please try again.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  return <div className="layout-page-container friends-page">
    {header}
    <main className="friends-content">
      <Title>Our friends</Title>
      {loading ? <p role="status">Loading our friends…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="btn-auth-outline" onClick={() => setRetry(previous => previous + 1)}>Try again</button></div> : friends.length ? <div className="friend-list">{friends.map(friend => <FriendCard key={friend._id} friend={friend} />)}</div> : <p>No partners available yet.</p>}
    </main>
  </div>;
}
