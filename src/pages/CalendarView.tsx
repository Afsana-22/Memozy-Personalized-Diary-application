import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, Smile, Meh, Frown, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  const [entriesForDate, setEntriesForDate] = useState<Array<{ id?: string; sentiment?: string; content?: string; title?: string; kind?: string; tags?: string[] }>>([]);

  useEffect(() => {
    const fetchForDate = async () => {
      if (!date) {
        setEntriesForDate([]);
        return;
      }
      // Use local YYYY-MM-DD to avoid UTC offset shifts from toISOString()
      const pad = (n: number) => n.toString().padStart(2, '0');
      const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      try {
        const res = await fetch(`/api/entries?date=${key}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
        if (!res.ok) {
          setEntriesForDate([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setEntriesForDate(data.map((e: any) => ({ id: e.id, title: e.title, sentiment: e.sentiment, content: e.content, kind: e.kind || 'entry', tags: e.tags || [], images: e.images || [], videos: e.videos || [], entry_date: e.entry_date, created_at: e.created_at })));
        } else {
          setEntriesForDate([]);
        }
      } catch (err) {
        console.error('Error fetching entry for date', err);
        setEntriesForDate([]);
      }
    };
    fetchForDate();
  }, [date]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "happy":
        return <Smile className="w-6 h-6 text-green-500" />;
      case "neutral":
        return <Meh className="w-6 h-6 text-yellow-500" />;
      case "sad":
        return <Frown className="w-6 h-6 text-blue-500" />;
      default:
        return null;
    }
  };

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [openEntry, setOpenEntry] = useState<any | null>(null);

  // When entries for date change, default-select the first entry (if any)
  useEffect(() => {
    setSelectedEntry(entriesForDate && entriesForDate.length > 0 ? entriesForDate[0] : null);
  }, [entriesForDate]);

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-gradient-card backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            className="text-gray-700 dark:text-white dark:bg-slate-800/60 dark:hover:bg-slate-700/60 px-3 py-1 rounded"
            onClick={() => navigate("/dashboard")}
          >
            <ChevronLeft className="mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">
            Your <span className="text-primary">Memozy Calendar</span>
          </h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calendar */}
            <Card className="p-8 shadow-hover">
              <h2 className="text-2xl font-semibold mb-6">Select a Date</h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border-0"
              />
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Dates with entries are highlighted. Click any date to view your memories from that day.
                </p>
              </div>
            </Card>

            {/* Entry Preview */}
            <Card className="p-8 shadow-hover">
              <h2 className="text-2xl font-semibold mb-6">
                {date ? date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : "Select a date"}
              </h2>

              {selectedEntry ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    {getSentimentIcon(selectedEntry.sentiment)}
                    <span className="text-lg font-medium capitalize">
                      {selectedEntry.sentiment}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {entriesForDate.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEntry(e)}
                        className={"p-4 border rounded-md cursor-pointer " + (selectedEntry?.id === e.id ? 'border-primary bg-primary/5' : '')}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              {e.title && <h3 className="font-medium">{e.title}</h3>}
                              {e.kind && e.kind !== 'entry' && <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground capitalize">{e.kind}</span>}
                            </div>
                            <p className="text-sm text-muted-foreground">{e.content}</p>
                            {e.sentiment && <div className="text-xs mt-2">Mood: <span className="font-medium capitalize">{e.sentiment}</span></div>}
                            {e.tags && e.tags.length > 0 && (
                              <div className="mt-2 flex gap-2">
                                {e.tags.map((t:any) => <span key={t} className="text-xs px-2 py-1 bg-gray-100 rounded">{t}</span>)}
                              </div>
                            )}
                          </div>
                          <div>
                            <Button variant="destructive" size="sm" onClick={async () => {
                              if (!confirm('Delete this entry?')) return;
                              try {
                                const res = await fetch(`/api/entries/${e.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
                                if (!res.ok) throw new Error('Delete failed');
                                // refresh list
                                const key = date?.toISOString().split('T')[0];
                                const r = await fetch(`/api/entries?date=${key}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
                                if (r.ok) {
                                  const data = await r.json();
                                  setEntriesForDate(Array.isArray(data) ? data.map((it: any) => ({ id: it.id, title: it.title, sentiment: it.sentiment, content: it.content })) : []);
                                } else {
                                  setEntriesForDate([]);
                                }
                              } catch (err) {
                                console.error('Delete error', err);
                                alert('Could not delete entry');
                              }
                            }}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button className="w-full" onClick={() => selectedEntry && setOpenEntry(selectedEntry)} disabled={!selectedEntry}>
                      View Full Entry
                    </Button>
                    {openEntry && (
                      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white max-w-2xl w-full p-6 rounded shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-bold">{openEntry.title || '(Untitled)'}</h3>
                              <p className="text-sm text-muted-foreground">{new Date(openEntry.entry_date).toLocaleString()}</p>
                            </div>
                            <div>
                              <Button variant="ghost" onClick={() => setOpenEntry(null)}>Close</Button>
                            </div>
                          </div>
                          <div className="mt-4">
                            <pre className="whitespace-pre-wrap">{openEntry.content}</pre>
                          </div>

                          {/* Media: images */}
                          {openEntry.images && openEntry.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              {openEntry.images.map((src: string, idx: number) => (
                                <img key={idx} src={src} alt={`open-entry-img-${idx}`} className="w-full h-40 object-cover rounded" />
                              ))}
                            </div>
                          )}

                          {/* Media: videos */}
                          {openEntry.videos && openEntry.videos.length > 0 && (
                            <div className="mt-4 space-y-3">
                              {openEntry.videos.map((src: string, idx: number) => (
                                <video key={idx} src={src} className="w-full rounded" controls />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="w-10 h-10 text-muted-foreground" />
                    </div>
                  <p className="text-lg text-muted-foreground">
                    No entries for this date
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start writing to create a memory for this day
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarView;
