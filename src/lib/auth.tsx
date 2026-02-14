import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

type User = { id: string; email: string; username?: string; profileImage?: string } | null;


interface AuthContextType {
  user: User;
  token: string | null;
  signUp: (email: string, password: string, username?: string) => Promise<{ error?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  getProfile: () => Promise<any>;
  updateProfile: (data: FormData) => Promise<any>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  getProfile: async () => null,
  updateProfile: async () => null,
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load token from localStorage
    const t = localStorage.getItem('auth_token');
    const u = localStorage.getItem('auth_user');
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Sign up failed', description: data.error || 'Unknown error', variant: 'destructive' });
        return { error: data.error };
      }

      // server returns token and user; auto-login
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        navigate('/dashboard');
        toast({ title: 'Welcome', description: 'Account created and signed in.' });
        return { error: null };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Sign up error', err);
      toast({ title: 'Sign up failed', description: err?.message ?? String(err), variant: 'destructive' });
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Sign in failed', description: data.error || 'Invalid credentials', variant: 'destructive' });
        return { error: data.error };
      }

      // store token and user
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
      return { error: null };
    } catch (err: any) {
      console.error('Sign in error', err);
      toast({ title: 'Sign in failed', description: err?.message ?? String(err), variant: 'destructive' });
      return { error: err };
    }
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    navigate('/');
    toast({ title: 'Signed out', description: "You've been successfully signed out." });
  };

  const getProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      localStorage.setItem('auth_user', JSON.stringify(data));
      setUser(data);
      return data;
    } catch (err) {
      console.error('Get profile error', err);
      return null;
    }
  };

  const updateProfile = async (formData: FormData) => {
    try {
      const res = await fetch('/api/auth/me', { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Update profile error', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, signUp, signIn, getProfile, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
