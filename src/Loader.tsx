import { useEffect, useState } from 'react';
import Icon from './Icon';
import './loader.css';

export default function Loader({ progress }: { progress?: number }) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  useEffect(() => {
    const update = (event: Event) => setDownloadProgress((event as CustomEvent<number>).detail);
    window.addEventListener('petlove:download-progress', update);
    return () => window.removeEventListener('petlove:download-progress', update);
  }, []);
  const percentage = Math.max(0, Math.min(100, Math.round(progress ?? downloadProgress)));
  return <div className="loading-screen" role="progressbar" aria-label="Loading Petlove" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
    <img className="loading-photo" src={`${import.meta.env.BASE_URL}images/loading.webp`} alt="" />
    <div className="loading-shade" />
    <div className="loading-indicator">
      <div className="loading-rings"><Icon name="loading-ring-mobile" className="loading-ring loading-ring-mobile" /><Icon name="loading-ring" className="loading-ring loading-ring-desktop" /></div>
      <span>{percentage}%</span>
    </div>
  </div>;
}
