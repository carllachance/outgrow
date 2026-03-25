import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TodayScreen } from './screens/TodayScreen';
import { GrowthScreen } from './screens/GrowthScreen';
import { JournalScreen } from './screens/JournalScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { KindWordsScreen } from './screens/KindWordsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AppStoreProvider } from './state/AppStoreContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route element={<Layout />}>
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/growth" element={<GrowthScreen />} />
            <Route path="/journal" element={<JournalScreen />} />
            <Route path="/privacy" element={<PrivacyScreen />} />
            <Route path="/kind-words" element={<KindWordsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStoreProvider>
  </React.StrictMode>
);
