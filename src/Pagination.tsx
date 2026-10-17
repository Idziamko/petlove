import Icon from './Icon';
import './pagination.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, disabled = false, onChange }: PaginationProps) {
  if (totalPages < 2) return null;
  const first = Math.max(1, Math.min(page - 1, totalPages - 2));
  const numbers = Array.from({ length: Math.min(3, totalPages) }, (_, index) => first + index);

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-arrows">
        <button type="button" aria-label="First page" disabled={disabled || page === 1} onClick={() => onChange(1)}><Icon name="page-first" /></button>
        <button type="button" aria-label="Previous page" disabled={disabled || page === 1} onClick={() => onChange(page - 1)}><Icon name="page-previous" /></button>
      </div>
      <div className="pagination-numbers">
        {numbers.map((number) => <button type="button" key={number} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined} disabled={disabled} onClick={() => onChange(number)}>{number}</button>)}
        {numbers[numbers.length - 1] < totalPages && <span className="pagination-ellipsis" aria-hidden="true">…</span>}
      </div>
      <div className="pagination-arrows">
        <button type="button" aria-label="Next page" disabled={disabled || page === totalPages} onClick={() => onChange(page + 1)}><Icon name="page-next" /></button>
        <button type="button" aria-label="Last page" disabled={disabled || page === totalPages} onClick={() => onChange(totalPages)}><Icon name="page-last" /></button>
      </div>
    </nav>
  );
}
