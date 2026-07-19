# PostHog Feature Flag Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the landing-page token statistic and every Quick Replies entry point with the two existing PostHog feature flags.

**Architecture:** Centralize exact PostHog keys and tri-state hooks in one frontend module. Consumers fail closed while flags resolve, skip gated Convex queries, and use a loading-aware route component for direct Quick Replies URLs. Narrow extractions bring every touched code file below 300 lines without changing unrelated behavior.

**Tech Stack:** React 19, TypeScript 6, PostHog React, Convex React, React Router 7, Vitest 1, Bun, Node.js 22.

## Global Constraints

- Run every script and test through `source ~/.nvm/nvm.sh && nvm use 22` in the same shell command.
- Keep every code file below 300 lines.
- Add no comments; use descriptive modules, functions, and names.
- Use `show-token-usage` and `show-saved-replies` exactly.
- Treat unresolved ordinary UI flags as hidden.
- Wait for direct-route flag resolution before rendering or redirecting.
- Do not change Convex Quick Reply data, APIs, permissions, or token-total calculation.
- Follow red-green-refactor and do not write production behavior before its focused failing test.
- Preserve the unrelated local edit in `docs/kilobot-launch-video-script.md`.

---

### Task 1: Centralize PostHog feature flags

**Files:**
- Create: `src/lib/posthogFeatureFlags.ts`
- Create: `src/lib/posthogFeatureFlags.test.ts`

**Interfaces:**
- Consumes: `useFeatureFlagEnabled(flag: string): boolean | undefined` from `@posthog/react`.
- Produces: `POSTHOG_FEATURE_FLAGS`, `ProductFeatureFlagState`, `isProductFeatureEnabled`, `useShowTokenUsage`, and `useShowSavedReplies`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/posthogFeatureFlags.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  POSTHOG_FEATURE_FLAGS,
  isProductFeatureEnabled,
} from './posthogFeatureFlags';

