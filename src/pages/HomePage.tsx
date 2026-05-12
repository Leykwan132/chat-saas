import { useAuth } from '@workos-inc/authkit-react';
import { Spinner } from '@/components/ui/spinner';
import LandingPage from '@/pages/LandingPage';

export default function HomePage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#050505]">
        <Spinner className="h-8 w-8 text-zinc-500" />
      </div>
    );
  }

  return <LandingPage />;
}
