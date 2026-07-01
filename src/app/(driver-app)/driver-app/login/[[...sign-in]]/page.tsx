import { SignIn } from '@clerk/nextjs';
import { Truck } from 'lucide-react';

export default function DriverAppLoginPage() {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col items-center px-6 py-10">
        <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mb-4">
          <Truck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Dispatch CRM</h1>
        <p className="text-sm text-text-secondary mb-8">Driver App</p>
        <p className="text-xl font-bold text-text-primary mb-1">Welcome back!</p>
        <p className="text-sm text-text-secondary mb-6">Sign in to continue</p>
        <SignIn
          path="/driver-app/login"
          routing="path"
          afterSignInUrl="/driver-app"
          appearance={{
            variables: { colorPrimary: '#3B82F6', colorBackground: '#0A0C10' },
          }}
        />
        <p className="text-2xs text-text-muted mt-8">Version 1.4.2</p>
      </div>
    </div>
  );
}
