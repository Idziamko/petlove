import Loader from './Loader';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { getStoredToken, getApiErrorMessage, noticesApi, usersApi, type AddPetRequest, type CurrentUser } from './api';
import { petNoticeFromApi, userPetsFromApi, userProfileFromApi, type PetNotice, type UserPetRecord, type UserProfile } from './models';

interface AppStore {
  currentUser: UserProfile | null;
  setCurrentUser: Dispatch<SetStateAction<UserProfile | null>>;
  favoriteIds: string[];
  favoriteNotices: PetNotice[];
  viewedNotices: PetNotice[];
  userPets: UserPetRecord[];
  refreshUser: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addUserPet: (pet: AddPetRequest) => Promise<void>;
  removeUserPet: (id: string) => Promise<void>;
  clearPrivateData: () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('AppStoreProvider is missing');
  return store;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [startupProgress, setStartupProgress] = useState(0);
  const [favoriteNotices, setFavoriteNotices] = useState<PetNotice[]>([]);
  const [viewedNotices, setViewedNotices] = useState<PetNotice[]>([]);
  const [userPets, setUserPets] = useState<UserPetRecord[]>([]);
  const [error, setError] = useState('');
  const pendingFavorites = useRef(new Set<string>());

  const applyUser = useCallback((user: CurrentUser) => {
    setCurrentUser(userProfileFromApi(user));
    setFavoriteNotices((user.noticesFavorites || []).map((notice) => petNoticeFromApi(notice)));
    setViewedNotices((user.noticesViewed || []).map((notice) => petNoticeFromApi(notice)));
    setUserPets(userPetsFromApi(user.pets));
  }, []);

  const clearPrivateData = useCallback(() => {
    setCurrentUser(null);
    setFavoriteNotices([]);
    setViewedNotices([]);
    setUserPets([]);
    pendingFavorites.current.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const user = await usersApi.full();
    if (getStoredToken() === token) applyUser(user);
  }, [applyUser]);

  useEffect(() => {
    let active = true;
    const token = getStoredToken();
    const picture = new Image();
    const imageReady = new Promise<void>(resolve => {
      picture.onload = () => resolve();
      picture.onerror = () => resolve();
      picture.src = `${import.meta.env.BASE_URL}images/loading.webp`;
    });
    const tasks: Promise<unknown>[] = [imageReady, document.fonts.ready];
    if (token) tasks.push(usersApi.full().then(user => {
      if (active && getStoredToken() === token) applyUser(user);
    }).catch(reason => {
      if (active) setError(getApiErrorMessage(reason, 'Unable to restore your session. Please try again.'));
    }));
    let completed = 0;
    Promise.allSettled(tasks.map(task => task.finally(() => {
      completed += 1;
      if (active) setStartupProgress(completed / tasks.length * 100);
    }))).then(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, [applyUser]);

  useEffect(() => {
    const onExpired = () => {
      clearPrivateData();
      setError('Your session has expired. Please log in again.');
    };
    window.addEventListener('petlove:session-expired', onExpired);
    return () => window.removeEventListener('petlove:session-expired', onExpired);
  }, [clearPrivateData]);

  const toggleFavorite = async (id: string) => {
    if (!currentUser || pendingFavorites.current.has(id)) return;
    pendingFavorites.current.add(id);
    try {
      if (favoriteNotices.some((notice) => notice.id === id)) {
        await noticesApi.removeFavorite(id);
      } else {
        await noticesApi.addFavorite(id);
      }
      await refreshUser();
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Unable to update favorites. Please try again.'));
    } finally {
      pendingFavorites.current.delete(id);
    }
  };

  const addUserPet = async (pet: AddPetRequest) => {
    const token = getStoredToken();
    const user = await usersApi.addPet(pet);
    if (token && getStoredToken() === token) applyUser(user);
  };

  const removeUserPet = async (id: string) => {
    try {
      const token = getStoredToken();
      const user = await usersApi.removePet(id);
      if (token && getStoredToken() === token) applyUser(user);
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Unable to remove this pet. Please try again.'));
    }
  };

  if (!isReady) return <Loader progress={startupProgress} />;

  return (
    <AppStoreContext.Provider value={{ currentUser, setCurrentUser, favoriteIds: favoriteNotices.map((notice) => notice.id), favoriteNotices, viewedNotices, userPets, refreshUser, toggleFavorite, addUserPet, removeUserPet, clearPrivateData }}>
      {error && <div className="app-notification" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss notification" onClick={() => setError('')}>×</button></div>}
      {children}
    </AppStoreContext.Provider>
  );
}
