import { useEffect, useState } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { citiesApi, noticesApi, getApiErrorMessage, type NoticeQuery } from './api';
import Icon from './Icon';
import './notices.css';

type Option = { value: string; label: string };
export type NoticeFiltersValue = Pick<NoticeQuery, 'keyword' | 'category' | 'sex' | 'species' | 'locationId'> & { sort?: string };
const label = (value: string) => value === 'free' ? 'In good hands' : value === 'sell' ? 'Sell' : value.charAt(0).toUpperCase() + value.slice(1);

export default function NoticeFilters({ value, onChange }: { value: NoticeFiltersValue; onChange: (value: NoticeFiltersValue) => void }) {
  const [keyword, setKeyword] = useState(value.keyword || '');
  const [options, setOptions] = useState<{ categories: Option[]; sexes: Option[]; species: Option[] }>({ categories: [], sexes: [], species: [] });
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [city, setCity] = useState<Option | null>(null);
  useEffect(() => { setKeyword(value.keyword || ''); }, [value.keyword]);
  useEffect(() => { if (!value.locationId) setCity(null); }, [value.locationId]);
  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([noticesApi.categories(), noticesApi.sex(), noticesApi.species()])
      .then(([categories, sexes, species]) => {
        if (active) setOptions(Object.fromEntries(Object.entries({ categories, sexes, species }).map(([key, values]) => [key, values.map(value => ({ value, label: label(value) }))])) as typeof options);
      })
      .catch(reason => { if (active) setError(getApiErrorMessage(reason, 'Unable to load filter options.')); });
    return () => { active = false; };
  }, [retry]);
  const update = (key: keyof NoticeFiltersValue, next?: string) => onChange({ ...value, [key]: next });
  const fields = [
    { key: 'category' as const, placeholder: 'Category', options: options.categories },
    { key: 'sex' as const, placeholder: 'By gender', options: options.sexes },
    { key: 'species' as const, placeholder: 'By type', options: options.species },
  ];
  return <section className="notice-filters" aria-label="Search filters">
    <div className="notice-filter-fields">
      <form className="notice-search" onSubmit={event => { event.preventDefault(); update('keyword', keyword.trim() || undefined); }}>
        <input aria-label="Search pet notices" placeholder="Search" value={keyword} onChange={event => setKeyword(event.target.value)} />
        {keyword && <button type="button" aria-label="Clear pet search" onClick={() => { setKeyword(''); update('keyword'); }}>×</button>}
        <button type="submit" aria-label="Submit pet search"><Icon name="search" /></button>
      </form>
      {fields.map(field => <Select<Option> key={field.key} inputId={`notice-${field.key}`} aria-label={field.placeholder} className={`notice-select notice-select-${field.key}`} classNamePrefix="pet-select" placeholder={field.placeholder} options={field.options} isClearable isSearchable={false} value={field.options.find(option => option.value === value[field.key]) || null} onChange={option => update(field.key, option?.value)} />)}
      <AsyncSelect<Option> inputId="notice-location" aria-label="Location" components={{ DropdownIndicator: () => <span className="location-search-icon"><Icon name="search" /></span> }} className="notice-select notice-select-location" classNamePrefix="pet-select" placeholder="Location" isClearable cacheOptions value={city} noOptionsMessage={({ inputValue }) => inputValue.length < 3 ? 'Enter at least 3 letters' : 'No cities found'} loadOptions={async input => {
        if (input.trim().length < 3) return [];
        try {
          const cities = await citiesApi.search(input.trim());
          setError('');
          return cities.map(item => ({ value: item._id, label: `${item.cityEn}, ${item.stateEn}` }));
        } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to search cities.')); return []; }
      }} onChange={option => { setCity(option); update('locationId', option?.value); }} />
    </div>
    <div className="notice-sort-row" role="radiogroup" aria-label="Sort notices">
      {['Popular', 'Unpopular', 'Cheap', 'Expensive'].map(sort => <button key={sort} type="button" role="radio" aria-checked={value.sort === sort} tabIndex={value.sort === sort || (!value.sort && sort === 'Popular') ? 0 : -1} onKeyDown={event => {
        const sorts = ['Popular', 'Unpopular', 'Cheap', 'Expensive'];
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        const index = (sorts.indexOf(sort) + direction + sorts.length) % sorts.length;
        update('sort', sorts[index]);
        const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
        buttons?.[index].focus();
      }} onClick={() => update('sort', value.sort === sort ? undefined : sort)}>{sort}{value.sort === sort && <span aria-hidden="true"> ×</span>}</button>)}
      {Object.values(value).some(Boolean) && <button className="notice-reset" type="button" onClick={() => onChange({})}>Reset</button>}
    </div>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(previous => previous + 1)}>Retry</button></p>}
  </section>;
}
