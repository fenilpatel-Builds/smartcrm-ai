import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('smartcrm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [organization, setOrganization] = useState(() => {
    const saved = localStorage.getItem('smartcrm_org');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('smartcrm_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('smartcrm_token');
      if (storedToken) {
        try {
          const { data } = await api.get('/auth/me');
          if (data.success) {
            setUser(data.data.user);
            setOrganization(data.data.organization);
            localStorage.setItem('smartcrm_user', JSON.stringify(data.data.user));
            localStorage.setItem('smartcrm_org', JSON.stringify(data.data.organization));
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { user: loggedUser, organization: loggedOrg, token: jwtToken } = response.data.data;
      setUser(loggedUser);
      setOrganization(loggedOrg);
      setToken(jwtToken);
      localStorage.setItem('smartcrm_token', jwtToken);
      localStorage.setItem('smartcrm_user', JSON.stringify(loggedUser));
      if (loggedOrg) localStorage.setItem('smartcrm_org', JSON.stringify(loggedOrg));
      return response.data;
    }
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      const { user: regUser, organization: regOrg, token: jwtToken } = response.data.data;
      setUser(regUser);
      setOrganization(regOrg);
      setToken(jwtToken);
      localStorage.setItem('smartcrm_token', jwtToken);
      localStorage.setItem('smartcrm_user', JSON.stringify(regUser));
      if (regOrg) localStorage.setItem('smartcrm_org', JSON.stringify(regOrg));
      return response.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('smartcrm_token');
    localStorage.removeItem('smartcrm_user');
    localStorage.removeItem('smartcrm_org');
    setUser(null);
    setOrganization(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        setUser(data.data.user);
        setOrganization(data.data.organization);
        localStorage.setItem('smartcrm_user', JSON.stringify(data.data.user));
        localStorage.setItem('smartcrm_org', JSON.stringify(data.data.organization));
      }
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
