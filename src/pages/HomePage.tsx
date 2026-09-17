import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { Navigate } from 'react-router';
import LandingPage from '@/pages/LandingPage';

export default function HomePage() {
  const { isLoading, surface } = useAuth();

  if (surface === 'partner') {
    return <Navigate to="/sign-in" replace />;
  }

  if (isLoading) {
    return (
      <div className="landing-page min-h-[100svh] bg-white dark:bg-[#060606]" />
    );
  }

  return <LandingPage />;
}
