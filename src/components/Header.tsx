import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from 'next-themes';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme() as any;
  const [mounted, setMounted] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const { updateProfile } = useAuth() as any;

  useEffect(() => setMounted(true), []);

  return (
    <header className="bg-gradient-card backdrop-blur-sm border-b border-border sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Memozy</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/calendar')}>
            <Calendar className="mr-2" />
            Calendar
          </Button>
          <Button variant="outline" onClick={() => navigate('/poem')}>Write Poem</Button>
          <Button variant="outline" onClick={() => navigate('/story')}>Write Story</Button>

          <div className="relative">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowProfilePanel(s => !s)}>
                {user?.username || 'Profile'}
              </Button>
            </div>
            {showProfilePanel && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow p-4 z-20">
                <div className="flex items-center gap-3 mb-3">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="profile" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">M</div>
                  )}
                  <div>
                    <div className="font-medium">{user?.username || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                  </div>
                </div>
                <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files ? e.target.files[0] : null;
                  if (!f) return;
                  const fd = new FormData();
                  fd.append('profileImage', f);
                  const updated = await updateProfile(fd);
                }} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => profileInputRef.current?.click()}>Change Photo</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowProfilePanel(false)}>Close</Button>
                </div>
                <div className="mt-3">
                  <Button variant="destructive" size="sm" className="w-full" onClick={() => { setShowProfilePanel(false); signOut(); }}>
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>

          {mounted && (
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="text-gray-800 dark:text-gray-100">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-indigo-300" /> : <Moon className="w-5 h-5 text-yellow-400" />}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
