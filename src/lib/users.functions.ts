import { createServerFn } from "@tanstack/react-start";

const MASTER = "conectstore.app@gmail.com";

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
