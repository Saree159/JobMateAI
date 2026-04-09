import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { userApi } from '@/api/jobmate';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/jobs');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (!formData.password || formData.password.length < 1) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // First-time users haven't completed onboarding yet
        if (!result.user?.target_role) {
          navigate('/onboarding');
        } else {
          navigate('/jobs');
        }
      } else if (result.error === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(formData.email);
        setError('');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendSent(false);
    await userApi.resendVerification(unverifiedEmail);
    setResendSent(true);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d1a] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-3 text-center">
          <img src={logo} alt="HireMatrix" className="mx-auto w-[180px] h-auto object-contain" />
          <CardTitle className="text-3xl bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Welcome to HireMatrix</CardTitle>
          <CardDescription className="text-base">
            Your AI-powered job application assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {unverifiedEmail && (
              <Alert className="border-amber-400 bg-amber-950/40 text-amber-200">
                <AlertDescription className="space-y-2">
                  <p>Please verify your email before signing in. Check your inbox at <strong>{unverifiedEmail}</strong>.</p>
                  {resendSent ? (
                    <p className="text-emerald-400 text-sm">Verification email resent! Check your inbox.</p>
                  ) : (
                    <button type="button" onClick={handleResend} className="text-amber-300 underline text-sm hover:text-amber-100">
                      Resend verification email
                    </button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('auth.loggingIn')}
                </>
              ) : (
                t('auth.signIn')
              )}
            </Button>

            <div className="text-center text-sm text-gray-400">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                {t('auth.signUp')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
