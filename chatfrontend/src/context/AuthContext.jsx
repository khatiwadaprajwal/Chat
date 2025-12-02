import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: false,
  login: () => {},
  logout: () => {},
  setLoading: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedToken !== "undefined" && storedToken !== "null" && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.clear();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    // 1. Clear State
    setUser(null);
    setToken(null);
    // 2. Clear Storage
    localStorage.clear();
    // Note: We do not navigate here. We let the Navbar handle that.
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      loading, 
      setLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};