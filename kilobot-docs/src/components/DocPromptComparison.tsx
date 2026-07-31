import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './DocPromptComparison.module.css';

type DocPromptComparisonProps = {
  goodPrompt: string;
  badPrompt: string;
};

type PromptCardProps = {
  label: string;
  prompt: string;
};

function PromptCard({ label, prompt }: PromptCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>{label}</h3>
        <button
          type="button"
          className={styles.copyButton}
          onClick={copyPrompt}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          title={copied ? `${label} copied` : `Copy ${label}`}
        >
          {copied ? <Check aria-hidden size={15} /> : <Copy aria-hidden size={15} />}
        </button>
      </div>
      <pre className={styles.prompt}><code>{prompt}</code></pre>
    </article>
  );
}

export default function DocPromptComparison({ goodPrompt, badPrompt }: DocPromptComparisonProps) {
  return (
    <section className={styles.root} aria-label="System prompt examples">
      <PromptCard label="Good system prompt" prompt={goodPrompt} />
      <PromptCard label="Bad system prompt" prompt={badPrompt} />
    </section>
  );
}
