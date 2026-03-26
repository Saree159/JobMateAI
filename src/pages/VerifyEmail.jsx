import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { userApi } from '@/api/jobmate';
import logo from '@/assets/logo.png';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resendState, setResendState] = useState('idle'); // idle | loading | sent | error

  const handleResend = async () => {
    setResendState('loading');
    try {
      await userApi.resendVerification(email);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d1a] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 text-center">
        <CardHeader className="space-y-3">
          <img src={logo} alt="HireMatrix" className="mx-auto w-[160px] h-auto object-contain" />
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-900/40 flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription className="text-base">
            We sent a verification link to{' '}
            <span className="font-semibold text-foreground">{email || 'your email'}</span>.
            Click the link to activate your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder or resend below.
          </p>

          {resendState === 'sent' ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Verification email resent!
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendState === 'loading' || !email}
            >
              {resendState === 'loading' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
              ) : (
                'Resend verification email'
              )}
            </Button>
          )}

          {resendState === 'error' && (
            <p className="text-sm text-red-400">Failed to resend. Please try again.</p>
          )}

          <div className="pt-2 text-sm text-muted-foreground">
            Already verified?{' '}
            <Link to="/login" className="text-blue-500 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
