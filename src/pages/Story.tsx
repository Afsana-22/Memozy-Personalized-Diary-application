import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Story: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({ title: 'Empty story', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let sentiment = '';
      try {
        const ares = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({ content }) });
        if (ares.ok) {
          const ad = await ares.json();
          sentiment = ad.sentiment || '';
        }
      } catch (e) {
        // ignore
      }
      const form = new FormData();
      form.append('title', title || '');
      form.append('content', content);
      if (sentiment) form.append('sentiment', sentiment);
      form.append('kind', 'story');
      form.append('tags', tags);
      const res = await fetch('/api/entries', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: form });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Story saved' });
      setTitle(''); setContent(''); setTags('');
    } catch (err) {
      console.error(err);
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Write a Story</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-medium">
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Button>
      </div>
      <Card className="p-4">
        <Input placeholder="Title (optional)" value={title} onChange={(e:any) => setTitle(e.target.value)} className="mb-3" />
        <Textarea placeholder="Write your story..." value={content} onChange={(e:any) => setContent(e.target.value)} className="min-h-[300px] mb-2 w-full" />
        <Input placeholder="Tags (comma separated)" value={tags} onChange={(e:any) => setTags(e.target.value)} className="mb-4" />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Story'}</Button>
        </div>
      </Card>
    </div>
  );
};

export default Story;
