import styles from './DocVerified.module.css';

type DocVerifiedProps = {
  date: `${number}-${number}-${number}`;
};

export default function DocVerified({ date }: DocVerifiedProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <p className={styles.root}>
      Last verified: <time dateTime={date}>{formattedDate}</time>
    </p>
  );
}
