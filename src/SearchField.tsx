import Icon from './Icon';

interface SearchFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  className: string;
  clearClassName?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export default function SearchField({
  id,
  label,
  value,
  placeholder = 'Search',
  className,
  clearClassName,
  onChange,
  onSubmit,
  onClear,
}: SearchFieldProps) {
  return (
    <form className={className} onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type="search" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      {value && <button className={clearClassName} type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={onClear}>×</button>}
      <button type="submit" aria-label={`Search ${label.toLowerCase()}`}><Icon name="search" /></button>
    </form>
  );
}
