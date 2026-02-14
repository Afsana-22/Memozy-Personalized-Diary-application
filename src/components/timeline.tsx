import React from 'react';

const moodColor = (mood: string) => {
  const m = (mood || '').toLowerCase();
  if (m.includes('happy') || m.includes('joy') || m.includes('excited')) return 'bg-green-400';
  if (m.includes('calm')) return 'bg-teal-400';
  if (m.includes('sad')) return 'bg-blue-400';
  if (m.includes('anx') || m.includes('stress') || m.includes('angry')) return 'bg-red-400';
  return 'bg-gray-300';
};

const Timeline: React.FC<{ items: Array<{ id: string; date: string; mood?: string; kind?: string; tags?: string[] }> }> = ({ items = [] }) => {
  // sort by date asc
  const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="overflow-x-auto py-2">
      <div className="flex items-center gap-6 px-2">
        {sorted.map(it => (
          <div key={it.id} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full ${moodColor(it.mood)} flex items-center justify-center text-xs font-medium`}>
              {it.kind === 'poem' ? 'P' : it.kind === 'story' ? 'S' : ''}
            </div>
            <div className="text-xs mt-2 text-muted-foreground">{new Date(it.date).toLocaleDateString()}</div>
            {it.tags && it.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {it.tags.slice(0,3).map(t => (
                  <span key={t} className="text-[10px] px-2 py-1 bg-gray-100 rounded-full border text-muted-foreground">{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;
