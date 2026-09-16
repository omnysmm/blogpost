import { useStore } from './store/useStore';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ContentGeneratorPage from './pages/ContentGeneratorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SocialPublishPage from './pages/SocialPublishPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import AdvertisingPage from './pages/AdvertisingPage';
import SupportPage from './pages/SupportPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import AdvertiserPage from './pages/AdvertiserPage';
import AdvertiserCabinetPage from './pages/AdvertiserCabinetPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const { currentPage, currentUser } = useStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'dashboard': return currentUser ? <DashboardPage /> : <AuthPage />;
      case 'content-generator': return currentUser ? <ContentGeneratorPage /> : <AuthPage />;
      case 'analytics': return currentUser ? <AnalyticsPage /> : <AuthPage />;
      case 'social-publish': return currentUser ? <SocialPublishPage /> : <AuthPage />;
      case 'subscriptions': return <SubscriptionsPage />;
      case 'advertising': return <AdvertisingPage />;
      case 'advertiser': return currentUser ? <AdvertiserPage /> : <AuthPage />;
      case 'advertiser-cabinet': return currentUser ? <AdvertiserCabinetPage /> : <AuthPage />;
      case 'support': return <SupportPage />;
      case 'admin': return currentUser?.role === 'admin' ? <AdminPage /> : <AuthPage />;
      case 'profile': return currentUser ? <ProfilePage /> : <AuthPage />;
      case 'settings': return currentUser ? <SettingsPage /> : <AuthPage />;
      case 'auth': return <AuthPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <main className="pt-16">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
