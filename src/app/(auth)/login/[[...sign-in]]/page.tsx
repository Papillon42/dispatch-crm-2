import { SignIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  const { userId } = auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-background text-text-primary flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold text-text-primary">Dispatch CRM</p>
          <p className="mt-1 text-sm text-text-secondary">Sign in to continue</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/login"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              variables: { colorPrimary: '#3B82F6', colorBackground: '#0A0C10' },
            }}
          />
        </div>
      </div>
    </main>
  );
}
