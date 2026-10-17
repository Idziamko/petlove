export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={className} fill="none" aria-hidden="true" focusable="false"><use href={`${import.meta.env.BASE_URL}icons/sprite.svg#${name}`} /></svg>;
}
