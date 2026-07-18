import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Setup Axios defaults
  axios.defaults.baseURL = 'http://localhost:8000'; // Target local PHP built-in server
  
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token & fetch profile
      axios.get('/auth/me')
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          // Token expired or invalid
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password, rememberMe) => {
    try {
      const response = await axios.post('/auth/login', { email, password, rememberMe });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please check your credentials.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
