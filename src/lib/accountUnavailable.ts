import { ConvexError } from "convex/values";
import { ACCOUNT_UNAVAILABLE_ERROR_CODE } from "../../shared/accountAvailability";

export function isAccountUnavailableError(error: unknown) {
  return error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    error.data.code === ACCOUNT_UNAVAILABLE_ERROR_CODE;
}
