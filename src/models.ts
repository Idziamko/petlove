import type { CurrentUser, Friend, NewsItem, Notice } from './api';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string;
}

export interface PetNotice {
  id: string;
  title: string;
  name: string;
  species: string;
  category: string;
  gender: string;
  birthday: string;
  location: string;
  rating: number;
  imageUrl: string;
  description: string;
  price?: string;
  contact?: string;
}

export interface NewsStory {
  id: string;
  title: string;
  snippet: string;
  category: string;
  date: string;
  imageUrl: string;
  url?: string;
}

export interface ShelterFriend {
  id: string;
  name: string;
  status: string;
  time: string;
  address: string;
  addressUrl?: string;
  url?: string;
  email: string;
  phone: string;
  imageUrl: string;
}

export interface UserPetRecord {
  id: string;
  name: string;
  species: string;
  birthday: string;
  sex: string;
  comments: string;
  imageUrl: string;
}

export function petNoticeFromApi(notice: Notice, locationNames: Record<string, string> = {}): PetNotice {
  const location = typeof notice.location === 'string'
    ? locationNames[notice.location] || notice.location
    : `${notice.location.cityEn}, ${notice.location.stateEn}`;
  const author = typeof notice.user === 'object' ? notice.user : undefined;

  return {
    id: notice._id,
    title: notice.title,
    name: notice.name,
    species: notice.species,
    category: notice.category,
    gender: notice.sex,
    birthday: notice.birthday,
    location,
    rating: Number(notice.popularity) || 0,
    imageUrl: notice.imageUrl || notice.imgURL || notice.imgUrl || `${import.meta.env.BASE_URL}images/home.webp`,
    description: notice.comment,
    price: typeof notice.price === 'number' ? `$${notice.price}` : undefined,
    contact: author?.phone ? `tel:${author.phone}` : author?.email ? `mailto:${author.email}` : undefined,
  };
}

export function newsStoryFromApi(item: NewsItem): NewsStory {
  return {
    id: item._id,
    title: item.title,
    snippet: item.text,
    category: 'Guidance',
    date: item.date,
    imageUrl: item.imgUrl,
    url: item.url,
  };
}

export function shelterFriendFromApi(friend: Friend): ShelterFriend {
  const openDay = friend.workDays?.find((day) => day.isOpen);
  return {
    id: friend._id,
    name: friend.title,
    status: 'Verified partner',
    time: openDay ? `${openDay.from || ''} – ${openDay.to || ''}`.trim() : 'By appointment',
    address: friend.address || 'Address unavailable',
    addressUrl: friend.addressUrl || undefined,
    url: friend.url,
    email: friend.email || '',
    phone: friend.phone || '',
    imageUrl: friend.imageUrl,
  };
}

export function userPetsFromApi(pets: CurrentUser['pets'] = []): UserPetRecord[] {
  return pets.map((pet) => ({
    id: pet._id,
    name: pet.name,
    species: pet.species,
    birthday: pet.birthday,
    sex: pet.sex,
    comments: pet.title,
    imageUrl: pet.imgURL,
  }));
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
export function userProfileFromApi(user: { name: string; email: string; phone?: string; avatar?: string }): UserProfile {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar || '',
  };
}
