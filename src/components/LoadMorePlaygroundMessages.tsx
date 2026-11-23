import { useEffect, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

export function LoadMoreMessagesOnScroll({
  loadMore,
  status,
}: {
  loadMore: (numItems: number) => void;
  status: string;
}) {
  const { scrollRef } = useStickToBottomContext();
  const loadMoreRef = useRef(loadMore);
  const statusRef = useRef(status);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    statusRef.current = status;
    if (status !== "LoadingMore") {
      loadingMoreRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const requestOlderMessages = () => {
      if (
        scrollElement.scrollTop <= 80 &&
        statusRef.current === "CanLoadMore" &&
        !loadingMoreRef.current
      ) {
        loadingMoreRef.current = true;
        loadMoreRef.current(20);
      }
    };

    const handleScroll = () => requestOlderMessages();
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) requestOlderMessages();
    };

    scrollElement.addEventListener("scroll", handleScroll);
    scrollElement.addEventListener("wheel", handleWheel);
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      scrollElement.removeEventListener("wheel", handleWheel);
    };
  }, [scrollRef]);

  return null;
}
