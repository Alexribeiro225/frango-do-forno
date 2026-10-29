import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(), deleteUser: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = { middleware: () => chain, inputValidator: () => chain, handler: (handler: unknown) => handler };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { auth: { admin: mocks } } }));
import { adminDeleteUser } from "@/lib/users.functions";

const targetId = "00000000-0000-4000-8000-000000000001";
const context = (master: boolean) => ({
  userId: "master",
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "master" } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: master, error: null }),
  },
});
// The builder mock exposes the handler to test its authorization before privileged work.
const invoke = adminDeleteUser as unknown as (args: { data: { userId: string }; context: ReturnType<typeof context> }) => Promise<{ ok: boolean }>;

describe("Admin deletion authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserById.mockResolvedValue({ data: { user: { id: targetId, email: "client@example.com" } }, error: null });
    mocks.deleteUser.mockResolvedValue({ error: null });
  });
  it("rejects a customer before accessing privileged account data", async () => {
    await expect(invoke({ data: { userId: targetId }, context: context(false) })).rejects.toThrow("Acesso negado.");
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("deletes only the selected customer after master verification", async () => {
    await expect(invoke({ data: { userId: targetId }, context: context(true) })).resolves.toEqual({ ok: true });
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(targetId);
  });
});