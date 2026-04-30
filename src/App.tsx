import { SignIn, UserButton, useUser, SignOutButton } from "@clerk/react";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const Badge = () => {
  const { user } = useUser();
  if (!user) return null;
  return <span>{user.fullName}</span>;
};

const Loader = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: '#888' }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />

  </svg>
);

const App = () => {
  return (
    <>
      <AuthLoading>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Loader />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>

          <h1>User is authenticated</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <Badge />
            <UserButton />
            <SignOutButton>
              <button style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                Sign Out
              </button>
            </SignOutButton>
          </div>
          <Content />
        </div>
      </Authenticated >
    </>
  );
};

const Content = () => {
  const messages = useQuery(api.messages.getForCurrentUser);
  return <div style={{ marginTop: '2rem', color: '#666' }}>Authenticated content: {messages?.length} messages found.</div>;
};

export default App;
