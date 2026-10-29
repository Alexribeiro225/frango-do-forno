import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Store } from "lucide-react";
import { configured, listActivePlans, signUpForPlan, type SaaSPlan } from "@/lib/cms";

export const Route = createFileRoute("/planos")({ component: Plans });
const intervalLabel: Record<string, string> = { weekly:"semana", monthly:"mês", bimonthly:"2 meses", quarterly:"3 meses", semiannual:"6 meses", annual:"ano" };
const money = (value:number) => Number(value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function Plans() {
  const [plans,setPlans]=useState<SaaSPlan[]>([]);
  const [selected,setSelected]=useState<SaaSPlan|null>(null);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{ listActivePlans().then(setPlans).catch(()=>setError("Não foi possível carregar os planos. Tente novamente em instantes.")).finally(()=>setLoaded(true)); },[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!selected||busy)return;
    setBusy(true);setError("");
    try {
      await signUpForPlan(email,password,selected.id);
      window.location.assign(selected.checkout_url);
    } catch(e) { setError(e instanceof Error?e.message:"Não foi possível criar a conta."); }
    finally { setBusy(false); }
  }
  return <main className="admin-page" style={{minHeight:"100vh"}}>
    <div className="admin-wrap">
      <header className="admin-header"><div><span className="admin-eyebrow">FRANGO SHOW · GESTÃO</span><h1>Planos para sua loja</h1><p>Escolha um plano e crie seu acesso para começar.</p></div><Link className="admin-logout" to="/admin">Já tenho uma conta</Link></header>
      {!configured&&<div className="admin-error">O sistema de cadastro ainda está sendo preparado.</div>}
      {error&&<div className="admin-error" role="alert">{error}</div>}
      {!plans.length&&!error&&<section className="admin-card"><h2>{loaded?"Nenhum plano está disponível no momento.":"Carregando planos…"}</h2></section>}
      <section className="product-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20}}>
        {plans.map(plan=><article className="admin-card" key={plan.id} style={{padding:24}}>
          <span className="admin-eyebrow">ASSINATURA</span><h2>{plan.name}</h2><p>{plan.description}</p>
          <p style={{fontSize:28,fontWeight:700,color:"#ef1724",margin:"20px 0"}}>{money(plan.price)}<small style={{fontSize:14,color:"#777"}}> / {intervalLabel[plan.billing_interval]||"mês"}</small></p>
          {Array.isArray(plan.features)&&plan.features.map((feature,index)=><p key={index} style={{display:"flex",gap:8,alignItems:"center"}}><Check size={17}/>{feature}</p>)}
          <button className="admin-primary" style={{width:"100%",marginTop:18}} onClick={()=>{setSelected(plan);setError("");}}>Criar conta e assinar</button>
        </article>)}
      </section>
      {selected&&<section className="admin-card" style={{maxWidth:560,margin:"24px auto"}}>
        <div className="admin-card-head"><div><span className="admin-eyebrow">PLANO ESCOLHIDO</span><h2>{selected.name}</h2></div><button type="button" onClick={()=>setSelected(null)}>Fechar</button></div>
        <form className="admin-form" onSubmit={submit}>
          <p>Crie seu login. Após o cadastro, você será encaminhado ao checkout seguro da Kiwify. Use o mesmo e-mail no checkout; o painel libera quando o pagamento for confirmado.</p>
          <label>E-mail<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Crie uma senha<input type="password" value={password} onChange={event=>setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /><small>Use pelo menos 8 caracteres.</small></label>
          <button className="admin-primary" disabled={busy||!configured}>{busy?"Criando conta…":"Continuar para pagamento"}</button>
        </form>
      </section>}
      <footer style={{textAlign:"center",padding:"40px 0",color:"#777"}}><Store size={18} style={{display:"inline",verticalAlign:"middle",marginRight:8}}/>Acesso liberado automaticamente após confirmação da Kiwify.</footer>
    </div>
  </main>;
}
