import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Poem: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({ title: 'Empty poem', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Try to analyze sentiment first (best-effort)
      let sentiment = '';
      try {
        const ares = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({ content }) });
        if (ares.ok) {
          const ad = await ares.json();
          sentiment = ad.sentiment || '';
        }
      } catch (e) {
        // ignore analysis failures
      }

      const form = new FormData();
      form.append('title', title || '');
      form.append('content', content);
      if (sentiment) form.append('sentiment', sentiment);
      form.append('kind', 'poem');
      form.append('tags', tags);
      const res = await fetch('/api/entries', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: form });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Poem saved' });
      setTitle(''); setContent(''); setTags('');
    } catch (err) {
      console.error(err);
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const lineCount = content ? content.split(/\r\n|\r|\n/).length : 0;
  const stanzaCount = content
    ? content
        .split(/(?:\r\n|\r|\n){2,}/)
        .map(s => s.trim())
        .filter(s => s.length > 0).length
    : 0;

  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Write a Poem</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm font-medium">
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Button>
      </div>
      {/* reduced Card padding to minimize whitespace around textarea */}
      <Card className="p-4">
        {/* narrower poem column */}
        <div className="mx-auto max-w-xl">
          <Input placeholder="Title (optional)" value={title} onChange={(e:any) => setTitle(e.target.value)} className="mb-3" />
          {/* monospace, slightly smaller font, full-width to avoid extra whitespace */}
          <Textarea
            placeholder="Write your poem..."
            value={content}
            onChange={(e:any) => setContent(e.target.value)}
            className="min-h-[220px] mb-2 w-full font-mono text-sm leading-relaxed"
          />

          {/* helper row: lines and stanzas */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div>Lines: <span className="font-medium text-foreground">{lineCount}</span> • Stanzas: <span className="font-medium text-foreground">{stanzaCount}</span></div>
            <div className="italic">Tip: use a blank line between stanzas</div>
          </div>

          <Input placeholder="Tags (comma separated)" value={tags} onChange={(e:any) => setTags(e.target.value)} className="mb-4" />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Poem'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Poem;
