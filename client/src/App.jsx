import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import AuthPage from './pages/AuthPage';
import MyTicketsPage from './pages/MyTicketsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#130F20',
              color: '#F0ECFF',
              border: '1px solid #271D3F',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: '500',
              boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(124,58,237,.1)',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#059669', secondary: '#130F20' } },
            error:   { iconTheme: { primary: '#DC2626', secondary: '#130F20' } }
          }}
        />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"              element={<EventsPage />} />
            <Route path="/events/:id"    element={<EventDetailPage />} />
            <Route path="/my-tickets"    element={<MyTicketsPage />} />
            <Route path="/auth"          element={<AuthPage />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
