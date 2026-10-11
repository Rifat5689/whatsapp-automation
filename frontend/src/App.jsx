import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './hooks/useApp.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import ConversationsPage from './pages/conversations/ConversationsPage.jsx';
import FriendsRulesPage from './pages/friends-rules/FriendsRulesPage.jsx';
import PersonalizationPage from './pages/personalization/PersonalizationPage.jsx';
import AIModelsPage from './pages/ai-models/AIModelsPage.jsx';
import ActivityPage from './pages/activity/ActivityPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import './styles.css';
import './dashboard.css';
import './photo-editor.css';
import './motion.css';

const ProtectedRoutes = () => { const { authenticated } = useApp(); if (!authenticated) return <Navigate to="/login" replace />; return <DashboardLayout><Routes><Route path="/conversations" element={<ConversationsPage />} /><Route path="/friends-rules" element={<FriendsRulesPage />} /><Route path="/personalization" element={<PersonalizationPage />} /><Route path="/ai-models" element={<AIModelsPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/conversations" replace />} /></Routes></DashboardLayout>; };
export default function App() { return <AppProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/*" element={<ProtectedRoutes />} /></Routes></AppProvider>; }
