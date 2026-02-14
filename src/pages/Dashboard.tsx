import { useState, useEffect, useRef } from "react";
import DrawCanvas, { DrawCanvasHandle } from "@/components/draw-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar, Image, Video, Smile, Meh, Frown, Sparkles, Heart } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

interface DiaryEntry {
  id: string;
  title: string | null;
  content: string;
  sentiment: string | null;
  entry_date: string;
  created_at: string;
  images?: string[];
  videos?: string[];
  kind?: string;
  tags?: string[];
}

const Dashboard = () => {

  const [entryTitle, setEntryTitle] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const imagesRef = useRef<HTMLInputElement | null>(null);
  const videosRef = useRef<HTMLInputElement | null>(null);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const drawRef = useRef<DrawCanvasHandle | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  // header and theme handled by shared Header component
  const { updateProfile } = useAuth() as any;
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  // appearance state (text color + font only)
  const [textColor, setTextColor] = useState<string>(() => localStorage.getItem('pmk_text') || '#000000');
  const [fontStyle, setFontStyle] = useState<string>(() => localStorage.getItem('pmk_font') || 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial');

  const saveAppearance = () => {
    try {
      localStorage.setItem('pmk_text', textColor);
      localStorage.setItem('pmk_font', fontStyle);
  toast({ title: 'MemoStyler saved', description: 'Text appearance saved.' });
    } catch (err) {
      console.error('Error saving appearance', err);
      toast({ title: 'Save failed', description: 'Could not save appearance.' , variant: 'destructive'});
    }
  };

  const resetAppearance = () => {
    setTextColor('#000000');
    setFontStyle('Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial');
    try {
      localStorage.removeItem('pmk_text');
      localStorage.removeItem('pmk_font');
    } catch (err) {
      // ignore
    }
  toast({ title: 'MemoStyler reset', description: 'Reverted to defaults.' });
  };

  // Small map of known Google font query strings
  const GOOGLE_FONT_MAP: Record<string, string> = {
    'Inter': 'Inter:wght@300;400;600;700',
    'Roboto': 'Roboto:wght@300;400;500;700',
    'Poppins': 'Poppins:wght@300;400;600;700',
    'Montserrat': 'Montserrat:wght@300;400;600;700',
    'Lora': 'Lora:wght@400;700',
    'Merriweather': 'Merriweather:wght@300;400;700',
    'Source Code Pro': 'Source+Code+Pro:wght@400;600'
  };

  const loadGoogleFont = (family: string) => {
    // family may be a full font-family string like 'Poppins, system-ui...'
    const primary = family.split(',')[0].replace(/['"]/g, '').trim();
    const key = primary in GOOGLE_FONT_MAP ? primary : null;
    if (!key) return;
    const id = `pmk-font-${key.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return; // already loaded
    const href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONT_MAP[key as string]}&display=swap`;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  // ensure chosen font is loaded when component mounts or when fontStyle changes
  useEffect(() => {
    loadGoogleFont(fontStyle);
  }, [fontStyle]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchEntries();
  }, [user, navigate]);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/entries', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data = await res.json();
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
    }
  };

  const handleAnalyzeSentiment = async () => {
    if (!entryContent.trim()) {
      toast({
        title: "No content to analyze",
        description: "Please write something first!",
        variant: "destructive"
      });
      return;
    }

    // For now call a local analyze endpoint (not yet implemented) — fall back to a mock
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ content: entryContent })
      });
      if (res.ok) {
        const data = await res.json();
        setSentiment(data.sentiment);
        toast({ title: 'Sentiment analyzed!', description: `You're feeling ${data.sentiment} today.` });
      } else {
        // fallback mock
        setSentiment('neutral');
        toast({ title: 'Analysis (mock)', description: "Couldn't call analyze API — showing mock result." });
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      setSentiment('neutral');
      toast({ title: 'Analysis (mock)', description: "Network error — showing mock result." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryContent.trim()) {
      toast({
        title: "Cannot save empty entry",
        description: "Please write something first!",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const form = new FormData();
      form.append('title', entryTitle || '');
      form.append('content', entryContent);
      if (sentiment) form.append('sentiment', sentiment);
      images.forEach((f) => form.append('images', f));
      videos.forEach((f) => form.append('videos', f));
      // if canvas drawing present, export and append as image
      try {
        if (drawRef.current) {
          const blob = await drawRef.current.exportBlob();
          if (blob) {
            const file = new File([blob], `drawing-${Date.now()}.png`, { type: blob.type });
            form.append('images', file);
          }
        }
      } catch (err) {
        console.error('Error exporting drawing:', err);
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: form
      });
      if (!res.ok) throw new Error('Failed to save');

      toast({ title: 'Entry saved!', description: 'Your memory has been saved successfully.' });
      setEntryContent('');
      setEntryTitle('');
      setSentiment(null);
      setImages([]);
      setVideos([]);
      fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({ title: 'Save failed', description: 'Could not save entry. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getSentimentIcon = () => {
    switch (sentiment) {
      case "happy":
        return <Smile className="w-8 h-8 text-green-500" />;
      case "neutral":
        return <Meh className="w-8 h-8 text-yellow-500" />;
      case "sad":
        return <Frown className="w-8 h-8 text-blue-500" />;
      case "excited":
        return <Heart className="w-8 h-8 text-pink-500" />;
      case "anxious":
        return <Frown className="w-8 h-8 text-purple-500" />;
      default:
        return <Sparkles className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getEntrySentimentIcon = (entrysentiment: string | null) => {
    switch (entrysentiment) {
      case "happy":
        return <Smile className="w-5 h-5 text-green-500" />;
      case "neutral":
        return <Meh className="w-5 h-5 text-yellow-500" />;
      case "sad":
        return <Frown className="w-5 h-5 text-blue-500" />;
      case "excited":
        return <Heart className="w-5 h-5 text-pink-500" />;
      case "anxious":
        return <Frown className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6">
            <aside className="md:w-72 w-full flex-shrink-0">
              <Card className="p-4">
                <h3 className="mb-3">
                  <span className="block text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-400 drop-shadow-sm">MemoStyler</span>
                  <span className="block text-sm md:text-xs text-muted-foreground italic mt-1">Style your writing before you start</span>
                </h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Text color</label>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-10 p-0 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Font</label>
                    <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="w-full h-10 border rounded px-2">
                      <option value={'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'}>Inter / System</option>
                      <option value={'Roboto, system-ui, -apple-system, "Segoe UI", Arial'}>Roboto</option>
                      <option value={'Poppins, system-ui, -apple-system, "Segoe UI", Arial'}>Poppins</option>
                      <option value={'Montserrat, system-ui, -apple-system, "Segoe UI", Arial'}>Montserrat</option>
                      <option value={'Georgia, serif'}>Georgia (Serif)</option>
                      <option value={'Lora, serif'}>Lora (Serif)</option>
                      <option value={'Merriweather, serif'}>Merriweather</option>
                      <option value={'"Courier New", monospace'}>Courier (Monospace)</option>
                      <option value={'"Source Code Pro", monospace'}>Source Code Pro</option>
                      <option value={'"Times New Roman", Times, serif'}>Times</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={saveAppearance}>Save</Button>
                  <Button variant="outline" size="sm" onClick={resetAppearance}>Reset</Button>
                </div>
              </Card>
            </aside>

            <section className="flex-1 space-y-8">
              {/* New Entry Card (reduced padding to avoid excessive whitespace) */}
              <Card className="p-4 shadow-hover">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-400 drop-shadow-md">Today's Entry</h2>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate("/calendar") }>
                      <Calendar className="mr-2" />
                      Calendar
                    </Button>
                  </div>
                </div>

                <Input
                  placeholder="Entry title (optional)"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  className="text-xl md:text-2xl font-medium mb-4"
                />

                <Textarea
                  placeholder="How are you feeling today? What's on your mind?"
                  value={entryContent}
                  onChange={(e) => setEntryContent(e.target.value)}
                  className="min-h-[300px] text-lg md:text-xl resize-none mb-2 w-full"
                  style={{ color: textColor, fontFamily: fontStyle }}
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => imagesRef.current?.click()}
                  >
                    <Image className="mr-2 w-4 h-4" />
                    Add Photo
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => videosRef.current?.click()}
                  >
                    <Video className="mr-2 w-4 h-4" />
                    Add Video
                  </Button>

                  <input
                    ref={imagesRef}
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setImages(files);
                    }}
                    className="hidden"
                  />

                  <input
                    ref={videosRef}
                    id="videos"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setVideos(files);
                    }}
                    className="hidden"
                  />

                  <Button variant="outline" size="sm" onClick={() => setShowCanvas(s => !s)}>
                    {showCanvas ? 'Hide Draw' : 'Draw / Paint'}
                  </Button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div>{getSentimentIcon()}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAnalyzeSentiment} disabled={isAnalyzing}>
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSaveEntry} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Entry'}
                    </Button>
                  </div>
                </div>

                {showCanvas && (
                  <div className="mt-4">
                    <DrawCanvas ref={drawRef} />
                  </div>
                )}
              </Card>

              {/* Entries list */}
              <div className="space-y-4">
                {entries.length === 0 ? (
                  <Card className="p-4 text-center text-sm text-muted-foreground">No entries yet. Start by writing one above.</Card>
                ) : (
                  entries.map((e) => (
                    <Card key={e.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{e.title || new Date(e.entry_date).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>{getEntrySentimentIcon(e.sentiment)}</div>
                          {/* delete button removed per user request */}
                          {e.sentiment ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={"text-sm font-medium capitalize " + (
                                    e.sentiment === 'happy' ? 'text-green-500' :
                                    e.sentiment === 'neutral' ? 'text-yellow-500' :
                                    e.sentiment === 'sad' ? 'text-blue-500' :
                                    e.sentiment === 'excited' ? 'text-pink-500' :
                                    e.sentiment === 'anxious' ? 'text-purple-500' : 'text-muted-foreground'
                                  )}
                                >
                                  {e.sentiment}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {e.sentiment === 'happy' && 'Feeling happy — positive mood detected.'}
                                {e.sentiment === 'neutral' && 'Neutral mood detected.'}
                                {e.sentiment === 'sad' && 'Sad or down — take care.'}
                                {e.sentiment === 'excited' && 'Excited — high energy!'}
                                {e.sentiment === 'anxious' && 'Anxious — consider a calming activity.'}
                                {!['happy','neutral','sad','excited','anxious'].includes(e.sentiment || '') && 'Mood detected.'}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 text-sm">{e.content.length > 200 ? e.content.slice(0,200) + '...' : e.content}</div>
                      {/* Show uploaded images if any */}
                      {e.images && e.images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {e.images.map((src, idx) => (
                            <img key={idx} src={src} alt={`entry-img-${idx}`} className="w-32 h-20 object-cover rounded" />
                          ))}
                        </div>
                      )}

                      {/* Show uploaded videos if any */}
                      {e.videos && e.videos.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {e.videos.map((src, idx) => (
                            <video key={idx} src={src} className="w-48 h-32 rounded" controls />
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
