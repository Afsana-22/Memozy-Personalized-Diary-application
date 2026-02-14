import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookHeart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      await signIn(email, password);
    } else {
      const { error } = await signUp(email, password, username);
      if (!error) {
        setVerificationSent(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-hover">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center">
            <BookHeart className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin 
              ? "Sign in to continue your journaling journey" 
              : "Start capturing your memories today"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {verificationSent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm">A confirmation link was sent to <strong>{email}</strong>. Check your inbox and click the link to verify your account.</p>
                <div className="flex gap-2 justify-center">
                      <Button
                    onClick={async () => {
                      // Re-trigger sign up to resend confirmation email (supabase client will send another email)
                          const { error } = await signUp(email, password, username);
                      if (!error) {
                        toast({ title: "Verification resent", description: "Please check your email." });
                      }
                    }}
                    variant="outline"
                    className="h-10"
                  >
                    Resend verification
                  </Button>
                  <Button
                    onClick={() => {
                      setIsLogin(true);
                      setVerificationSent(false);
                    }}
                    className="h-10"
                  >
                    Back to Sign in
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="your display name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-base">
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setVerificationSent(false);
              }}
              className="text-primary hover:underline text-sm font-medium"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
