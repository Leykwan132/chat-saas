import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {createPortal} from 'react-dom';
import clsx from 'clsx';
import {X} from 'lucide-react';
import type {Props} from '@theme/MDXComponents/Img';
import styles from './styles.module.css';

type ExpandedImageDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  src?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  onClose: () => void;
};

export function isBackdropSelection(
  target: EventTarget,
  currentTarget: EventTarget,
): boolean {
  return target === currentTarget;
}

export function ExpandedImageDialog({
  dialogRef,
  src,
  srcSet,
  sizes,
  alt,
  onClose,
}: ExpandedImageDialogProps): ReactNode {
  const label = alt?.trim() || 'Documentation image';

  function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (isBackdropSelection(event.target, event.currentTarget)) {
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={`Expanded image: ${label}`}
      onClick={handleBackdrop}
      onClose={onClose}
    >
      <button
        type="button"
        className={styles.close}
        aria-label="Close expanded image"
        onClick={() => dialogRef.current?.close()}
      >
        <X aria-hidden="true" />
      </button>
      <img
        className={styles.expanded}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        decoding="async"
      />
    </dialog>
  );
}

export default function MDXImg({
  className,
  alt,
  src,
  srcSet,
  sizes,
  ...props
}: Props): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const label = alt?.trim() || 'Documentation image';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!expanded || !dialog) return;
    if (typeof dialog.showModal !== 'function') {
      setExpanded(false);
      return;
    }
    dialog.showModal();
  }, [expanded]);

  return (
    <span className={styles.root} role="group">
      <button
        type="button"
        className={styles.trigger}
        aria-label={`Expand image: ${label}`}
        onClick={() => setExpanded(true)}
      >
        <img
          decoding="async"
          loading="lazy"
          {...props}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          className={clsx(styles.image, className)}
        />
      </button>
      {alt?.trim() ? (
        <span className={styles.caption} aria-hidden="true">{alt}</span>
      ) : null}
      {expanded && typeof document !== 'undefined'
        ? createPortal(
            <ExpandedImageDialog
              dialogRef={dialogRef}
              src={src}
              srcSet={srcSet}
              sizes={sizes}
              alt={alt}
              onClose={() => setExpanded(false)}
            />,
            document.body,
          )
        : null}
    </span>
  );
}
