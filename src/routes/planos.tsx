import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Store } from "lucide-react";
import { configured, currentUser, listActivePlans, signUpTrial, trialDaysLeft, type AppUser, type SaaSPlan } from "@/lib/cms";
import { canStartCheckout } from "@/lib/billing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/planos")({ component: Plans, head: () => ({ meta: [
  { title: "Planos para sua loja | Frango Show Rotisserie" },
  { name: "description", content: "Planos de assinatura para gerenciar sua loja na plataforma Frango Show Rotisserie." },
  { property: "og:title", content: "Planos para sua loja | Frango Show Rotisserie" },
  { property: "og:description", content: "Planos de assinatura para gerenciar sua loja na plataforma Frango Show Rotisserie." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }) });
const intervalLabel: Record<string, string> = { weekly:"semana", monthly:"mês", bimonthly:"2 meses", quarterly:"3 meses", semiannual:"6 meses", annual:"ano" };
const money = (value:number) => Number(value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function Plans() {
  const [plans,setPlans]=useState<SaaSPlan[]>([]);
  const [user,setUser]=useState<AppUser|null>(null);
  const [sessionLoaded,setSessionLoaded]=useState(false);
  const [notice,setNotice]=useState("");
  const [password2,setPassword2]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{ listActivePlans().then(setPlans).catch(()=>setError("Não foi possível carregar os planos. Tente novamente em instantes.")).finally(()=>setLoaded(true)); },[]);
  useEffect(()=>{ currentUser().then(setUser).finally(()=>setSessionLoaded(true)); },[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy)return;
    if(password!==password2){setError("As senhas não conferem.");return;}
    setBusy(true);setError("");
    try {
      const result=await signUpTrial(email,password);
      if(result.confirmationRequired) setNotice("Conta criada! Confirme seu e-mail e entre no painel para usar seus 15 dias grátis, sem cartão.");
      else { setUser(await currentUser()); setNotice("Conta criada! Seu teste grátis está disponível no painel."); }
    } catch(e) { setError(e instanceof Error?e.message:"Não foi possível criar a conta."); }
    finally { setBusy(false); }
  }
  async function checkout(plan:SaaSPlan) {
    if(busy)return;
    setBusy(true);setError("");
    try {
      const account=await currentUser();
      setUser(account);
      if(!canStartCheckout(account)) { setError("O pagamento fica disponível após o término do teste grátis. Acesse o painel para continuar."); return; }
      window.location.assign(plan.checkout_url);
    } catch(e) { setError(e instanceof Error?e.message:"Não foi possível abrir o pagamento."); }
    finally { setBusy(false); }
  }
  return <main className="admin-page" style={{minHeight:"100vh"}}>
    <div className="admin-wrap">
      <header className="admin-header"><div><span className="admin-eyebrow">FRANGO SHOW · GESTÃO</span><h1>{user?"Planos para sua loja":"Teste grátis por 15 dias"}</h1><p>{user?"Contrate após o término do teste grátis.":"Crie sua conta sem cartão. O pagamento fica para depois do teste."}</p></div><Link className="admin-logout" to="/admin">{user?"Ir para o painel":"Já tenho uma conta"}</Link></header>
      {!configured&&<div className="admin-error">O sistema de cadastro ainda está sendo preparado.</div>}
      {error&&<div className="admin-error" role="alert">{error}</div>}
      {notice&&<div className="admin-notice" role="status">{notice} <Link to="/admin">Entrar no painel</Link></div>}
      {user?.subscriptionStatus==="trial"&&user.trialEndsAt&&trialDaysLeft(user.trialEndsAt)>0&&<div className="trial-banner">Teste grátis: <b>{trialDaysLeft(user.trialEndsAt)} dia(s) restantes</b>. Sem cobrança durante o teste.</div>}
      {user?.isBlocked&&<div className="admin-error">Acesso bloqueado. Fale com o suporte.</div>}
      {sessionLoaded&&!user&&!notice&&<section className="max-w-xl mx-auto py-6">
        <form className="admin-form" onSubmit={submit}>
          <label>E-mail<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Crie uma senha<input type="password" value={password} onChange={event=>setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /><small>Use pelo menos 8 caracteres.</small></label>
          <label>Repita a senha<input type="password" value={password2} onChange={event=>setPassword2(event.target.value)} minLength={8} autoComplete="new-password" required /></label>
          <Button className="admin-primary" disabled={busy||!configured}>{busy?"Criando conta…":"Começar teste grátis"}</Button>
        </form>
      </section>}
      {user&&!plans.length&&!error&&<section><h2>{loaded?"Nenhum plano está disponível no momento.":"Carregando planos…"}</h2></section>}
      {user&&<section className="product-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20}}>
        {plans.map(plan=><article className="admin-card" key={plan.id} style={{padding:24}}>
          <span className="admin-eyebrow">ASSINATURA</span><h2>{plan.name}</h2><p>{plan.description}</p>
          <p style={{fontSize:28,fontWeight:700,color:"#ef1724",margin:"20px 0"}}>{money(plan.price)}<small style={{fontSize:14,color:"#777"}}> / {intervalLabel[plan.billing_interval]||"mês"}</small></p>
          {Array.isArray(plan.features)&&plan.features.map((feature,index)=><p key={index} style={{display:"flex",gap:8,alignItems:"center"}}><Check size={17}/>{feature}</p>)}
          <Button className="admin-primary w-full mt-4" disabled={busy||!canStartCheckout(user)} onClick={()=>checkout(plan)}>{canStartCheckout(user)?"Contratar plano":"Pagamento após o teste"}</Button>
        </article>)}
      </section>}
      <footer className="text-center py-10 text-muted-foreground"><Store size={18} className="inline align-middle mr-2"/>15 dias grátis, sem cartão. Após o teste, pagamento seguro pela Kiwify.</footer>
    </div>
  </main>;
}
