import { describe, expect, test } from "vitest";
import {
  isTeamDeleting,
  nextTeamDeletionPhase,
} from "./teamDeletion/model";

describe("team deletion lifecycle", () => {
  test("only the deleting state blocks workspace activity", () => {
    expect(isTeamDeleting({ deletionStatus: undefined })).toBe(false);
    expect(isTeamDeleting({ deletionStatus: "deleting" })).toBe(true);
  });

  test("advances through the complete ordered phase list", () => {
    expect(nextTeamDeletionPhase("stopWork")).toBe("disconnectChannels");
    expect(nextTeamDeletionPhase("disconnectChannels")).toBe("externalData");
    expect(nextTeamDeletionPhase("externalData")).toBe("localData");
    expect(nextTeamDeletionPhase("localData")).toBe("verify");
    expect(nextTeamDeletionPhase("verify")).toBe("deleteOrganization");
    expect(nextTeamDeletionPhase("deleteOrganization")).toBe("finalize");
    expect(nextTeamDeletionPhase("finalize")).toBeNull();
  });
});
