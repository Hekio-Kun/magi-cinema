import { useCallback, useEffect, useRef } from "react";

/** Chỉ cho phép yêu cầu mới nhất cập nhật trạng thái; vô hiệu hóa khi rời trang. */
export function useLatestRequest() {
  const sequence = useRef(0);
  const invalidateRequests = useCallback(() => { sequence.current += 1; }, []);
  const startRequest = useCallback(() => {
    const requestId = ++sequence.current;
    return () => requestId === sequence.current;
  }, []);

  useEffect(() => invalidateRequests, [invalidateRequests]);
  return { startRequest, invalidateRequests };
}
