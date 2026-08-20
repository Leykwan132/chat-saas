import { expect, test, vi } from "vitest";
import {
  exchangeCodeForUserToken,
  listPagesForUserToken,
} from "./messengerConnect";

test("logs safe Messenger token exchange input and output metadata", async () => {
  const infoLog = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ access_token: "user-access-token", expires_in: 3600 }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  try {
    await exchangeCodeForUserToken(
      "oauth-code-secret",
      "app-123",
      "app-secret-value",
      "https://app.kilobot.com/auth/messenger/callback",
    );

    expect(infoLog).toHaveBeenNthCalledWith(
      1,
      "[messenger] OAuth code exchange input",
      {
        appId: "app-123",
        appSecretConfigured: true,
        codeLength: 17,
        redirectUri: "https://app.kilobot.com/auth/messenger/callback",
      },
    );
    expect(infoLog).toHaveBeenNthCalledWith(
      2,
      "[messenger] OAuth code exchange output",
      {
        accessTokenLength: 17,
        accessTokenRetrieved: true,
        accessTokenSuffix: "oken",
        expiresInSeconds: 3600,
      },
    );
    expect(JSON.stringify(infoLog.mock.calls)).not.toContain("oauth-code-secret");
    expect(JSON.stringify(infoLog.mock.calls)).not.toContain("app-secret-value");
    expect(JSON.stringify(infoLog.mock.calls)).not.toContain("user-access-token");
  } finally {
    infoLog.mockRestore();
    vi.unstubAllGlobals();
  }
});

test("logs safe Messenger Page-list input and output metadata", async () => {
  const infoLog = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          {
            id: "page-123",
            name: "Kilobot Support",
            access_token: "page-access-token",
          },
        ],
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  try {
    const pages = await listPagesForUserToken("user-access-token");

    expect(pages).toHaveLength(1);
    expect(infoLog).toHaveBeenNthCalledWith(
      1,
      "[messenger] Page list input",
      {
        userAccessTokenLength: 17,
        userAccessTokenRetrieved: true,
        userAccessTokenSuffix: "oken",
      },
    );
    expect(infoLog).toHaveBeenNthCalledWith(
      2,
      "[messenger] Page list output",
      {
        pageCount: 1,
        pages: [
          {
            accessTokenLength: 17,
            accessTokenRetrieved: true,
            accessTokenSuffix: "oken",
            id: "page-123",
            name: "Kilobot Support",
          },
        ],
      },
    );
    expect(JSON.stringify(infoLog.mock.calls)).not.toContain("user-access-token");
    expect(JSON.stringify(infoLog.mock.calls)).not.toContain("page-access-token");
  } finally {
    infoLog.mockRestore();
    vi.unstubAllGlobals();
  }
});
