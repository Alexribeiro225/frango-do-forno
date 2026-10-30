import { useEffect, useState } from "react";
import { KeyRound, Lock, LogIn, RefreshCw, Unlock, CalendarClock, Trash2, Store } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { accessToken, enterAsUser, listManagedUsers, setMainStore, trialDaysLeft, updateManagedUser, type ManagedUser } from "@/lib/cms";
import { adminDeleteUser, adminImpersonate, adminSetPassword } from "@/lib/users.functions";

const statusLabel: Record<string, string> = { trial: "Teste grátis", active: "Assinante", pending: "Pendente", past_due: "Pagamento atrasado", canceled: "Cancelado", refunded: "Reembolsado", chargeback: "Contestado" };

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const deleteUser = useServerFn(adminDeleteUser);
  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    await run(target.user_id, async () => {
      await deleteUser({ data: { userId: target.user_id } });
      setDeleting(null);
    }, "Usuário excluído. O acesso foi removido.");
  }
  const msg = (e: unknown) => (e instanceof Error ? e.message : "Ocorreu um erro.");
  async function load() { try { setUsers(await listManagedUsers()); } catch (e) { setError(msg(e)); } }
  useEffect(() => { load(); }, []);

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id); setError(""); setNotice("");
    try { await fn(); setNotice(ok); await load(); } catch (e) { setError(msg(e)); } finally { setBusy(null); }
  }
  function changeTrial(u: ManagedUser) {
    const value = window.prompt(`Quantos dias de teste a partir de hoje para ${u.customer_email}?`, "15");
    if (value === null) return;
    const days = Number(value);
    if (!Number.isFinite(days) || days < 0) { setError("Informe um número de dias válido."); return; }
    const end = new Date(Date.now() + days * 86_400_000).toISOString();
    run(u.user_id, () => updateManagedUser(u.user_id, { status: "trial", trial_ends_at: end }), `Teste ajustado para ${days} dia(s).`);
  }
  function changePassword(u: ManagedUser) {
    const password = window.prompt(`Nova senha para ${u.customer_email} (mínimo 8 caracteres):`);
    if (!password) return;
    run(u.user_id, async () => adminSetPassword({ data: { token: await accessToken(), userId: u.user_id, password } }), "Senha alterada.");
  }
  function toggleBlock(u: ManagedUser) {
    run(u.user_id, () => updateManagedUser(u.user_id, { is_blocked: !u.is_blocked }), u.is_blocked ? "Acesso desbloqueado." : "Acesso bloqueado.");
  }
  async function enter(u: ManagedUser) {
    if (!window.confirm(`Entrar no sistema como ${u.customer_email}?`)) return;
    setBusy(u.user_id); setError("");
    try {
      const { tokenHash } = await adminImpersonate({ data: { token: await accessToken(), email: u.customer_email } });
      await enterAsUser(tokenHash);
      window.location.href = "/admin";
    } catch (e) { setError(msg(e)); setBusy(null); }
  }

  return <section className="saas-dashboard">
    <div className="saas-page-heading"><div><span className="admin-eyebrow">ADMIN MASTER</span><h1>Usuários</h1><p>Gerencie o teste grátis, senha e acesso de cada loja.</p></div><button className="saas-range-pill" onClick={load}><RefreshCw size={16}/> Atualizar</button></div>
    {error && <div className="admin-error" role="alert">{error}</div>}{notice && <div className="admin-notice" role="status">{notice}</div>}
    <section className="saas-panel">
      {users.length ? users.map(u => <article className="admin-user-row" key={u.user_id}>
        <div><b>{u.customer_email}</b><small>{u.is_blocked ? "Bloqueado" : statusLabel[u.status] || u.status}{u.status === "trial" && !u.is_blocked ? ` · ${trialDaysLeft(u.trial_ends_at)} dia(s) restantes` : ""}{u.is_main_store ? " · Loja do site principal" : ""}</small></div>
        <div className="admin-user-actions">
          <Button variant="outline" size="sm" disabled={busy !== null || u.is_main_store} onClick={() => { if (window.confirm(`Direcionar o site principal para a loja de ${u.customer_email}?`)) void run(u.user_id, () => setMainStore(u.user_id), "Site principal vinculado à loja selecionada."); }}><Store size={15}/>{u.is_main_store ? "Site vinculado" : "Vincular site principal"}</Button>
          <button disabled={busy === u.user_id} onClick={() => changeTrial(u)}><CalendarClock size={15}/> Período de teste</button>
          <button disabled={busy === u.user_id} onClick={() => changePassword(u)}><KeyRound size={15}/> Senha</button>
          <button disabled={busy === u.user_id} onClick={() => enter(u)}><LogIn size={15}/> Entrar</button>
          <button disabled={busy === u.user_id} className={u.is_blocked ? "" : "danger"} onClick={() => toggleBlock(u)}>{u.is_blocked ? <><Unlock size={15}/> Desbloquear</> : <><Lock size={15}/> Bloquear</>}</button>
          <Button variant="destructive" size="sm" disabled={busy !== null} onClick={() => { setError(""); setDeleting(u); }}><Trash2 size={15}/> Excluir usuário</Button>
        </div>
      </article>) : <p className="saas-chart-empty">Nenhum usuário cadastrado ainda.</p>}
    </section>
    <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
      <AlertDialogContent className="max-w-lg w-[calc(100%-2rem)]">
        <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
        <AlertDialogDescription>Excluir a conta {deleting?.customer_email} e remover seu acesso permanentemente? Esta ação não pode ser desfeita. Os registros da loja serão preservados.</AlertDialogDescription>
        {error && <p className="text-destructive" role="alert">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy !== null}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={busy !== null} onClick={() => void confirmDelete()}><Trash2/>{busy ? "Excluindo…" : "Excluir permanentemente"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
