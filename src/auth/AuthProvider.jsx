// src/auth/AuthProvider.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const provider = new GoogleAuthProvider();

  // Configurar o provider do Google
  provider.addScope('email');
  provider.addScope('profile');

  // Monitora login/logout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
      if (firebaseUser) {
        try {
          // Busca dados do Firestore
          const userDoc = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDoc);

          if (!docSnap.exists()) {
            // Se não existe no Firestore, cria
            console.log('Creating new user document in Firestore');
            await setDoc(userDoc, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              createdAt: new Date(),
            });
          }

          setUser(firebaseUser);
          console.log('User set in context:', firebaseUser.displayName);
        } catch (error) {
          console.error('Error handling user data:', error);
          toast.error('Erro ao carregar dados do usuário');
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login com Google
  const loginWithGoogle = async () => {
    try {
      console.log('Attempting Google login...');
      setLoading(true);
      
      const result = await signInWithPopup(auth, provider);
      console.log('Google login successful:', result.user.displayName);
      
      toast.success(`Bem-vindo, ${result.user.displayName}!`);
      
      return result.user;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      
      // Tratamento específico de erros
      let errorMessage = 'Erro no login com Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login cancelado pelo usuário';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Pop-up bloqueado pelo navegador';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Solicitação de login cancelada';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet';
          break;
        case 'auth/invalid-api-key':
          errorMessage = 'Configuração do Firebase inválida';
          break;
        default:
          errorMessage = error.message || 'Erro desconhecido no login';
      }
      
      toast.error(errorMessage);
      setLoading(false);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      console.log('Logging out user...');
      await signOut(auth);
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  // Verificar se é admin
  const isAdmin = async () => {
    if (!user) return false;
    
    try {
      const adminDoc = doc(db, 'admins', user.uid);
      const docSnap = await getDoc(adminDoc);
      return docSnap.exists();
    } catch (error) {
      console.error('Erro ao verificar admin:', error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    logout,
    isAdmin
  };

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}

