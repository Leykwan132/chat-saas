import type { LegalSection } from '@/components/LegalDocument';
import { PRODUCT_NAME } from './legalConstants';

export const privacyPolicyProviderSections: LegalSection[] = [
  {
    id: 'authentication-service',
    title: 'Authentication service',
    body: (
      <>
        <p>
          We use WorkOS AuthKit to authenticate accounts. WorkOS processes authentication
          credentials, while {PRODUCT_NAME} receives the account identity information needed to
          create and manage your account.
        </p>
        <p>
          For more information, see{' '}
          <a href="https://workos.com/legal/privacy" target="_blank" rel="noopener noreferrer">
            WorkOS&apos;s Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'google-sign-in',
    title: 'Google sign-in',
    body: (
      <>
        <p>
          You may choose Google sign-in instead of creating an account through another sign-in
          method. You will be redirected to Google to authenticate, and the account created through
          this method has the same access, permissions, and user experience as another {PRODUCT_NAME}
          account.
        </p>
        <p>
          Google provides {PRODUCT_NAME} only your name and email address so we can identify you and
          create or access your account. {PRODUCT_NAME} never receives your Google password. Any
          additional information you choose to provide is associated with your {PRODUCT_NAME} account.
        </p>
        <p>
          You can manage Google&apos;s access in{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            your Google account permissions
          </a>{' '}
          and read{' '}
          <a
            href="https://www.google.com/policies/privacy/partners/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&apos;s privacy information for partners
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'google-workspace-api-data',
    title: 'Google Workspace API data',
    body: (
      <p>
        The use of raw or derived user data received from Workspace APIs will adhere to the Google
        User Data Policy, including the Limited Use requirements.
      </p>
    ),
  },
  {
    id: 'product-analytics',
    title: 'Product analytics',
    body: (
      <>
        <p>
          We use PostHog for product analytics and feature flags. PostHog may process device and
          usage information, together with the account identifier, name, and email address we
          provide after sign-in, so that we can understand and improve the Services.
        </p>
        <p>
          For more information, see{' '}
          <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
            PostHog&apos;s Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'security-and-performance',
    title: 'Security and performance',
    body: (
      <>
        <p>
          We use Cloudflare Workers to host our website and web application, and Cloudflare R2 to
          store and deliver media used by the Services.
        </p>
        <p>
          When you use the Services, Cloudflare may process technical request information, including
          your IP address, browser, operating system, and request data, to host, secure, and deliver
          the Services and stored media.
        </p>
        <p>
          For more information, see{' '}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare&apos;s Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'payment-service',
    title: 'Payment service',
    body: (
      <>
        <p>
          We use Stripe, Inc. (354 Oyster Point Blvd, Suite 201, South San Francisco, California,
          USA) to process payments. When you make a purchase, you provide payment information
          directly to Stripe.
        </p>
        <p>
          Stripe may collect and process your name, email address, billing address, payment details,
          and transaction information to process payments, verify identity, prevent fraud, and meet
          legal obligations. {PRODUCT_NAME} receives billing metadata needed to provide your
          subscription, but does not store full payment card numbers.
        </p>
        <p>
          For information about Stripe&apos;s handling of personal data, see{' '}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
            Stripe&apos;s Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
];
