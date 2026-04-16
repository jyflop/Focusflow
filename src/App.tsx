import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { userService } from './lib/firestore';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Auth from './components/Auth';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import CalendarView from './components/CalendarView';
import GanttChart from './components/GanttChart';
import Team from './components/Team';
import InvitationManager from './components/InvitationManager';
import Chat from './components/Chat';
import Profile from './components/Profile';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        userService.syncProfile(user);
      }
      setLoading(false);
      setTimeout(() => setShowSplash(false), 2000);
    });
    return () => unsubscribe();
  }, []);

  if (showSplash) return <SplashScreen />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Auth />;

  const currentView = location.pathname.split('/')[1] || 'dashboard';

  return (
    <DashboardLayout 
      user={user} 
      currentView={currentView as any} 
      onViewChange={(view) => navigate(`/${view}`)}
    >
      <InvitationManager />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard onSelectProject={(id) => navigate(`/projects/${id}`)} />} />
        <Route path="/projects" element={<ProjectList onSelectProject={(id) => navigate(`/projects/${id}`)} />} />
        <Route path="/projects/:projectId" element={<ProjectDetailWrapper onBack={() => navigate('/projects')} />} />
        <Route path="/calendar" element={<CalendarView onSelectProject={(id) => navigate(`/projects/${id}`)} />} />
        <Route path="/gantt" element={<GanttChart onSelectProject={(id) => navigate(`/projects/${id}`)} />} />
        <Route path="/team" element={<Team />} />
        <Route path="/messages" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function ProjectDetailWrapper({ onBack }: { onBack: () => void }) {
  const { projectId } = useParams();
  if (!projectId) return <Navigate to="/projects" replace />;
  return <ProjectDetail projectId={projectId} onBack={onBack} />;
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
