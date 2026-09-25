import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Add, ChevronLeft, Logout, Menu, NotificationsNone, Search } from '@mui/icons-material';
import { Avatar, Box, Button, Divider, IconButton, InputBase, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { collections } from '../data/collections';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function AppShell({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const drawer = <Box className="sidebar-inner"><Box className="brand"><Box className="brand-mark">N</Box><Box><Typography className="brand-name">nativora</Typography><Typography className="brand-subtitle">CONTENT STUDIO</Typography></Box></Box><Button fullWidth variant="contained" startIcon={<Add />} onClick={() => navigate('/dialects')} sx={{ mb: 3 }}>Create content</Button><Typography className="nav-label">LIBRARY</Typography><List>{collections.map(({ key, label, icon: Icon }) => <ListItemButton component={NavLink} to={`/${key}`} key={key} onClick={() => setMobileOpen(false)} className="nav-item"><ListItemIcon><Icon /></ListItemIcon><ListItemText primary={label} /></ListItemButton>)}</List><Box sx={{ flex: 1 }} /><Divider /><Box className="user-card"><Avatar src={user.photoURL}>{user.displayName?.[0]}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap fontWeight={700}>{user.displayName || 'Editor'}</Typography><Typography noWrap variant="caption" color="text.secondary">{user.email}</Typography></Box><IconButton onClick={() => signOut(auth)} title="Sign out"><Logout fontSize="small" /></IconButton></Box></Box>;
  return <Box className="app-layout"><Box className={`sidebar ${mobileOpen ? 'open' : ''}`}>{drawer}</Box>{mobileOpen && <Box className="sidebar-overlay" onClick={() => setMobileOpen(false)} /> }<Box component="main" className="main-area"><Box component="header" className="topbar"><IconButton className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu /></IconButton><Box className="search-box"><Search fontSize="small" /><InputBase placeholder="Search your library..." /></Box><Box sx={{ flex: 1 }} /><IconButton><NotificationsNone /></IconButton><Avatar className="top-avatar" src={user.photoURL}>{user.displayName?.[0]}</Avatar></Box><Box className="page-content"><Outlet /></Box></Box></Box>;
}
