// hooks/useUserRole.js
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useUserRole = (user) => {
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.email) {
        setUserRole(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        // Buscar usuario por email en la colección users
        const userDoc = await getDoc(doc(db, 'users', user.email));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'bartender'); // Default role
          setUserProfile(userData);
        } else {
          // Si no existe el usuario, crear uno con rol básico
          setUserRole('bartender');
          setUserProfile({
            email: user.email,
            role: 'bartender',
            name: user.displayName || user.email.split('@')[0],
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('bartender'); // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const canEditAllFields = isAdmin || isManager;
  const canManageUsers = isAdmin;
  const canManageProviders = isAdmin;

  return {
    userRole,
    userProfile,
    loading,
    isAdmin,
    isManager,
    canEditAllFields,
    canManageUsers,
    canManageProviders
  };
};