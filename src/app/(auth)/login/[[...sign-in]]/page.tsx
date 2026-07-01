import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn
        appearance={{
          variables: { colorPrimary: '#3B82F6', colorBackground: '#0A0C10' },
        }}
      />
    </div>
  );
}
