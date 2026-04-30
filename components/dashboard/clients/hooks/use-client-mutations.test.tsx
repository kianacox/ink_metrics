import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
} from "./use-client-mutations";
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

describe("useCreateClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("posts to /api/clients and returns success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: { id: "abc" } });
    const onSuccess = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() => useCreateClient({ onSuccess, onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: "Alice", contactInfo: "" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/clients",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Alice", contactInfo: "" }),
      }),
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError with the API error message", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Conflict." } });
    const onSuccess = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() => useCreateClient({ onSuccess, onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: "Alice", contactInfo: "" });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    const err = onError.mock.calls[0][0] as Error;
    expect(err.message).toBe("Conflict.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("falls back to default error message when API does not provide one", async () => {
    global.fetch = makeFetchMock({ ok: false, body: {} });
    const onError = jest.fn();

    const { result } = renderHook(() => useCreateClient({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: "Alice", contactInfo: "" });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    const err = onError.mock.calls[0][0] as Error;
    expect(err.message).toBe("Could not create client.");
  });

  it("invalidates ['clients'] query on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useCreateClient({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ name: "Alice", contactInfo: "" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clients"] });
    });
  });

  it("isPending is true while in flight", async () => {
    let resolveFetch!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = jest.fn().mockReturnValue(pending);

    const { result } = renderHook(() => useCreateClient({}), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: "Alice", contactInfo: "" });
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

describe("useUpdateClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("patches /api/clients/:id and returns success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useUpdateClient({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "client-1", name: "Updated", contactInfo: "x" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/clients/client-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Updated", contactInfo: "x" }),
      }),
    );
  });

  it("calls onError with API error", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Validation." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useUpdateClient({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "client-1", name: "Updated", contactInfo: "" });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Validation.");
  });

  it("invalidates ['clients'] query on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useUpdateClient({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: "client-1", name: "x", contactInfo: "" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clients"] });
    });
  });
});

describe("useDeleteClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("deletes via /api/clients/:id and returns success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteClient({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "client-1" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/clients/client-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("calls onError with API error", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Forbidden." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useDeleteClient({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "client-1" });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Forbidden.");
  });

  it("invalidates ['clients'] query on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useDeleteClient({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: "client-1" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["clients"] });
    });
  });
});
