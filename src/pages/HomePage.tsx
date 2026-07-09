import { useAuth } from '@workos-inc/authkit-react';
import LandingPage from '@/pages/LandingPage';

export default function HomePage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="landing-page min-h-[100svh] bg-white dark:bg-[#060606]" />
    );
  }

  return <LandingPage />;
}
