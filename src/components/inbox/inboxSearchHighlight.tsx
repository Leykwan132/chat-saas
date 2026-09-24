import { Fragment } from 'react';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function InboxSearchHighlight({ text, query }: { text: string; query: string }) {
  const terms = Array.from(
    new Set(query.trim().split(/\s+/).filter(Boolean)),
  ).sort((left, right) => right.length - left.length);
  if (terms.length === 0) return <>{text}</>;
  const expression = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  return (
    <>
      {text.split(expression).map((part, index) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase())
          ? <strong key={index}>{part}</strong>
          : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}
