import { WorkOS } from "@workos-inc/node";

const WORKOS_API_BASE = "https://api.workos.com";

export function getWorkOSApiKey(): string {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WORKOS_API_KEY is not configured. Set it with `bunx convex env set WORKOS_API_KEY <value>`.",
    );
  }
  return apiKey;
}

export function createWorkOSClient(fetchImplementation: typeof fetch = fetch): WorkOS {
  return new WorkOS({
    apiKey: getWorkOSApiKey(),
    fetchFn: fetchImplementation,
  });
}

export async function workosRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${WORKOS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getWorkOSApiKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();
  let payload: T & { message?: string };

  if (text.length === 0) {
    payload = {} as T & { message?: string };
  } else {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        payload = {} as T & { message?: string };
      } else {
        throw new Error(
          `WorkOS returned non-JSON (status ${response.status}): ${text.slice(0, 200)}`,
        );
      }
    }
  }

  if (!response.ok) {
    throw new Error(payload.message ?? text.slice(0, 200) ?? `WorkOS request failed (${response.status})`);
  }

  return payload;
}

export type WorkOSInvitation = {
  id: string;
  email: string;
  state: "pending" | "accepted" | "expired" | "revoked";
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  organization_id: string | null;
  inviter_user_id: string | null;
  accepted_user_id: string | null;
  role_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOSInvitationList = {
  object: "list";
  data: WorkOSInvitation[];
  list_metadata?: {
    before?: string | null;
    after?: string | null;
  };
};

export type WorkOSOrganizationDomain = {
  id?: string;
  domain: string;
  state?: string;
};

export type WorkOSOrganization = {
  id: string;
  name: string;
  object: "organization";
  domains?: WorkOSOrganizationDomain[];
};

export type WorkOSUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture_url: string | null;
};

export type WorkOSUserList = {
  object: "list";
  data: WorkOSUser[];
  list_metadata?: {
    before?: string | null;
    after?: string | null;
  };
};

export async function fetchWorkosUserById(userId: string): Promise<WorkOSUser> {
  return await workosRequest<WorkOSUser>(`/user_management/users/${userId}`);
}

export async function fetchWorkosUserByEmail(email: string): Promise<WorkOSUser | null> {
  const params = new URLSearchParams({
    email: email.trim().toLowerCase(),
    limit: "1",
  });
  const result = await workosRequest<WorkOSUserList>(
    `/user_management/users?${params.toString()}`,
  );
  return result.data[0] ?? null;
}

export type WorkOSOrganizationMembership = {
  id: string;
  user_id: string;
  organization_id: string;
  status: "active" | "inactive" | "pending";
  created_at: string;
  role?: { slug: string } | null;
  user?: WorkOSUser | null;
};

export type WorkOSOrganizationMembershipList = {
  object: "list";
  data: WorkOSOrganizationMembership[];
  list_metadata?: {
    before?: string | null;
    after?: string | null;
  };
};

export type WorkOSRole = {
  object: "role";
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  resource_type_slug: string;
  type: "OrganizationRole" | "EnvironmentRole";
  created_at: string;
  updated_at: string;
};

export type WorkOSRoleList = {
  object: "list";
  data: WorkOSRole[];
  list_metadata?: {
    before?: string | null;
    after?: string | null;
  };
};

export type WorkOSPermission = {
  object: "permission";
  id: string;
  slug: string;
  name: string;
  description: string | null;
  system: boolean;
  resource_type_slug: string;
  created_at: string;
  updated_at: string;
};

export type WorkOSPermissionList = {
  object: "list";
  data: WorkOSPermission[];
  list_metadata?: {
    before?: string | null;
    after?: string | null;
  };
};
