import React, { createContext, useState, useContext, useEffect } from 'react';
import { userApi } from '@/api/jobmate';
import { toast } from 'sonner';

const AuthContext = createContext();

const TOKEN_KEY = 'jobmate_auth_token';
const USER_KEY = 'jobmate_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      
      // Check for stored token and user
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          logout(false);
        }
      }
      
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      setAuthError(null);
      
      // Call backend login endpoint
      const response = await userApi.login(email, password);
      
      // Store token
      localStorage.setItem(TOKEN_KEY, response.access_token);
      
      // Get user data (extract from token or fetch from API)
      // For now, we'll fetch the user by email
      // In production, decode JWT to get user_id
      const userId = extractUserIdFromToken(response.access_token);
      
      if (userId) {
        const userData = await userApi.getById(userId);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        toast.success('Welcome back!');
        return { success: true, user: userData };
      } else {
        throw new Error('Failed to get user data');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login failed');
      setAuthError({
        type: 'login_failed',
        message: error.message || 'Login failed'
      });
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      setAuthError(null);
      
      // Create user
      const newUser = await userApi.create(userData);
      toast.success('Account created successfully!');
      
      // Auto-login after registration
      const loginResult = await login(userData.email, userData.password);
      
      return loginResult;
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.message || 'Registration failed');
      setAuthError({
        type: 'registration_failed',
        message: error.message || 'Registration failed'
      });
      return { success: false, error: error.message };
    }
  };

  const logout = (shouldRedirect = true) => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
    
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings: false, // Not needed anymore
      authError,
      login,
      register,
      logout,
      updateUser,
      getToken,
      checkAppState: checkAuth
    }}>
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

// Helper function to extract user_id from JWT
// This is a simplified version - in production, use a proper JWT library
function extractUserIdFromToken(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.user_id;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}
