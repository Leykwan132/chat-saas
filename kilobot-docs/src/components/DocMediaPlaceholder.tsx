import styles from './DocMediaPlaceholder.module.css';

type MediaKind = 'image' | 'video';

type DocMediaPlaceholderProps = {
  kind: MediaKind;
  title: string;
  description: string;
  capture: string[];
  assetPath: string;
  callouts?: string[];
  duration?: string;
  sensitive?: string[];
};

function BriefList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;

  return (
    <div className={styles.brief}>
      <p className={styles.briefTitle}>{title}</p>
      <ol>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ol>
    </div>
  );
}

export default function DocMediaPlaceholder({
  kind,
  title,
  description,
  capture,
  assetPath,
  callouts,
  duration,
  sensitive,
}: DocMediaPlaceholderProps) {
  const kindLabel = kind === 'image' ? 'Image' : 'Video';

  return (
    <section
      className={styles.root}
      aria-label={`${kindLabel} needed: ${title}`}
    >
      <p className={styles.eyebrow}>Media needed · {kindLabel}</p>
      <h3 className={styles.title}>{title}</h3>
      <p>{description}</p>
      <BriefList title="Capture" items={capture} />
      <BriefList title="Callouts" items={callouts} />
      {duration ? (
        <p className={styles.detail}><strong>Target duration:</strong> {duration}</p>
      ) : null}
      <BriefList title="Hide before recording" items={sensitive} />
      <p className={styles.asset}>
        <strong>Final asset:</strong> <code>{assetPath}</code>
      </p>
    </section>
  );
}
