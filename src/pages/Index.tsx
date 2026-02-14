import { Button } from "@/components/ui/button";
import { BookHeart, Sparkles, Calendar, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-diary.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 z-10">
              <div className="inline-flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-soft">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Your Personal Space</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Welcome to{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Memozy
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                Your personalized diary with AI-powered sentiment analysis. 
                Capture memories, track moods, and reflect on your journey.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")}
                  className="text-lg"
                >
                  <BookHeart className="mr-2" />
                  Start Writing
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="text-lg"
                >
                  Sign In
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full"></div>
              <img 
                src={heroImage} 
                alt="Memozy Diary" 
                className="relative rounded-3xl shadow-hover w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Everything You Need to <span className="text-primary">Remember</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-card backdrop-blur-sm p-8 rounded-2xl shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">AI Sentiment Analysis</h3>
              <p className="text-muted-foreground">
                Understand your emotions better. Our AI analyzes your entries to track your mood patterns over time.
              </p>
            </div>
            
            <div className="bg-gradient-card backdrop-blur-sm p-8 rounded-2xl shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6">
                <Image className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Rich Media Support</h3>
              <p className="text-muted-foreground">
                Add photos and videos to your entries. Make your memories come alive with multimedia content.
              </p>
            </div>
            
            <div className="bg-gradient-card backdrop-blur-sm p-8 rounded-2xl shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Calendar View</h3>
              <p className="text-muted-foreground">
                Browse your memories by date. Easily revisit any day and see what you were feeling and experiencing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-primary rounded-3xl p-12 text-center shadow-hover">
            <h2 className="text-4xl font-bold text-white mb-6">
              Start Your Journey Today
            </h2>
            <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of people who trust Memozy to keep their memories safe and meaningful.
            </p>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="bg-white text-primary hover:bg-white/90 border-0 text-lg"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
