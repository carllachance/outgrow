import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TodayScreen } from './screens/TodayScreen';
import { GrowthScreen } from './screens/GrowthScreen';
import { MealLogScreen } from './screens/MealLogScreen';
import { MealPlannerScreen } from './screens/MealPlannerScreen';
import { JournalScreen } from './screens/JournalScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { KindWordsScreen } from './screens/KindWordsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DayDetailScreen } from './screens/DayDetailScreen';
import { InsightDetailScreen } from './screens/InsightDetailScreen';
import { InsightSupportingDaysScreen } from './screens/InsightSupportingDaysScreen';
import { ReflectionHistoryScreen } from './screens/ReflectionHistoryScreen';
import { ReflectionDetailScreen } from './screens/ReflectionDetailScreen';
import { AppStoreProvider } from './state/AppStoreContext';
import { useStore } from './state/AppStoreContext';
import './styles.css';

const RequireOnboarding = ({ children }: { children: React.ReactNode }) => {
  const { state } = useStore();
  if (!state.onboarding.hasCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

const OnboardingEntry = () => {
  const { state } = useStore();
  if (state.onboarding.hasCompleted) {
    return <Navigate to="/today" replace />;
  }
  return <OnboardingScreen />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingEntry />} />
          <Route
            element={(
              <RequireOnboarding>
                <Layout />
              </RequireOnboarding>
            )}
          >
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/growth" element={<GrowthScreen />} />
            <Route path="/meals" element={<MealLogScreen />} />
            <Route path="/planner" element={<MealPlannerScreen />} />
            <Route path="/journal" element={<JournalScreen />} />
            <Route path="/journal/reflections" element={<ReflectionHistoryScreen />} />
            <Route path="/journal/reflections/:reflectionId" element={<ReflectionDetailScreen />} />
            <Route path="/privacy" element={<PrivacyScreen />} />
            <Route path="/kind-words" element={<KindWordsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/days/:dayId" element={<DayDetailScreen />} />
            <Route path="/insights/:insightId" element={<InsightDetailScreen />} />
            <Route path="/insights/:insightId/days" element={<InsightSupportingDaysScreen />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </BrowserRouter>
    </AppStoreProvider>
  </React.StrictMode>
);
