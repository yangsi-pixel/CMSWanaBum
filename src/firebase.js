import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB_m5j3nL5S4V6mgDDkCh4GY_0jPa4TCVU',
  authDomain: 'nativora-c8448.firebaseapp.com',
  projectId: 'nativora-c8448',
  storageBucket: 'nativora-c8448.firebasestorage.app',
  messagingSenderId: '659992256319',
  appId: '1:659992256319:web:3adc43bb26104bbef83d8a',
  measurementId: 'G-3C4M5JQXFN',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
