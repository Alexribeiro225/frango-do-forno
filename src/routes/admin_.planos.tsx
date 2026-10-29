import { createFileRoute } from "@tanstack/react-router";
import { useEffect,useState,type FormEvent } from "react";
import { ArrowLeft,LogOut,Pencil,Plus,Trash2 } from "lucide-react";
import { configured,currentUser,deletePlan,listPlans,savePlan,signOut,type SaaSPlan } from "@/lib/cms";

export const Route=createFileRoute("/admin_/planos")({component:AdminPlans});
const emptyPlan={name:"",description:"",price:"",billing_interval:"monthly",checkout_url:"",kiwify_product_id:"",features:"",is_active:true,sort_order:100};
const intervalLabel:Record<string,string>={weekly:"Semanal",monthly:"Mensal",bimonthly:"Bimestral",quarterly:"Trimestral",semiannual:"Semestral",annual:"Anual"};

function AdminPlans(){
  const [user,setUser]=useState<Awaited<ReturnType<typeof currentUser>>>(null);
  const [plans,setPlans]=useState<SaaSPlan[]>([]);
  const [form,setForm]=useState<Record<string,unknown>>(emptyPlan);
  const [editing,setEditing]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{currentUser().then(setUser);},[]);
  useEffect(()=>{if(user?.role==="master")void refresh();},[user]);
  async function refresh(){try{setPlans(await listPlans());}catch(e){setError(e instanceof Error?e.message:"Falha ao carregar planos.");}}
  function fresh(){setEditing(null);setForm(emptyPlan);}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(user?.role!=="master")return;
    setBusy(true);setError("");setNotice("");
    try{
      const payload={...form,price:Number(form["price"]),sort_order:Number(form["sort_order"]),features:String(form["features"]||"").split("\n").map(x=>x.trim()).filter(Boolean)};
      await savePlan(payload as Partial<SaaSPlan>,editing??undefined);
      setNotice("Plano salvo.");fresh();await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar plano.");}finally{setBusy(false);}
  }
  function edit(plan:SaaSPlan){
    setEditing(plan.id);setForm({...plan,price:String(plan.price),features:(plan.features||[]).join("\n"),kiwify_product_id:plan.kiwify_product_id||""});
    document.getElementById("saas-plan-form")?.scrollIntoView({behavior:"smooth"});
  }
  async function remove(id:number){
    if(!window.confirm("Excluir este plano?"))return;
    try{await deletePlan(id);await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao excluir plano.");}
  }
  if(!configured)return <main className="admin-page"><section className="admin-login"><h1>Banco não configurado</h1></section></main>;
  if(!user)return <main className="admin-page"><section className="admin-login"><h1>Entre como admin master</h1><Link to="/admin">Ir para o login</Link></section></main>;
  if(user.role!=="master")return <main className="admin-page"><section className="admin-login"><h1>Acesso restrito</h1><p>Esta área é exclusiva do admin master.</p><Link to="/admin">Voltar ao painel</Link></section></main>;
  return <main className="admin-page"><div className="admin-wrap">
    <header className="admin-header"><div><span className="admin-eyebrow">ADMIN MASTER · SAAS</span><h1>Planos e cobrança</h1><p>Cadastre os links de checkout e os produtos da Kiwify.</p></div><div className="admin-header-actions"><Link className="admin-logout" to="/admin"><ArrowLeft size={17}/> Painel da loja</Link><button className="admin-logout" onClick={()=>{signOut();setUser(null);}}><LogOut size={17}/> Sair</button></div></header>
    {error&&<div className="admin-error" role="alert">{error}</div>}{notice&&<div className="admin-notice">{notice}</div>}
    <section className="admin-card" id="saas-plan-form"><div className="admin-card-head"><h2>{editing?"Editar":"Novo"} plano</h2>{editing&&<button type="button" onClick={fresh}>Cancelar</button>}</div>
      <form className="admin-form" onSubmit={submit}>
        <label>Nome<input value={String(form["name"]||"")} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></label>
        <label>Descrição<textarea value={String(form["description"]||"")} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
        <div className="admin-two"><label>Preço por ciclo (R$)<input type="number" min="0" step="0.01" value={String(form["price"]??"")} onChange={e=>setForm(f=>({...f,price:e.target.value}))} required /></label><label>Frequência<select value={String(form["billing_interval"])} onChange={e=>setForm(f=>({...f,billing_interval:e.target.value}))}>{Object.entries(intervalLabel).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div>
        <label>Link de checkout da Kiwify<input type="url" placeholder="https://pay.kiwify.com.br/..." value={String(form["checkout_url"]||"")} onChange={e=>setForm(f=>({...f,checkout_url:e.target.value}))} required /></label>
        <label>ID do produto Kiwify<input value={String(form["kiwify_product_id"]||"")} onChange={e=>setForm(f=>({...f,kiwify_product_id:e.target.value}))} required /></label>
        <label>Benefícios (um por linha)<textarea value={String(form["features"]||"")} onChange={e=>setForm(f=>({...f,features:e.target.value}))}/></label>
        <label>Ordem de exibição<input type="number" value={String(form["sort_order"])} onChange={e=>setForm(f=>({...f,sort_order:e.target.value}))}/></label>
        <label className="admin-inline"><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Plano visível</label>
        <button className="admin-primary" disabled={busy}>{busy?"Salvando…":editing?"Salvar alterações":"Cadastrar plano"}</button>
      </form>
    </section>
    <section className="admin-list"><div className="admin-card-head"><h2>Planos ({plans.length})</h2><button className="admin-add" onClick={fresh}><Plus size={17}/> Novo</button></div>
      {plans.map(plan=><article className="admin-row" key={plan.id}><div><b>{plan.name}</b><small>{Number(plan.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} · {intervalLabel[plan.billing_interval]||plan.billing_interval}</small><small>{plan.is_active?"Visível":"Oculto"} · Produto Kiwify: {plan.kiwify_product_id||"não informado"}</small></div><button aria-label={"Editar "+plan.name} onClick={()=>edit(plan)}><Pencil size={17}/></button><button aria-label={"Excluir "+plan.name} onClick={()=>void remove(plan.id)}><Trash2 size={17}/></button></article>)}
      {!plans.length&&<p>Nenhum plano cadastrado.</p>}
    </section>
  </div></main>;
}
