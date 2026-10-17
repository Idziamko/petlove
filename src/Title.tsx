import type { ReactNode } from 'react';
import './title.css';

export default function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h1 className={`page-title ${className}`}>{children}</h1>;
}
