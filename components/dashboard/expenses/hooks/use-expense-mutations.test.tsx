import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from "./use-expense-mutations";
import { createWrapper } from "@/lib/test-utils/query-wrapper";
import { ExpenseCategory } from "@/lib/expenses/models";

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
  item: "Ink",
  category: ExpenseCategory.ink,
  amountMinor: 1250,
  currencyCode: "USD",
  datePurchased: "2026-04-01",
};

describe("useCreateExpense", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("posts to /api/expenses and returns response body", async () => {
    global.fetch = makeFetchMock({ ok: true, body: { expenseId: "exp-1" } });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useCreateExpense({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/expenses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(CREATE_PAYLOAD),
      }),
    );
    // Returned data exposed as first arg of onSuccess
    expect(onSuccess.mock.calls[0][0]).toEqual({ expenseId: "exp-1" });
  });

  it("calls onError with the API error message", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Bad request." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useCreateExpense({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Bad request.");
  });

  it("invalidates ['expenses'] and ['analytics'] on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: { expenseId: "exp-1" } });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useCreateExpense({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["expenses"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });

  it("isPending is true while in flight", async () => {
    let resolveFetch!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = jest.fn().mockReturnValue(pending);

    const { result } = renderHook(() => useCreateExpense({}), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(CREATE_PAYLOAD);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    act(() => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ expenseId: "exp-1" }) });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});

describe("useUpdateExpense", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("patches /api/expenses/:id with payload", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useUpdateExpense({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "exp-1", ...CREATE_PAYLOAD });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/expenses/exp-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(CREATE_PAYLOAD),
      }),
    );
  });

  it("calls onError with API message", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Nope." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useUpdateExpense({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "exp-1", ...CREATE_PAYLOAD });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Nope.");
  });

  it("invalidates ['expenses'] and ['analytics'] on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useUpdateExpense({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: "exp-1", ...CREATE_PAYLOAD });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["expenses"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });
});

describe("useDeleteExpense", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("deletes via /api/expenses/:id", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteExpense({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "exp-1" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/expenses/exp-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("calls onError with API message", async () => {
    global.fetch = makeFetchMock({ ok: false, body: { error: "Forbidden." } });
    const onError = jest.fn();

    const { result } = renderHook(() => useDeleteExpense({ onError }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: "exp-1" });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect((onError.mock.calls[0][0] as Error).message).toBe("Forbidden.");
  });

  it("invalidates ['expenses'] and ['analytics'] on success", async () => {
    global.fetch = makeFetchMock({ ok: true, body: {} });
    const { Wrapper, invalidateSpy } = createInvalidationWrapper();

    const { result } = renderHook(() => useDeleteExpense({}), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: "exp-1" });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["expenses"] });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });
});
