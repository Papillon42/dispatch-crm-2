import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const { userId } = auth();
  redirect(userId ? '/dashboard' : '/login');
}
