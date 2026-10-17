import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import NotFoundPage from './NotFoundPage';
import NewsPage from './NewsPage';
import FriendsPage from './FriendsPage';
import HeaderBar from './HeaderBar';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import NoticesPage from './NoticesPage';
import ProfilePage from './ProfilePage';
import AddPetPage from './AddPetPage';
import { AppStoreProvider } from './store';

export default function App() {
  return (
    <AppStoreProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage header={<HeaderBar variant="hero" />} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/news" element={<NewsPage header={<HeaderBar />} />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/friends" element={<FriendsPage header={<HeaderBar />} />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/add-pet" element={<AddPetPage />} />
        <Route path="*" element={<NotFoundPage header={<HeaderBar />} />} />
      </Routes>
    </AppStoreProvider>
  );
}
