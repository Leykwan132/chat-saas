import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AppAuthProvider, type AppAuthContextValue } from "./AppAuthProvider";
import { usePartnerConvexAuth } from "./usePartnerConvexAuth";

const authValue: AppAuthContextValue = {
  isLoading: false,
  user: {
    id: "user_1",
    email: "customer@partner.test",
    firstName: null,
    lastName: null,
    profilePictureUrl: null,
  },
  surface: "partner",
  getAccessToken: async () => "token",
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  switchToOrganization: async () => {},
};

test("fetchAccessToken keeps its identity across re-renders so Convex auth does not loop", () => {
  const seen: Array<() => Promise<string | null>> = [];

  function Probe() {
    const { fetchAccessToken } = usePartnerConvexAuth();
    const [renders, setRenders] = useState(0);
    if (renders < 2) setRenders(renders + 1);
    seen.push(fetchAccessToken);
    return null;
  }

  renderToStaticMarkup(
    <AppAuthProvider value={authValue}>
      <Probe />
    </AppAuthProvider>,
  );

  expect(seen.length).toBe(3);
  expect(new Set(seen).size).toBe(1);
});
