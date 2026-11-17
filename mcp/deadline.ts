import { IntegrationError } from "../shared/integrations/errors";

export function withDeadline<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted)
    return Promise.reject(new IntegrationError("REQUEST_TIMED_OUT", 504));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new IntegrationError("REQUEST_TIMED_OUT", 504));
    signal.addEventListener("abort", abort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}
