import { EmailOutlined, LockOutlined } from '@mui/icons-material';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '../firebase';

export default function LoginPage({ pendingEmail }) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (registering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (authError) {
      const messages = {
        'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/weak-password': 'Use a password with at least 6 characters.',
        'auth/invalid-email': 'Enter a valid email address.',
      };
      setError(messages[authError.code] ?? 'Unable to authenticate. Please try again.');
    }
  }

  return <Box className="login-page"><Box className="login-art"><Typography className="art-kicker">A living language library</Typography><Typography className="art-quote">“Every word carries a place, a person, a story.”</Typography><Typography className="art-credit">NATIVORA / CONTENT STUDIO</Typography></Box><Box className="login-panel"><Box className="brand"><Box className="brand-mark">N</Box><Typography className="brand-name">nativora</Typography></Box><Box className="login-copy"><Typography variant="h1">{pendingEmail ? 'Approval pending.' : registering ? 'Create account.' : 'Welcome back.'}</Typography><Typography color="text.secondary">{pendingEmail ? `Your account (${pendingEmail}) was created, but an admin must set status to true in Firestore before you can enter.` : registering ? 'Create your editor account to request access.' : 'Sign in to shape the language experience for every learner.'}</Typography></Box>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}><TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth autoComplete="email" InputProps={{ startAdornment: <EmailOutlined sx={{ mr: 1, color: 'text.secondary' }} /> }} /><TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth autoComplete={registering ? 'new-password' : 'current-password'} InputProps={{ startAdornment: <LockOutlined sx={{ mr: 1, color: 'text.secondary' }} /> }} /><Button fullWidth size="large" type="submit" variant="contained">{registering ? 'Create account' : 'Sign in'}</Button></Box><Button fullWidth color="inherit" onClick={() => { setRegistering(!registering); setError(''); }}>{registering ? 'Already have an account? Sign in' : 'Need an account? Create one'}</Button><Typography className="login-footnote">{pendingEmail ? 'After approval, sign in again with the same email and password.' : 'Authorized editors only. New accounts require admin approval.'}</Typography></Box></Box>;
}
