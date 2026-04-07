import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('geniebuilder_theme') || 'light');
  const [mode,  setMode]  = useState(() => localStorage.getItem('geniebuilder_mode')  || 'ai');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geniebuilder_apikey') || '');

  const [streak, setStreak] = useState(() => {
    try { return JSON.parse(localStorage.getItem('geniebuilder_streak') || '{"count":0,"lastDate":null}'); }
    catch { return { count: 0, lastDate: null }; }
  });

  const [user,   setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('geniebuilder_user') || 'null'); }
    catch { return null; }
  });
  const [token,  setToken]  = useState(() => localStorage.getItem('geniebuilder_token') || '');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('geniebuilder_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('geniebuilder_mode',   mode);   }, [mode]);
  useEffect(() => { localStorage.setItem('geniebuilder_apikey', apiKey); }, [apiKey]);
  
  useEffect(() => {
    if (token) localStorage.setItem('geniebuilder_token', token);
    else localStorage.removeItem('geniebuilder_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('geniebuilder_user', JSON.stringify(user));
    else localStorage.removeItem('geniebuilder_user');
  }, [user]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const toggleMode  = () => setMode(m => m === 'ai' ? 'smart' : 'ai');

  const logout = () => {
    setToken('');
    setUser(null);
  };

  const updateStreak = () => {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    setStreak(s => {
      const updated = s.lastDate === today      ? s
        : s.lastDate === yesterday ? { count: s.count + 1, lastDate: today }
        : { count: 1, lastDate: today };
      localStorage.setItem('geniebuilder_streak', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AppContext.Provider value={{ 
      theme, toggleTheme, 
      mode, toggleMode, setMode, 
      apiKey, setApiKey, 
      streak, updateStreak,
      user, setUser,
      token, setToken,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

