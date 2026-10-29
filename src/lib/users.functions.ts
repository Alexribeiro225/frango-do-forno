import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertDeletableUser } from "@/lib/user-deletion";

const MASTER = "conectstore.app@gmail.com";

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId)) throw new Error("Usuário inválido.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: verified, error: authError } = await context.supabase.auth.getUser();
    const { data: master, error: roleError } = await context.supabase.rpc("is_superadmin");
    if (authError || !verified.user || roleError || !master) throw new Error("Acesso negado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (targetError || !target.user) throw new Error("Usuário não encontrado.");
    assertDeletableUser(context.userId, target.user);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível excluir o usuário. Tente novamente.");
    return { ok: true };
  });

async function requireMaster(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || data.user?.email?.toLowerCase() !== MASTER) throw new Error("Acesso negado.");
  return supabaseAdmin;
}

export const adminSetPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; userId: string; password: string }) => {
    if (!input.password || input.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
    return input;
  })
  .handler(async ({ data }) => {
    const admin = await requireMaster(data.token);
    const { error } = await admin.auth.admin.updateUserById(data.userId, { password: data.password, email_confirm: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminImpersonate = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; email: string }) => input)
  .handler(async ({ data }) => {
    const admin = await requireMaster(data.token);
    if (data.email.toLowerCase() === MASTER) throw new Error("Escolha a conta de um cliente.");
    const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    if (error || !link.properties?.hashed_token) throw new Error(error?.message || "Não foi possível gerar o acesso.");
    return { tokenHash: link.properties.hashed_token };
  });
