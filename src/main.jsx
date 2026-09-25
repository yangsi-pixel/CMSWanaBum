import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';
import { auth } from './firebase';
import { ensureAdminProfile } from './services/firestore';
import { collections, getCollection } from './data/collections';
import AppShell from './components/AppShell';
import CollectionPage from './pages/CollectionPage';
import LoginPage from './pages/LoginPage';
import './styles.css';

const theme = createTheme({ palette: { primary: { main: '#1f5c55' }, secondary: { main: '#ed7655' }, background: { default: '#f7f7f3', paper: '#fff' }, text: { primary: '#1b2927', secondary: '#687573' } }, typography: { fontFamily: 'DM Sans, sans-serif', h1: { fontFamily: 'Fraunces, serif', fontWeight: 600 }, h3: { fontFamily: 'Fraunces, serif' }, button: { textTransform: 'none', fontWeight: 700 } }, shape: { borderRadius: 8 } });

function App() {
  const [user, setUser] = useState(undefined);
  const [pendingEmail, setPendingEmail] = useState('');
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      if (!authenticatedUser) {
        if (active) setUser(null);
        return;
      }

      try {
        const approved = await ensureAdminProfile(authenticatedUser);
        if (!approved) {
          if (active) {
            setPendingEmail(authenticatedUser.email ?? '');
            setUser(null);
          }
          await signOut(auth);
          return;
        }
        if (active) {
          setPendingEmail('');
          setUser(authenticatedUser);
        }
      } catch (error) {
        console.error('Unable to verify CMS access.', error);
        if (active) setUser(null);
        await signOut(auth);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  if (user === undefined) return null;
  if (!user) return <LoginPage pendingEmail={pendingEmail} />;
  return <Routes><Route element={<AppShell user={user} />}><Route index element={<Navigate to="/dialects" replace />} />{collections.map((config) => <Route key={config.key} path={`/${config.key}`} element={<CollectionPage config={getCollection(config.key)} />} />)}</Route></Routes>;
}

createRoot(document.getElementById('root')).render(<StrictMode><ThemeProvider theme={theme}><CssBaseline /><BrowserRouter><App /></BrowserRouter><Toaster position="bottom-right" /></ThemeProvider></StrictMode>);
