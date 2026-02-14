import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Timeline from '@/components/timeline';

function parseQuery(q: string) {
  // Very small parser: look for mood words and a month/time phrase
  const moods = ['happy','sad','anxious','stressed','calm','excited'];
  const foundMood = moods.find(m => q.toLowerCase().includes(m));

  // month detection: this month, last month, this week
  const now = new Date();
  let start = null;
  if (/this month/i.test(q)) {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (/last month/i.test(q)) {
    start = new Date(now.getFullYear(), now.getMonth()-1, 1);
  } else if (/this week/i.test(q)) {
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(d.setDate(diff));
  }

  return { mood: foundMood, start };
}

const Memories: React.FC = () => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);

  const runSearch = async () => {
    const parsed = parseQuery(q);
    // Basic fetch: pull recent entries and filter client-side by mood/keywords/time
    const res = await fetch('/api/entries?limit=200', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
    if (!res.ok) return;
    const data = await res.json();
    let items = Array.isArray(data) ? data : [];
    if (parsed.mood) {
      items = items.filter(it => (it.sentiment || '').toLowerCase().includes(parsed.mood));
    }
    if (parsed.start) {
      items = items.filter(it => new Date(it.entry_date) >= parsed.start);
    }
    if (q && !parsed.mood) {
      const term = q.toLowerCase();
      items = items.filter(it => (it.content || '').toLowerCase().includes(term) || (it.title || '').toLowerCase().includes(term));
    }
    setResults(items);
  setTimelineItems(items.map(it => ({ id: it.id, date: it.entry_date, mood: it.sentiment || 'neutral', kind: it.kind || 'entry', tags: it.tags || [] })));
  };

  useEffect(() => {
    // initial load: recent entries
    (async () => {
      const res = await fetch('/api/entries?limit=100', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
      if (res.ok) {
        const data = await res.json();
        setResults(data || []);
  setTimelineItems((data || []).map((it:any) => ({ id: it.id, date: it.entry_date, mood: it.sentiment || 'neutral', kind: it.kind || 'entry', tags: it.tags || [] })));
      }
    })();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Find by feeling</h1>
      <p className="text-sm text-muted-foreground mb-6">Try queries like "When was I happiest this month?" or "anxious before exams"</p>

      <div className="flex gap-2 mb-6">
        <Input value={q} onChange={(e:any) => setQ(e.target.value)} placeholder="Search your memories by feeling, time or keywords" />
        <Button onClick={runSearch}>Find</Button>
      </div>

      <Card className="p-4 mb-6">
        <Timeline items={timelineItems} />
      </Card>

      <div className="grid gap-4">
        {results.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  {r.kind && r.kind !== 'entry' && (
                    <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground capitalize">{r.kind}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{new Date(r.entry_date).toLocaleString()}</p>
                <p className="mt-2">{r.content}</p>
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {r.tags.map((t:any) => <span key={t} className="text-xs px-2 py-1 bg-gray-100 rounded">{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Memories;
