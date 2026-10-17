export default function Icon({ name, className = '', width, height }: { name: string; className?: string; width?: string; height?: string }) {
  return <svg className={className} width={width} height={height} fill="none" aria-hidden="true" focusable="false"><use href={`${import.meta.env.BASE_URL}icons/sprite.svg#${name}`} /></svg>;
}