describe('PostHog product feature flags', () => {
  test('uses the configured PostHog keys', () => {
    expect(POSTHOG_FEATURE_FLAGS).toEqual({
      showTokenUsage: 'show-token-usage',
      showSavedReplies: 'show-saved-replies',
    });
  });

  test.each([
    [true, true],
    [false, false],
    [undefined, false],
  ] as const)('treats %s as enabled=%s', (state, expected) => {
    expect(isProductFeatureEnabled(state)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts
```

Expected: FAIL because `./posthogFeatureFlags` does not exist.

- [ ] **Step 3: Add the minimal shared implementation**

Create `src/lib/posthogFeatureFlags.ts`:

```ts
import { useFeatureFlagEnabled } from '@posthog/react';

export const POSTHOG_FEATURE_FLAGS = {
  showTokenUsage: 'show-token-usage',
  showSavedReplies: 'show-saved-replies',
} as const;

export type ProductFeatureFlagState = boolean | undefined;

export function isProductFeatureEnabled(
  state: ProductFeatureFlagState,
): state is true {
  return state === true;
}

export function useShowTokenUsage(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.showTokenUsage);
}

export function useShowSavedReplies(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.showSavedReplies);
}
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts
```

Expected: 1 file and 4 tests PASS.

- [ ] **Step 5: Commit the shared flag API**

```bash
git add src/lib/posthogFeatureFlags.ts src/lib/posthogFeatureFlags.test.ts
git commit -m "Add typed PostHog feature flags"
```

---

### Task 2: Gate the landing token statistic and query

**Files:**
- Create: `src/components/landing/LandingStatsFeatureFlag.test.ts`
- Modify: `src/components/landing/LandingStatsSection.tsx`

**Interfaces:**
- Consumes: `useShowTokenUsage(): boolean | undefined` and `isProductFeatureEnabled(state): state is true`.
- Produces: a two-stat or three-stat landing model and a skipped lifetime usage query while disabled or unresolved.

- [ ] **Step 1: Write the failing integration contract**

Create `src/components/landing/LandingStatsFeatureFlag.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(
  new URL('./LandingStatsSection.tsx', import.meta.url),
  'utf8',
);

describe('landing token usage feature flag', () => {
  test('skips lifetime token usage until the flag is enabled', () => {
    expect(source).toContain('useShowTokenUsage()');
    expect(source).toContain(
      "showTokenUsage ? {} : 'skip'",
    );
  });

  test('adds the token statistic and third column only when enabled', () => {
    expect(source).toContain('...(showTokenUsage');
    expect(source).toContain("'md:grid-cols-3': showTokenUsage");
    expect(source).toContain("'md:grid-cols-2': !showTokenUsage");
  });
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingStatsFeatureFlag.test.ts
```

Expected: FAIL because `LandingStatsSection.tsx` does not read the feature flag or skip the query.

- [ ] **Step 3: Implement the gated statistic**

Update imports in `src/components/landing/LandingStatsSection.tsx`:

```ts
import {
  isProductFeatureEnabled,
  useShowTokenUsage,
} from '@/lib/posthogFeatureFlags';
```

Replace the start of `StatsSection` through `stats` with:

```ts
export function StatsSection() {
  const tokenUsageState = useShowTokenUsage();
  const showTokenUsage = isProductFeatureEnabled(tokenUsageState);
  const aggregates = useQuery(
    api.agentUsage.getLifetimeModelUsage,
    showTokenUsage ? {} : 'skip',
  );
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  const totalTokens = aggregates?.reduce(
    (sum, item) => sum + item.totalTokens,
    0,
  ) ?? 0;
  const modelsCount = supportedModels?.length ?? 0;

  const stats: LandingStat[] = [
    {
      value: modelsCount,
      label: 'Models Supported',
    },
    ...(showTokenUsage
      ? [{
          value: totalTokens,
          label: 'Total Token Used',
        }]
      : []),
    {
      value: businessesOnboarded,
      label: 'Businesses Onboarded',
    },
  ];
```

Replace the grid class with:

```tsx
<div
  className={cn(
    'grid grid-cols-1 gap-12 text-center sm:gap-16',
    {
      'md:grid-cols-3': showTokenUsage,
      'md:grid-cols-2': !showTokenUsage,
    },
  )}
>
```

- [ ] **Step 4: Run focused and existing landing tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/landing/LandingStatsFeatureFlag.test.ts src/pages/LandingPage.test.ts
```

Expected: 2 files and 4 tests PASS.

- [ ] **Step 5: Commit the landing gate**

```bash
git add src/components/landing/LandingStatsSection.tsx src/components/landing/LandingStatsFeatureFlag.test.ts
git commit -m "Gate landing token usage with PostHog"
```

---

### Task 3: Gate Quick Replies in dashboard navigation

**Files:**
- Create: `src/components/AppSidebarFeatureFlag.test.ts`
- Modify: `src/components/app-sidebar-nav.ts`
- Modify: `src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useShowSavedReplies(): boolean | undefined` and `isProductFeatureEnabled`.
- Produces: `getNavItems(agentId, { showSavedReplies })`, with Quick Replies absent when `showSavedReplies` is false.

- [ ] **Step 1: Write the failing navigation tests**

Create `src/components/AppSidebarFeatureFlag.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { getNavItems } from './app-sidebar-nav';

describe('Quick Replies sidebar feature flag', () => {
  test('includes Quick Replies when enabled', () => {
    const items = getNavItems('agent-id', { showSavedReplies: true });

    expect(items.tools.map((item) => item.label)).toContain('Quick Replies');
  });

  test('omits Quick Replies when disabled', () => {
    const items = getNavItems('agent-id', { showSavedReplies: false });

    expect(items.tools.map((item) => item.label)).not.toContain('Quick Replies');
  });
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarFeatureFlag.test.ts
```

Expected: FAIL because `getNavItems` does not accept feature options and always includes Quick Replies.

- [ ] **Step 3: Make navigation generation feature-aware**

Add this type to `src/components/app-sidebar-nav.ts`:

```ts
export type NavFeatureOptions = {
  showSavedReplies: boolean;
};
```

Change the signature to:

```ts
export function getNavItems(
  agentId: string,
  { showSavedReplies }: NavFeatureOptions,
): {
```

Replace the `tools` array with:

```ts
tools: [
  ...(showSavedReplies
    ? [{
        to: `/dashboard/${agentId}/quick-replies`,
        icon: ReplyAll,
        label: 'Quick Replies',
        requiredPermission: Permission.CHATS_READ,
      }]
    : []),
  { to: `/dashboard/${agentId}/broadcast`, icon: Megaphone, label: 'Broadcast', requiredPermission: Permission.BROADCAST_READ },
  { to: `/dashboard/${agentId}/templates`, icon: FileText, label: 'Message Templates', requiredPermission: Permission.BROADCAST_READ },
],
```

In `src/components/app-sidebar.tsx`, add:

```ts
import {
  isProductFeatureEnabled,
  useShowSavedReplies,
} from '@/lib/posthogFeatureFlags';
```

Replace the current `navItems` assignment with:

```ts
const savedRepliesState = useShowSavedReplies();
const navItems = getNavItems(agent._id, {
  showSavedReplies: isProductFeatureEnabled(savedRepliesState),
});
```

- [ ] **Step 4: Run the focused test and check file sizes**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/AppSidebarFeatureFlag.test.ts && wc -l src/components/app-sidebar.tsx src/components/app-sidebar-nav.ts
```

Expected: 1 file and 2 tests PASS; both code files report fewer than 300 lines.

- [ ] **Step 5: Commit the navigation gate**

```bash
git add src/components/app-sidebar.tsx src/components/app-sidebar-nav.ts src/components/AppSidebarFeatureFlag.test.ts
git commit -m "Gate Quick Replies navigation with PostHog"
```

---

### Task 4: Extract and gate the Inbox Quick Replies picker

**Files:**
- Create: `src/components/chat/ChatPromptInputAttachments.tsx`
- Create: `src/components/chat/ChatPromptInputQuickRepliesButton.tsx`
- Create: `src/components/ChatPromptInputFeatureFlag.test.ts`
- Modify: `src/components/ChatPromptInput.tsx`

**Interfaces:**
- Consumes: `useShowSavedReplies()` and `isProductFeatureEnabled`.
- Produces: `ChatPromptInputAttachments`, `ChatPromptInputAttachButton`, and `ChatPromptInputQuickRepliesButton`.
- Preserves: `autoResizeTextarea(element)` behavior through a callback prop named `resizeTextarea`.

- [ ] **Step 1: Write the failing composer contract**

Create `src/components/ChatPromptInputFeatureFlag.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(
  new URL('./ChatPromptInput.tsx', import.meta.url),
  'utf8',
);

describe('Quick Replies composer feature flag', () => {
  test('mounts the picker only when saved replies are enabled', () => {
    expect(source).toContain('useShowSavedReplies()');
    expect(source).toContain('isProductFeatureEnabled(savedRepliesState)');
    expect(source).toMatch(
      /showSavedReplies\s*&&\s*\(\s*<ChatPromptInputQuickRepliesButton/,
    );
  });

  test('keeps the prompt input module below the file-size limit', () => {
    expect(source.split('\n').length).toBeLessThanOrEqual(300);
  });
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ChatPromptInputFeatureFlag.test.ts
```

Expected: FAIL because the picker is unconditional and `ChatPromptInput.tsx` exceeds 300 lines.

- [ ] **Step 3: Extract attachment controls**

Create `src/components/chat/ChatPromptInputAttachments.tsx`:

```tsx
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';
import {
  PromptInputButton,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  useMediaAttachmentUploads,
  type MediaUploadStatus,
} from '@/hooks/useMediaAttachmentUploads';
import { Spinner } from '@/components/ui/spinner';
import { memo, useCallback } from 'react';
import { PlusIcon } from 'lucide-react';

type AttachmentFile = ReturnType<
  typeof usePromptInputAttachments
>['files'][number];

const ChatAttachmentItem = memo(
  ({
    attachment,
    onRemove,
    uploadStatus,
    previewUrl,
  }: {
    attachment: AttachmentFile;
    onRemove: (id: string) => void;
    uploadStatus?: MediaUploadStatus;
    previewUrl?: string;
  }) => {
    const handleRemove = useCallback(
      () => onRemove(attachment.id),
      [onRemove, attachment.id],
    );
    const isUploading =
      uploadStatus === 'queued' || uploadStatus === 'uploading';
    const displayData =
      previewUrl && attachment.type === 'file'
        ? { ...attachment, url: previewUrl }
        : attachment;

    return (
      <Attachment
        className="relative size-24 overflow-hidden rounded-lg"
        data={displayData}
        onRemove={handleRemove}
      >
        <AttachmentPreview />
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : null}
        <AttachmentRemove className="top-1.5 right-1.5 size-7 [&>svg]:size-4" />
      </Attachment>
    );
  },
);

ChatAttachmentItem.displayName = 'ChatAttachmentItem';

function ChatPromptInputAttachmentsPlain() {
  const attachments = usePromptInputAttachments();
  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) return null;

  return (
    <Attachments className="ml-0 w-full justify-start px-4 pt-4" variant="grid">
      {attachments.files.map((attachment) => (
        <ChatAttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
}

function ChatPromptInputAttachmentsWithUpload() {
  const attachments = usePromptInputAttachments();
  const uploadState = useMediaAttachmentUploads();
  const handleRemove = useCallback(
    (id: string) => void uploadState.handleRemove(id),
    [uploadState],
  );

  if (attachments.files.length === 0) return null;

  return (
    <Attachments className="ml-0 w-full justify-start px-4 pt-4" variant="grid">
      {attachments.files.map((attachment) => (
        <ChatAttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
          previewUrl={uploadState.getPreviewUrl(attachment.id, attachment.url)}
          uploadStatus={uploadState.statusByClientId.get(attachment.id)}
        />
      ))}
    </Attachments>
  );
}

export function ChatPromptInputAttachments({
  enableMediaUpload,
}: {
  enableMediaUpload?: boolean;
}) {
  if (enableMediaUpload) {
    return <ChatPromptInputAttachmentsWithUpload />;
  }
  return <ChatPromptInputAttachmentsPlain />;
}

export function ChatPromptInputAttachButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      disabled={disabled}
      onClick={() => attachments.openFileDialog()}
      tooltip={{ content: 'Attach image' }}
      type="button"
      size="icon-sm"
      className="flex size-8 items-center justify-center rounded-lg border border-border/40 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
    >
      <PlusIcon className="size-4" />
    </PromptInputButton>
  );
}
```

- [ ] **Step 4: Extract the Quick Replies picker**

Create `src/components/chat/ChatPromptInputQuickRepliesButton.tsx`:

```tsx
import { useState, type RefObject } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ReplyAll,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import {
  useOptionalPromptInputController,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

export type ChatPromptInputQuickRepliesButtonProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  resizeTextarea: (element: HTMLTextAreaElement) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function ChatPromptInputQuickRepliesButton({
  disabled,
  onChange,
  resizeTextarea,
  textareaRef,
}: ChatPromptInputQuickRepliesButtonProps) {
  const { agentId } = useParams();
  const quickRepliesList = useQuery(api.quickReplies.list);
  const attachments = usePromptInputAttachments();
  const controller = useOptionalPromptInputController();
  const [open, setOpen] = useState(false);

  const handleSelectQuickReply = (reply: Doc<'quickReplies'>) => {
    attachments.clear();

    if (textareaRef.current) {
      textareaRef.current.value = reply.text;
      resizeTextarea(textareaRef.current);
      textareaRef.current.focus();
    }

    controller?.textInput.setInput(reply.text);
    onChange(reply.text);
    setOpen(false);

    reply.imageUrls?.forEach((url, index) => {
      attachments.addUrl(
        url,
        `quick_reply_image_${index + 1}.png`,
        'image/png',
      );
    });
  };

  if (quickRepliesList === undefined) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          variant="ghost"
          size="sm"
          className="flex h-8 items-center gap-1.5 border-none bg-transparent px-2 text-muted-foreground shadow-none hover:bg-muted/50 hover:text-foreground"
        >
          <ReplyAll className="size-3.5" />
          <span className="text-xs font-semibold">Quick replies</span>
          {open ? (
            <ChevronDown className="ml-0.5 size-3.5 opacity-60" />
          ) : (
            <ChevronUp className="ml-0.5 size-3.5 opacity-60" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 flex w-80 flex-col gap-1.5 rounded-xl border border-border bg-popover px-2 py-0 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border/40 px-1 pb-1 pt-2">
          <span className="text-xs font-medium text-muted-foreground">
            Quick replies
          </span>
          <Link
            to={`/dashboard/${agentId}/quick-replies`}
            onClick={() => setOpen(false)}
            className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-500"
          >
            Edit
          </Link>
        </div>
        <div className="no-scrollbar flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {quickRepliesList.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs font-medium text-muted-foreground">
              No quick replies set yet.
            </div>
          ) : (
            quickRepliesList.map((reply, index) => (
              <div key={reply._id} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectQuickReply(reply)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-muted/60 focus:outline-none active:scale-[0.99]"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {reply.title}
                    </span>
                    <span className="mt-0.5 flex w-full items-center gap-1.5 truncate text-[11px] leading-relaxed text-muted-foreground">
                      {reply.imageUrls && reply.imageUrls.length > 0 ? (
                        <ImageIcon className="size-3 shrink-0 text-muted-foreground/80" />
                      ) : null}
                      <span className="flex-1 truncate">{reply.text}</span>
                    </span>
                  </div>
                  {reply.imageUrls && reply.imageUrls.length > 0 ? (
                    <div className="relative flex shrink-0 items-center justify-center">
                      <AvatarGroup className="-space-x-1.5">
                        {reply.imageUrls.map((url, imageIndex) => (
                          <Avatar
                            key={`${url}-${imageIndex}`}
                            size="sm"
                            className="size-6 border border-background"
                          >
                            <AvatarImage src={url} alt="" />
                            <AvatarFallback className="bg-muted text-[8px] font-semibold">
                              QR
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    </div>
                  ) : null}
                </button>
                {index < quickRepliesList.length - 1 ? (
                  <Separator className="my-0.5 shrink-0 bg-border/30" />
                ) : null}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 5: Gate the extracted picker in `ChatPromptInput`**

Remove the moved imports and private components from `src/components/ChatPromptInput.tsx`. Add:

```ts
import {
  ChatPromptInputAttachButton,
  ChatPromptInputAttachments,
} from '@/components/chat/ChatPromptInputAttachments';
import { ChatPromptInputQuickRepliesButton } from '@/components/chat/ChatPromptInputQuickRepliesButton';
import {
  isProductFeatureEnabled,
  useShowSavedReplies,
} from '@/lib/posthogFeatureFlags';
```

Remove the three existing JSDoc comments around `ChatPromptInputShell`, the attachment props, and the prompt layout while leaving their declarations unchanged.

Inside `ChatPromptInput`, after `useUploads`, add:

```ts
const savedRepliesState = useShowSavedReplies();
const showSavedReplies = isProductFeatureEnabled(savedRepliesState);
```

Replace the picker render with:

```tsx
{showSavedReplies && (
  <ChatPromptInputQuickRepliesButton
    disabled={disabled}
    onChange={onChange}
    resizeTextarea={autoResizeTextarea}
    textareaRef={internalTextareaRef}
  />
)}
```

- [ ] **Step 6: Run focused tests and file-size checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/components/ChatPromptInputFeatureFlag.test.ts src/pages/ChatsPageHeaderActions.test.ts && wc -l src/components/ChatPromptInput.tsx src/components/chat/ChatPromptInputAttachments.tsx src/components/chat/ChatPromptInputQuickRepliesButton.tsx
```

Expected: focused tests PASS and all three code files report fewer than 300 lines.

- [ ] **Step 7: Commit the composer gate**

```bash
git add src/components/ChatPromptInput.tsx src/components/ChatPromptInputFeatureFlag.test.ts src/components/chat/ChatPromptInputAttachments.tsx src/components/chat/ChatPromptInputQuickRepliesButton.tsx
git commit -m "Gate Inbox Quick Replies with PostHog"
```

---

### Task 5: Protect the direct Quick Replies route

**Files:**
- Create: `src/components/AppRuntimeEffects.tsx`
- Create: `src/router/QuickRepliesFeatureRoute.tsx`
- Create: `src/router/QuickRepliesFeatureRoute.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `useShowSavedReplies(): boolean | undefined`.
- Produces: `QuickRepliesFeatureRoute`, `ScrollToTop`, and `PostHogIdentifier`.
- Route behavior: unresolved renders a spinner, enabled renders `QuickRepliesPage`, disabled redirects with `replace` to `/dashboard/:agentId/inbox`.

- [ ] **Step 1: Write the failing route contract**

Create `src/router/QuickRepliesFeatureRoute.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const routeSource = readFileSync(
  new URL('./QuickRepliesFeatureRoute.tsx', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');

describe('Quick Replies direct route feature flag', () => {
  test('waits, renders, or redirects from the tri-state flag', () => {
    expect(routeSource).toContain('savedRepliesState === undefined');
    expect(routeSource).toContain('return <QuickRepliesPage />');
    expect(routeSource).toContain(
      'to={`/dashboard/${agentId}/inbox`}',
    );
    expect(routeSource).toContain('replace');
  });

  test('routes Quick Replies through the feature gate', () => {
    expect(mainSource).toContain(
      'path="quick-replies" element={<QuickRepliesFeatureRoute />}',
    );
    expect(mainSource).not.toContain(
      'path="quick-replies" element={<QuickRepliesPage />}',
    );
  });

  test('keeps the application entrypoint below the file-size limit', () => {
    expect(mainSource.split('\n').length).toBeLessThanOrEqual(300);
  });
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/router/QuickRepliesFeatureRoute.test.ts
```

Expected: FAIL because the route module does not exist and `main.tsx` mounts `QuickRepliesPage` directly.

- [ ] **Step 3: Add the loading-aware route gate**

Create `src/router/QuickRepliesFeatureRoute.tsx`:

```tsx
import { Navigate, useParams } from 'react-router';
import { Spinner } from '@/components/ui/spinner';
import {
  isProductFeatureEnabled,
  useShowSavedReplies,
} from '@/lib/posthogFeatureFlags';
import QuickRepliesPage from '@/pages/QuickRepliesPage';

export function QuickRepliesFeatureRoute() {
  const { agentId } = useParams();
  const savedRepliesState = useShowSavedReplies();

  if (savedRepliesState === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isProductFeatureEnabled(savedRepliesState)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
  }

  return <QuickRepliesPage />;
}
```

- [ ] **Step 4: Extract runtime effects so `main.tsx` stays modular**

Create `src/components/AppRuntimeEffects.tsx`:

```tsx
import { useEffect } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import posthog from 'posthog-js';
import { useLocation } from 'react-router';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function PostHogIdentifier() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    posthog.identify(user.id, {
      email: user.email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    });
  }, [user]);

  return null;
}
```

In `src/main.tsx`, import:

```ts
import {
  PostHogIdentifier,
  ScrollToTop,
} from '@/components/AppRuntimeEffects';
import { QuickRepliesFeatureRoute } from '@/router/QuickRepliesFeatureRoute';
```

Remove the local `ScrollToTop` and `PostHogIdentifier` functions, remove `useLocation` from the React Router import, remove the direct `QuickRepliesPage` import, and retain `useEffect` for `LoginRoute`.

Remove the existing WorkOS sign-in comment above `LoginRoute`; the function name and implementation are self-explanatory.

- [ ] **Step 5: Route through the gate**

Replace:

```tsx
<Route path="quick-replies" element={<QuickRepliesPage />} />
```

with:

```tsx
<Route path="quick-replies" element={<QuickRepliesFeatureRoute />} />
```

- [ ] **Step 6: Run focused tests and file-size checks**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/router/QuickRepliesFeatureRoute.test.ts src/pages/LandingPage.test.ts && wc -l src/main.tsx src/components/AppRuntimeEffects.tsx src/router/QuickRepliesFeatureRoute.tsx
```

Expected: focused tests PASS and all three code files report fewer than 300 lines.

- [ ] **Step 7: Commit the direct-route gate**

```bash
git add src/main.tsx src/components/AppRuntimeEffects.tsx src/router/QuickRepliesFeatureRoute.tsx src/router/QuickRepliesFeatureRoute.test.ts
git commit -m "Protect Quick Replies route with PostHog"
```

---

### Task 6: Verify the complete feature and update continuity

**Files:**
- Modify: `CONTINUITY.md`

**Interfaces:**
- Consumes: all feature gates from Tasks 1–5.
- Produces: final verification receipts and an implementation-complete continuity snapshot.

- [ ] **Step 1: Run every focused feature-flag test**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run src/lib/posthogFeatureFlags.test.ts src/components/landing/LandingStatsFeatureFlag.test.ts src/components/AppSidebarFeatureFlag.test.ts src/components/ChatPromptInputFeatureFlag.test.ts src/router/QuickRepliesFeatureRoute.test.ts
```

Expected: 5 files and 13 tests PASS.

- [ ] **Step 2: Run targeted lint**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx eslint src/lib/posthogFeatureFlags.ts src/lib/posthogFeatureFlags.test.ts src/components/landing/LandingStatsSection.tsx src/components/landing/LandingStatsFeatureFlag.test.ts src/components/app-sidebar.tsx src/components/app-sidebar-nav.ts src/components/AppSidebarFeatureFlag.test.ts src/components/ChatPromptInput.tsx src/components/ChatPromptInputFeatureFlag.test.ts src/components/chat/ChatPromptInputAttachments.tsx src/components/chat/ChatPromptInputQuickRepliesButton.tsx src/components/AppRuntimeEffects.tsx src/router/QuickRepliesFeatureRoute.tsx src/router/QuickRepliesFeatureRoute.test.ts src/main.tsx
```

Expected: exit code 0 with no warnings or errors.

- [ ] **Step 3: Run the application test suite**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bunx vitest run
```

Expected: all app test files PASS.

- [ ] **Step 4: Run the production build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 && bun run build
```

Expected: TypeScript and Vite build PASS; only the repository’s existing chunk-size warning is acceptable.

- [ ] **Step 5: Verify formatting, exact keys, and file-size limits**

Run:

```bash
git diff --check
rg -n "show-token-usage|show-saved-replies" src
wc -l src/lib/posthogFeatureFlags.ts src/components/landing/LandingStatsSection.tsx src/components/app-sidebar.tsx src/components/app-sidebar-nav.ts src/components/ChatPromptInput.tsx src/components/chat/ChatPromptInputAttachments.tsx src/components/chat/ChatPromptInputQuickRepliesButton.tsx src/components/AppRuntimeEffects.tsx src/router/QuickRepliesFeatureRoute.tsx src/main.tsx
```

Expected: no whitespace errors; the two raw flag strings appear only in `src/lib/posthogFeatureFlags.ts` and its test; every listed code file has fewer than 300 lines.

- [ ] **Step 6: Update `CONTINUITY.md`**

Record:

- both flags and all gated surfaces;
- unresolved/loading behavior;
- skipped Convex queries;
- verification commands and results;
- the complete working set;
- any build warning without copying raw logs.

- [ ] **Step 7: Commit verification and continuity**

```bash
git add CONTINUITY.md
git commit -m "Document PostHog feature flag verification"
```
