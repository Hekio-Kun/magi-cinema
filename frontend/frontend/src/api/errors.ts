type ApiErrorLike = {
  message?: unknown;
  response?: {
    data?: {
      message?: unknown;
    };
  };
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const message = value.trim();
  const genericMessages = new Set(["uncategorized", "internal server error"]);
  return genericMessages.has(message.toLowerCase()) ? null : message;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = (error ?? {}) as ApiErrorLike;
  return (
    asNonEmptyString(apiError.response?.data?.message)
    ?? asNonEmptyString(apiError.message)
    ?? fallback
  );
}

export function getApiErrorMessages(error: unknown, fallback: string): string[] {
  return getApiErrorMessage(error, fallback)
    .split(/;\s*/)
    .map((message) => message.trim())
    .filter(Boolean);
}
