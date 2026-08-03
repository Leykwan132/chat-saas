import type { LegalSection } from '@/components/LegalDocument';
import { PRODUCT_NAME } from './legalConstants';

export const termsCommercialSections: LegalSection[] = [
  {
    id: 'subscription-terms',
    title: 'Subscription terms',
    body: (
      <>
        <p>
          Some features require a paid subscription. {PRODUCT_NAME} does not offer free trials.
          Before you place an order, checkout identifies the plan, available features, price,
          billing interval, taxes where applicable, and other disclosed charges. By submitting an
          order, you agree to pay the disclosed amount.
        </p>
        <p>
          We may offer accepted Early Adopter Program participants a Growth plan at no charge for
          three months in exchange for feedback.
        </p>
        <p>
          Payments are processed by Stripe. Paid monthly and annual subscriptions renew
          automatically for the same billing interval, and Stripe charges the payment method on
          file, until you cancel through the Stripe billing portal or by contacting us before the
          next renewal date. Cancellation takes effect immediately and is reflected directly in your
          billing status.
        </p>
        <p>
          If a payment cannot be collected, we may restrict or suspend access until payment is
          received. We may change prices for future billing periods with reasonable prior notice.
        </p>
        <p>
          Payments are non-refundable and we do not provide credits for partial or unused
          subscription periods, except where applicable law requires otherwise.
        </p>
        <p>
          We may offer discounts through Stripe coupons or promotional codes. Any offer will state
          its eligibility, value, duration, and restrictions. Discounts are non-transferable and
          may not be combined unless we state otherwise; they do not create a right to future
          discounts.
        </p>
        <p>
          You are responsible for fees charged by third-party messaging platforms, including Meta,
          that result from your use of connected channels.
        </p>
      </>
    ),
  },
  {
    id: 'content-provided-by-kilobot',
    title: `Content provided by ${PRODUCT_NAME}`,
    body: (
      <>
        <p>
          Unless we clearly state otherwise, all content available through {PRODUCT_NAME} is owned
          by us or our licensors. We make reasonable efforts to ensure this content does not
          infringe applicable law or third-party rights, but cannot guarantee that result in every
          case. Please report a related complaint using the contact details in these Terms.
        </p>
        <p>
          We and our licensors reserve all intellectual property rights in that content. You may
          use it only as necessary for the proper use of the Services.
        </p>
        <p>
          Except where we expressly permit it or applicable law allows it, you may not copy,
          download, share, modify, translate, transform, publish, transmit, sell, sublicense,
          edit, transfer, assign, or create derivative works from content available through the
          Services, or enable a third party to do so. If we expressly permit you to download, copy,
          or share content, you may do so only for the stated purpose and must preserve required
          copyright and other attributions.
        </p>
      </>
    ),
  },
  {
    id: 'software-license',
    title: 'Software license',
    body: (
      <>
        <p>
          All intellectual property, industrial property, and other exclusive rights in software or
          technical applications embedded in or related to {PRODUCT_NAME} belong to us or our
          licensors.
        </p>
        <p>
          Subject to your compliance with these Terms, we grant you a revocable, non-exclusive,
          non-sublicensable, non-transferable licence to use that software and related technical
          means solely within the scope and for the purpose of the Services.
        </p>
        <p>
          This licence does not grant access to, use of, or disclosure of source code. The
          techniques, algorithms, procedures, and related documentation remain our or our
          licensors&apos; property. All licences and rights granted to you end when these Terms or your
          access to the Services end.
        </p>
      </>
    ),
  },
  {
    id: 'service-reselling',
    title: 'Service reselling',
    body: (
      <p>
        You may not reproduce, duplicate, copy, sell, resell, or otherwise exploit any portion of
        {PRODUCT_NAME} or the Services without our express prior written permission, whether given
        directly or through an authorized reselling program.
      </p>
    ),
  },
];
