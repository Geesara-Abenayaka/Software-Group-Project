// Reads a JSON API response, or throws an Error with the server's message (or the fallback).
// A failed fetch (server down, offline) throws a TypeError, which callers can word as "Couldn't reach the server."
export const readJson = async (response, fallbackMessage) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(body.message || fallbackMessage);
  }
  return body;
};

export const errorMessage = (error, fallbackMessage) => (
  error instanceof TypeError ? "Couldn't reach the server." : error.message || fallbackMessage
);
