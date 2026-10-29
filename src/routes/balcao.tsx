import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { configured, currentUser, signIn, signOut } from "@/lib/cms";
import { CounterBoard } from "@/components/CounterBoard";

export const Route = createFileRoute("/balcao")({ component: Counter });
const logoImg = "/images/frango-show-logo.webp";

function Counter() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof currentUser>>>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { currentUser().then(setUser).finally(() => setChecked(true)); }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { setUser(await signIn(email, password)); setPassword(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  if (!checked) return <main className="counter-page">Verificando acesso…</main>;
  if (!user) return <main className="counter-page counter-login-wrap"><form className="counter-login" onSubmit={login}>
    <span className="counter-kicker">FRANGO SHOW · CAIXA</span><h1>Venda no balcão</h1><p>Acesse com o login da loja ou do admin master.</p>
    {!configured && <p className="counter-error">Banco de dados não configurado.</p>}
    <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
    <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
    {error && <p className="counter-error" role="alert">{error}</p>}
    <button className="counter-primary" disabled={busy || !configured}>{busy ? "Entrando…" : "Entrar"}</button>
  </form></main>;

  if (user.role === "owner" && !user.hasAccess) return <main className="counter-page counter-login-wrap"><section className="counter-login"><h1>Assinatura não ativa</h1><p>O acesso ao caixa será liberado após a confirmação do pagamento.</p><Link to="/planos">Ver planos</Link><button onClick={()=>{signOut();setUser(null);}}>Sair</button></section></main>;

  return <main className="counter-page">
    <header className="counter-header"><div className="counter-identity"><img src={logoImg} alt="" className="brand-logo" /><div><span className="counter-kicker">FRANGO SHOW · CAIXA</span><h1>Venda no balcão</h1><p>Registre a venda e atualize o estoque automaticamente.</p></div></div><Link to="/admin">Painel administrativo</Link><button onClick={() => { signOut(); setUser(null); }}><LogOut size={17}/> Sair</button></header>
    <CounterBoard />
  </main>;
}
