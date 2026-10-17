type PetBlockProps = { variant: 'login' | 'register' };

export default function PetBlock({ variant }: PetBlockProps) {
  const isLogin = variant === 'login';
  const pet = isLogin
    ? {
        name: 'Rich',
        birthday: '21.09.2020',
        emoji: '🐶',
        text: 'Rich would be the perfect addition to an active family that loves to play and go on walks. I bet he would love having a doggy playmate too!',
      }
    : {
        name: 'Jack',
        birthday: '18.10.2021',
        emoji: '🐈',
        text: 'Jack is a gray Persian cat with green eyes. He loves to be pampered and groomed, and enjoys playing with toys.',
      };

  return (
    <aside className={`pet-block pet-block-${variant}`} aria-label={pet.name}>
      <img className="pet-block-background" src={`${import.meta.env.BASE_URL}images/pet-background.svg`} alt="" />
      <div className="pet-block-photo">
        <img src={`${import.meta.env.BASE_URL}images/${variant}-1x.webp`} srcSet={`${import.meta.env.BASE_URL}images/${variant}-1x.webp 1x, ${import.meta.env.BASE_URL}images/${variant}-2x.webp 2x`} alt={isLogin ? 'A golden retriever' : 'A gray Persian cat'} />
      </div>
      <div className="pet-block-card">
        <span className="pet-block-emoji" aria-hidden="true">{pet.emoji}</span>
        <div className="pet-block-info">
          <div className="pet-block-details">
            <strong>{pet.name}</strong>
            <p><span>Birthday: </span>{pet.birthday}</p>
          </div>
          <p>{pet.text}</p>
        </div>
      </div>
    </aside>
  );
}
