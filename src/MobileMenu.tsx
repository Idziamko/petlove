import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icon from './Icon';
import './mobile-menu.css';

export default function MobileMenu({ white, signedIn, onClose, onLogout }: { white: boolean; signedIn: boolean; onClose: () => void; onLogout: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('a, button');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [onClose]);
  return <div className="menu-backdrop" onClick={onClose}>
    <div ref={panel} className={`menu-panel${white ? ' menu-panel-white' : ''}`} role="dialog" aria-modal="true" aria-label="Navigation menu" onClick={event => event.stopPropagation()}>
      <button type="button" className="menu-close" aria-label="Close menu" onClick={onClose}><Icon name="menu-close-mobile" className="menu-close-mobile" /><Icon name="menu-close-tablet" className="menu-close-tablet" /></button>
      <nav className="menu-links" aria-label="Main navigation">
        {[['/news', 'News'], ['/notices', 'Find pet'], ['/friends', 'Our friends']].map(([path, label]) => <NavLink key={path} to={path} onClick={onClose} className={({ isActive }) => isActive ? 'menu-link menu-link-active' : 'menu-link'}>{label}</NavLink>)}
      </nav>
      <div className="menu-actions">
        {signedIn ? <button type="button" className="menu-registration" onClick={() => { onClose(); onLogout(); }}>LOG OUT</button> : <><Link className="menu-login" to="/login" onClick={onClose}>LOG IN</Link><Link className="menu-registration" to="/register" onClick={onClose}>REGISTRATION</Link></>}
      </div>
    </div>
  </div>;
}
