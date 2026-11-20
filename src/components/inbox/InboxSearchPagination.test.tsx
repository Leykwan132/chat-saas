import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { InboxSearchResults } from "./InboxSearchResults";
import { InboxConversationList } from "./InboxConversationList";

test("filtered-out search pages retain chat and message pagination", () => {
  const markup = renderToStaticMarkup(
    <InboxSearchResults
      searchQuery="hello"
      chats={[]}
      messages={[]}
      chatStatus="CanLoadMore"
      messageStatus="CanLoadMore"
      onLoadMoreChats={vi.fn()}
      onLoadMore={vi.fn()}
      onSelect={vi.fn()}
    />,
  );
  expect(markup).toContain("Load more chats");
  expect(markup).toContain("Load more messages");
  expect(markup).not.toContain("No search results");
});

test("an empty filtered inbox still allows loading older conversations", () => {
  const markup = renderToStaticMarkup(
    <InboxConversationList
      searchQuery=""
      onSearchQueryChange={vi.fn()}
      conversationSort="newest"
      onConversationSortChange={vi.fn()}
      loading={false}
      filteredChats={[]}
      pinnedChats={[]}
      unpinnedChats={[]}
      totalConversationCount={100}
      selectedConversationId={null}
      onSelectConversation={vi.fn()}
      onTogglePin={vi.fn()}
      canLoadMore
      isLoadingMore={false}
      onLoadMore={vi.fn()}
    />,
  );
  expect(markup).toContain("Load more conversations");
});
