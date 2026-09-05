import { CheckCircle2, ImageIcon } from 'lucide-react';
import { SiInstagram } from 'react-icons/si';

const defaultSampleComment = 'Can you share the pricing?';

function renderHighlightedComment(keywordText: string) {
  const keyword = keywordText
    .split(',')
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  const sampleComment = keyword ? `Can you share the ${keyword}?` : defaultSampleComment;
  if (!keyword) return sampleComment;

  const start = sampleComment.toLowerCase().indexOf(keyword.toLowerCase());
  if (start < 0) return sampleComment;

  return (
    <>
      {sampleComment.slice(0, start)}
      <mark className="rounded bg-amber-200 px-0.5 text-amber-950">
        {sampleComment.slice(start, start + keyword.length)}
      </mark>
      {sampleComment.slice(start + keyword.length)}
    </>
  );
}

export function CommentAutomationPreview({
  keywordText,
  privateMessage,
  publicReply,
}: {
  keywordText: string;
  privateMessage: string;
  publicReply: string;
}) {
  return (
    <aside className="grid min-w-0 max-w-full content-start gap-4 overflow-hidden rounded-xl border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold">Preview</h3>
      </div>
      <div className="px-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white">
            <SiInstagram className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Your Page</p>
            <p className="text-[11px] text-muted-foreground">@luma_studio · 2h</p>
          </div>
        </div>
        <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="mt-3 flex min-w-0 max-w-full gap-2 text-xs leading-relaxed">
          <span className="font-semibold">alex.m</span>
          <span className="min-w-0 max-w-full break-words">{renderHighlightedComment(keywordText)}</span>
        </div>
      </div>
      {publicReply || privateMessage ? (
        <div className="grid divide-y divide-border">
          {publicReply ? (
            <div className="ml-8 flex items-start gap-2 py-3 first:pt-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white">
                <SiInstagram className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-semibold">Your Page</p>
                  <span className="text-[11px] text-muted-foreground">now</span>
                </div>
                <p className="mt-0.5 max-w-[16rem] break-words text-xs text-muted-foreground">{publicReply}</p>
              </div>
            </div>
          ) : null}
          {privateMessage ? (
            <div className="flex items-start gap-2 py-3 last:pb-0">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium">Message sent to alex.m</p>
                <p className="mt-1 max-w-full break-words text-xs text-muted-foreground">{privateMessage}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
