import { useEffect } from 'react';
import { useStore } from './store/useStore';
import useInactivityLogout from './components/useInactivityLogout';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ContentGeneratorPage from './pages/ContentGeneratorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import AdvertisingPage from './pages/AdvertisingPage';
import SupportPage from './pages/SupportPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import AdvertiserPage from './pages/AdvertiserPage';
import AdvertiserCabinetPage from './pages/AdvertiserCabinetPage';
import SettingsPage from './pages/SettingsPage';
import LegalPage from './pages/LegalPage';

function App() {
  const { currentPage, currentUser, restoreSession, loadUserData, resetNetworkPublications, dataLoadedFor, processDuePosts } = useStore();
  useInactivityLogout();

  // Restore login + saved posts/analytics after refresh
  useEffect(() => {
    restoreSession();
  }, []);

  // Load saved data for current user; one-time zero of Telegram publications for a clean test baseline
  useEffect(() => {
    if (!currentUser?.id || dataLoadedFor === currentUser.id) return;
    let cancelled = false;
    (async () => {
      await loadUserData();
      if (cancelled) return;
      if (!localStorage.getItem('blogpost_tg_pub_reset_v1')) {
        resetNetworkPublications('telegram');
        localStorage.setItem('blogpost_tg_pub_reset_v1', '1');
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id, dataLoadedFor]);

  // Auto-publish scheduler: check queue every 30s
  useEffect(() => {
    if (!currentUser?.id) return;
    const tick = () => { void processDuePosts(); };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [currentUser?.id]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'dashboard': return currentUser ? <DashboardPage /> : <AuthPage />;
      case 'content-generator': return currentUser ? <ContentGeneratorPage /> : <AuthPage />;
      case 'analytics': return currentUser ? <AnalyticsPage /> : <AuthPage />;
      case 'social-publish': return currentUser ? <ContentGeneratorPage /> : <AuthPage />;
      case 'subscriptions': return <SubscriptionsPage />;
      case 'advertising': return <AdvertisingPage />;
      case 'advertiser': return currentUser ? <AdvertiserPage /> : <AuthPage />;
      case 'advertiser-cabinet': return currentUser ? <AdvertiserCabinetPage /> : <AuthPage />;
      case 'support': return <SupportPage />;
      case 'admin': return currentUser?.role === 'admin' ? <AdminPage /> : <AuthPage />;
      case 'profile': return currentUser ? <ProfilePage /> : <AuthPage />;
      case 'settings': return currentUser ? <SettingsPage /> : <AuthPage />;
      case 'auth': return <AuthPage />;
      case 'legal-terms': case 'legal/terms': return <LegalPage docType="terms" />;
      case 'legal-privacy': case 'legal/privacy': return <LegalPage docType="privacy" />;
      case 'legal-offer': case 'legal/offer': return <LegalPage docType="offer" />;
      case 'legal-rules': case 'legal/rules': return <LegalPage docType="rules" />;
      case 'legal-consent': case 'legal/consent': return <LegalPage docType="consent" />;
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
