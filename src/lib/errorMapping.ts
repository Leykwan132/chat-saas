import { ConvexError } from 'convex/values';

export type MappedError = {
  title: string;
  message: string;
};

// Map code numbers or string IDs to user-friendly titles and description messages.
const ERROR_CODE_MAP: Record<string | number, MappedError> = {
  123: {
    title: 'Fancy Error Title',
    message: 'This is a mapped fancy error message on the frontend.',
  },
  'USER_ALREADY_MEMBER': {
    title: 'Teammate Already Added',
    message: 'This user is already a member of this organization.',
  },
  'SWITCH_TO_SHARED_TEAM': {
    title: 'Action Required',
    message: 'Please switch to a shared team to invite members.',
  },
  'INVALID_EMAIL': {
    title: 'Invalid Email Address',
    message: 'Please enter a valid email address.',
  },
  'INVALID_ROLE': {
    title: 'Invalid Role Selection',
    message: 'Please choose a valid role for the invitation.',
  },
  'OWNER_INVITE_ONLY': {
    title: 'Permission Denied',
    message: 'Only team owners can invite someone as an Owner.',
  },
  'INVALID_REFERRAL_CODE': {
    title: 'Invalid referral code',
    message: 'This referral code was not found.',
  },
  'SELF_REFERRAL': {
    title: 'Invalid referral code',
    message: 'You cannot use your own referral code.',
  },
  'REFERRAL_LIMIT_REACHED': {
    title: 'Referral limit reached',
    message: 'This referral code has reached its limit.',
  },
  'ALREADY_REDEEMED': {
    title: 'Referral code already used',
    message: 'A referral code has already been used for this account.',
  },
};

// Map lowercase legacy string errors to user-friendly titles and description messages (as fallbacks)
const LEGACY_ERROR_MAP: Record<string, MappedError> = {
  'user already a member of organization': {
    title: 'Teammate Already Added',
    message: 'This user is already a member of this organization.',
  },
  'switch to a shared team to invite': {
    title: 'Action Required',
    message: 'Please switch to a shared team to invite members.',
  },
  'enter a valid email address': {
    title: 'Invalid Email Address',
    message: 'Please enter a valid email address.',
  },
  'choose a valid role': {
    title: 'Invalid Role Selection',
    message: 'Please choose a valid role for the invitation.',
  },
  'only team owners can invite': {
    title: 'Permission Denied',
    message: 'Only team owners can invite someone as an Owner.',
  },
};

/**
 * Parses any caught frontend error. If it is an instance of ConvexError, it extracts
 * the structured code, maps it to a title and description, and handles casting.
 * For developer/unhandled errors, it strips server/stack-trace wrappers and falls back safely.
 */
export function mapBackendError(err: unknown, defaultFallbackTitle: string = 'Error'): MappedError {
  if (!err) {
    return {
      title: defaultFallbackTitle,
      message: 'An unexpected error occurred.',
    };
  }

  // 1. Check if the error is a structured application error (ConvexError)
  if (err instanceof ConvexError) {
    const data = err.data as Record<string, any>;
    if (data && typeof data === 'object') {
      const code = data.code;
      if (code !== undefined && ERROR_CODE_MAP[code] !== undefined) {
        return ERROR_CODE_MAP[code];
      }

      // If data is structured but code is not in our dictionary, return message property
      return {
        title: defaultFallbackTitle,
        message: data.message || String(data),
      };
    }

    return {
      title: defaultFallbackTitle,
      message: String(data),
    };
  }

  // 2. Otherwise, treat it as a standard error (network issue, developer error, etc.)
  const rawMessage = err instanceof Error ? err.message : String(err);
  
  // Strip system prefixes and stack trace suffixes
  const cleanMessage = rawMessage
    .replace(/^Server Error\s*/i, '')
    .replace(/^Uncaught Error:\s*/i, '')
    .split(/\s+at\s+/)[0]
    .trim();

  const lowerMessage = cleanMessage.toLowerCase();

  // Try matching legacy strings
  for (const [key, value] of Object.entries(LEGACY_ERROR_MAP)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }

  // Final fallback to clean version of the message
  return {
    title: defaultFallbackTitle,
    message: cleanMessage || 'An unexpected error occurred.',
  };
}
