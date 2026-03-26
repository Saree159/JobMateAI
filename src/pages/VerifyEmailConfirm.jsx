import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { userApi } from '@/api/jobmate';
import logo from '@/assets/logo.png';

export default function VerifyEmailConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    userApi.verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d1a] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 text-center">
        <CardHeader className="space-y-3">
          <img src={logo} alt="HireMatrix" className="mx-auto w-[160px] h-auto object-contain" />

          {state === 'loading' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-900/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying your email…</CardTitle>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-900/40 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl">Email verified!</CardTitle>
              <CardDescription className="text-base">
                Your account is now active. You can sign in and start your job search.
              </CardDescription>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-2xl">Link invalid or expired</CardTitle>
              <CardDescription className="text-base">
                This verification link is invalid or has already been used. Request a new one from the login page.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {state === 'success' && (
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link to="/login">Sign in to HireMatrix</Link>
            </Button>
          )}
          {state === 'error' && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Back to login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
