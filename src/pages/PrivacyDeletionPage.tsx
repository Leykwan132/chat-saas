import { Link, useSearchParams } from 'react-router';
import { LegalDocumentLayout } from '@/components/LegalDocumentLayout';
import { LEGAL_EMAIL } from '@/content/legalConstants';

export default function PrivacyDeletionPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  return (
    <LegalDocumentLayout title="Data Deletion Request">
      <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
        {code ? (
          <>
            <p className="text-base text-zinc-900 dark:text-white">
              Your data deletion request has been received.
            </p>
            <p>
              Confirmation code:{' '}
              <span className="font-mono text-zinc-900 dark:text-white">{code}</span>
            </p>
            <p>
              We will process your request in accordance with applicable law and Meta platform
              requirements. If you have questions, contact us at{' '}
              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {LEGAL_EMAIL}
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p>
              This page confirms the status of data deletion requests submitted through connected
              Meta platforms (Instagram or Messenger).
            </p>
            <p>
              If you arrived here without a confirmation code, your request may still be processing,
              or you may have reached this page directly. For help, email{' '}
              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {LEGAL_EMAIL}
              </a>
              .
            </p>
          </>
        )}
        <p>
          <Link
            to="/privacy"
            className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Read our Privacy Policy
          </Link>
        </p>
      </div>
    </LegalDocumentLayout>
  );
}
