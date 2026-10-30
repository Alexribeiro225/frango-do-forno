import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ChefHat, LogOut } from "lucide-react";
import { configured, currentUser, signIn, signOut } from "@/lib/cms";
import { KitchenBoard } from "@/components/KitchenBoard";

export const Route = createFileRoute("/cozinha")({ component: Kitchen });
const logoImg = "/images/frango-show-logo.webp";

function Kitchen() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof currentUser>>>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { currentUser().then(setUser).finally(() => setChecked(true)); }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { setUser(await signIn(email, password)); setPassword(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  if (!checked) return <main className="kitchen-page"><p>Verificando acesso…</p></main>;
  if (!user) return <main className="kitchen-page kitchen-login-wrap">
    <form className="kitchen-login" onSubmit={login}>
      <ChefHat size={34} />
      <h1>Cozinha</h1>
      <p>Entre com o login da loja ou do admin master para acessar os pedidos.</p>
      {!configured && <p className="kitchen-error">O banco ainda não está configurado neste site.</p>}
      <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
      <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p className="kitchen-error" role="alert">{error}</p>}
      <button className="kitchen-primary" disabled={busy || !configured}>{busy ? "Entrando…" : "Entrar"}</button>
    </form>
  </main>;

  if (user.role === "owner" && !user.hasAccess) return <main className="kitchen-page kitchen-login-wrap"><section className="kitchen-login"><h1>Assinatura não ativa</h1><p>O acesso à cozinha será liberado após a confirmação do pagamento.</p><Link to="/planos">Ver planos</Link><button onClick={()=>{signOut();setUser(null);}}>Sair</button></section></main>;

  return <main className="kitchen-page">
    <header className="kitchen-header">
      <div><img src={logoImg} alt="" className="brand-logo kitchen-logo" /><div><h1>Painel da cozinha</h1><p>Pedidos recebidos pelo site · Atualiza a cada 10 segundos</p></div></div>
      <div className="kitchen-header-actions"><button onClick={() => { signOut(); setUser(null); }}><LogOut size={17} /> Sair</button></div>
    </header>
    <KitchenBoard />
  </main>;
}
