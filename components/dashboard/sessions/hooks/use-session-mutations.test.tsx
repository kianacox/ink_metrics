import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCreateSession,
  useDeleteSession,
  useUpdateSession,
} from "./use-session-mutations";
import { createWrapper } from "@/lib/test-utils/query-wrapper";

function makeFetchMock(response: { ok: boolean; body: unknown }) {
  return jest.fn().mockResolvedValue({
    ok: response.ok,
    json: () => Promise.resolve(response.body),
  });
}

function createInvalidationWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, invalidateSpy };
}

const CREATE_PAYLOAD = {
  selectedClientId: "client-1",
  createNewClient: false,
  clientName: "Alice",
  clientContact: "",
  priceMinor: 12000,
  sessionDate: "2026-04-01",
  throughAds: null,
  inProgress: false,
};

const UPDATE_PAYLOAD = {
  priceMinor: 12000,
  sessionDate: "2026-04-01",
  inProgress: false,
};

describe("useCreateSession", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("posts to /api/sessions and exposes response data", async () => {
    global.fetch = makeFetchMock({ ok: true, body: { client: null } });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useCreateSession({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(CREATE_PAYLOAD),
      }),
    );
  });

  it("calls onError with API error message", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Conflict." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useCreateSession({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Conflict.");
  });

  it("invalidates ['sessions'] and ['analytics'] on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useCreateSession({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });

  it("isPending is true while in flight", async () => {
    let resolveFetch!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = jest.fn().mockReturnValue(pending);

    const { result } = renderHook(() => useCreateSession({}), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    act(() => {
      resolveFetch({ ok: true, json: () => Promise.resolve({}) });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});

describe("useUpdateSession", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("patches /api/sessions/:id with payload", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useUpdateSession({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "sess-1", ...UPDATE_PAYLOAD });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/sessions/sess-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(UPDATE_PAYLOAD),
      }),
    );
  });

  it("calls onError with API error", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Validation." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useUpdateSession({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "sess-1", ...UPDATE_PAYLOAD });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Validation.");
  });

  it("invalidates ['sessions'] and ['analytics'] on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useUpdateSession({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: "sess-1", ...UPDATE_PAYLOAD });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });
});

describe("useDeleteSession", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("deletes via /api/sessions/:id", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteSession({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "sess-1" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/sessions/sess-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("calls onError with API error", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Forbidden." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useDeleteSession({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "sess-1" });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Forbidden.");
  });

  it("invalidates ['sessions'] and ['analytics'] on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useDeleteSession({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: "sess-1" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sessions"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });
});
