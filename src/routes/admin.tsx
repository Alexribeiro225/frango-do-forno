import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, BarChart3, ChefHat, CircleDollarSign, Clock3, CreditCard, ImagePlus, LayoutDashboard, LogOut, Megaphone, Package, Pencil, Plus, ShoppingBag, Store, Trash2, Users } from "lucide-react";
import { AdminUsers } from "@/components/AdminUsers";
import { configured, currentUser, isEmailRegistered, isImpersonating, returnToMaster, signUpTrial, trialDaysLeft, deleteRow, getMySubscription, listComboComponents, listOrders, listRows, saveComboComponents, saveRow, signIn, signOut, uploadImage } from "@/lib/cms";
import type { Announcement, KitchenOrder, Product, Promo } from "@/lib/cms";

export const Route = createFileRoute("/admin")({ component: Admin });
type Tab = "products" | "promotions" | "announcements";
const tabs: { id: Tab; label: string }[] = [{ id: "products", label: "Produtos" }, { id: "promotions", label: "Promoções" }, { id: "announcements", label: "Avisos" }];
const blank = (tab: Tab) => tab === "products"
  ? { category: "Aves", name: "", price: "", description: "", image_url: "", is_popular: false, is_active: true, stock_quantity: "", sort_order: 100 }
  : tab === "promotions" ? { title: "", description: "", image_url: "", starts_at: "", ends_at: "", is_active: true }
  : { title: "", body: "", image_url: "", is_active: true };

function Admin() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof currentUser>>>(null);
  const [subscriptionCheckout, setSubscriptionCheckout] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("products");
  const [section, setSection] = useState<"dashboard" | "users" | Tab>("dashboard");
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [dashboardProducts, setDashboardProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Array<Product | Promo | Announcement>>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(blank("products"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [password2, setPassword2] = useState("");
  const [impersonating, setImpersonating] = useState(false);
  useEffect(() => { setImpersonating(isImpersonating()); }, [user]);
  useEffect(() => { if (user?.role === "owner" && !user.hasAccess && !user.isBlocked) { const t = setTimeout(() => { window.location.href = "/planos"; }, 4000); return () => clearTimeout(t); } return undefined; }, [user]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [comboComponents, setComboComponents] = useState<Array<{ product_id: number; quantity: number }>>([]);
  useEffect(() => { currentUser().then(setUser); }, []);
  useEffect(() => { if (user?.role === "master" || user?.hasAccess) refresh(); }, [user, tab]);
  useEffect(() => { if (user?.role === "owner" && user.subscriptionStatus !== "active") getMySubscription().then(value => setSubscriptionCheckout(value.checkout_url)).catch(() => {}); }, [user]);
  useEffect(() => {
    if (!user || (user.role === "owner" && !user.hasAccess)) return;
    Promise.all([listOrders(), listRows("products")]).then(([nextOrders, nextProducts]) => {
      setOrders(nextOrders);
      setDashboardProducts(nextProducts as Product[]);
    }).catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar o resumo da loja."));
  }, [user]);
  async function refresh() { try { setRows(await listRows(tab)); } catch (e) { setError(message(e)); } }
  function message(e: unknown) { return e instanceof Error ? e.message : "Ocorreu um erro."; }
  async function login(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); setNotice(""); try { if (!(await isEmailRegistered(email))) { setMode("signup"); setPassword(""); return; } setUser(await signIn(email, password)); } catch (e) { setError(message(e)); } finally { setBusy(false); } }
  async function register(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (password.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (password !== password2) { setError("As senhas não conferem."); return; }
    setBusy(true);
    try {
      const r = await signUpTrial(email, password);
      if (r.confirmationRequired) { setMode("login"); setNotice("Conta criada! Confirme o e-mail que enviamos e depois entre para começar seus 15 dias grátis."); }
      else setUser(await currentUser());
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function edit(row: Product | Promo | Announcement) {
    setEditing(row.id);
    const data = { ...row } as unknown as Record<string, unknown>;
    if (tab === "products") { data["category"] = (row as Product)["category"]; data["description"] = (row as Product)["description"]; }
    if (tab === "promotions") { data["starts_at"] = (row as Promo)["starts_at"]?.slice(0, 16) || ""; data["ends_at"] = (row as Promo)["ends_at"]?.slice(0, 16) || ""; }
    setForm(data);
    setComboComponents([]);
    if (tab === "products" && (row as Product).category === "Combos") {
      try {
        const recipe = await listComboComponents(row.id);
        setComboComponents(recipe.map(component => ({ product_id: component.component_product_id, quantity: component.quantity_per_combo })));
      } catch (e) { setError(message(e)); }
    }
    document.getElementById("admin-form")?.scrollIntoView({ behavior: "smooth" });
  }
  function fresh() { setEditing(null); setForm(blank(tab)); setComboComponents([]); }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form };
      if (tab === "products") { payload["price"] = Number(payload["price"]); payload["stock_quantity"] = payload["stock_quantity"] === "" || payload["stock_quantity"] == null ? null : Number(payload["stock_quantity"]); }
      if (tab === "promotions") { payload["starts_at"] = payload["starts_at"] || null; payload["ends_at"] = payload["ends_at"] || null; }
      if (tab === "products" && payload["category"] === "Combos" && !comboComponents.length) throw new Error("Selecione os produtos que fazem parte do combo.");
      const saved = await saveRow(tab, payload, editing ?? undefined);
      if (tab === "products" && payload["category"] === "Combos") {
        const productId = editing ?? Number(saved?.[0]?.id);
        if (!productId) throw new Error("Produto salvo, mas não foi possível identificar o combo. Edite-o novamente para salvar a composição.");
        setEditing(productId);
        await saveComboComponents(productId, comboComponents);
      }
      setNotice("Alterações salvas."); fresh(); await refresh();
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function image(file?: File) {
    if (!file) return; setBusy(true); setError("");
    try { const image_url = await uploadImage(file); setForm(f => ({ ...f, image_url })); setNotice("Imagem enviada."); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (!window.confirm("Excluir este registro?")) return;
    try { await deleteRow(tab, id); await refresh(); } catch (e) { setError(message(e)); }
  }
  if (!configured) return <main className="admin-page"><section className="admin-login"><span className="admin-eyebrow">FRANGO SHOW · ADMINISTRAÇÃO</span><h1>Configure o painel</h1><p>O painel foi criado. Para guardar produtos, imagens e promoções com segurança, primeiro conecte um projeto Supabase seguindo o guia incluído no repositório.</p><a className="admin-primary" href="https://github.com/Alexribeiro225/frango-do-forno/blob/main/ADMIN_SETUP.md">Ver instruções de configuração</a></section></main>;
  if (!user && mode === "signup") return <main className="admin-page"><form className="admin-login" onSubmit={register}><span className="admin-eyebrow">FRANGO SHOW · NOVA CONTA</span><h1>Teste grátis por 15 dias</h1><p>Não encontramos uma conta com este e-mail. Crie a sua agora: <b>15 dias grátis, sem precisar de cartão</b>.</p><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Crie uma senha<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label><label>Repita a senha<input type="password" minLength={8} value={password2} onChange={e => setPassword2(e.target.value)} required /></label>{error && <div className="admin-error">{error}</div>}<button className="admin-primary" disabled={busy}>{busy ? "Criando..." : "Começar teste grátis"}</button><button type="button" className="admin-logout" onClick={() => { setMode("login"); setError(""); }}>Já tenho conta</button></form></main>;
  if (!user) return <main className="admin-page"><form className="admin-login" onSubmit={login}><span className="admin-eyebrow">FRANGO SHOW · GESTÃO</span><h1>Entrar no painel</h1><p>Acesse com o login da loja ou do admin master. E-mail novo? Você poderá criar uma conta com 15 dias grátis.</p><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>{notice && <div className="admin-notice">{notice}</div>}{error && <div className="admin-error">{error}</div>}<button className="admin-primary" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button></form></main>;
  if (user.role === "owner" && !user.hasAccess) return <main className="admin-page"><section className="admin-login"><span className="admin-eyebrow">FRANGO SHOW · ASSINATURA</span><h1>{user.isBlocked ? "Acesso bloqueado" : user.subscriptionStatus === "trial" ? "Seu teste grátis terminou" : "Ative o acesso à loja"}</h1><p>{user.isBlocked ? "O acesso desta conta foi bloqueado. Fale com o suporte." : "Escolha um plano para continuar usando o painel. Vamos te levar para a área de planos em instantes."}</p>{subscriptionCheckout && <a className="admin-primary" href={subscriptionCheckout}>Continuar pagamento</a>}<Link className="admin-logout" to="/planos">Ver planos</Link>{impersonating && <button className="admin-logout" onClick={()=>{returnToMaster();window.location.reload();}}>Voltar ao admin master</button>}<button className="admin-logout" onClick={()=>{signOut();setUser(null);}}>Sair</button></section></main>;
  const imageField = <label className="admin-image-field">Imagem<input type="file" accept="image/*" onChange={e => image(e.currentTarget.files?.[0])} /><span><ImagePlus size={18}/> Enviar imagem</span>{typeof form["image_url"] === "string" && form["image_url"] && <img src={form["image_url"]} alt="Prévia" />}</label>;
  const componentProducts = rows.filter((row): row is Product => "category" in row && row.category !== "Combos");
  const eligibleOrders = orders.filter(order => order.status !== "cancelled");
  const sevenDaysAgo = new Date(); sevenDaysAgo.setHours(0, 0, 0, 0); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recentOrders = eligibleOrders.filter(order => new Date(order.created_at) >= sevenDaysAgo);
  const salesTotal = recentOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeKitchenOrders = orders.filter(order => order.status === "new" || order.status === "preparing");
  const lowStockProducts = dashboardProducts.filter(product => product.is_active && product.stock_quantity !== null && product.stock_quantity <= 5);
  const chartDays = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); const dayOrders = recentOrders.filter(order => { const created = new Date(order.created_at); return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth() && created.getDate() === date.getDate(); }); return { date, count: dayOrders.length, total: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) }; });
  const chartMax = Math.max(1, ...chartDays.map(day => day.total));
  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  function toggleComboComponent(productId: number, enabled: boolean) {
    setComboComponents(current => enabled
      ? [...current, { product_id: productId, quantity: 1 }]
      : current.filter(component => component.product_id !== productId));
  }
  function setComboComponentQuantity(productId: number, quantity: number) {
    setComboComponents(current => current.map(component => component.product_id === productId ? { ...component, quantity } : component));
  }
  return <main className="admin-page saas-admin-page">
    <aside className="saas-sidebar">
      <Link className="saas-brand" to="/" aria-label="Frango Show, abrir loja"><img src="/images/frango-show-logo.webp" alt="" className="saas-brand-logo" /><span><b>FRANGO SHOW</b><small>ROTISSERIE · PAINEL</small></span></Link>
      <div className="saas-nav-group"><span>OPERAÇÃO</span>
        <button className={section === "dashboard" ? "saas-nav-item active" : "saas-nav-item"} onClick={() => setSection("dashboard")}><LayoutDashboard size={19}/> Visão geral</button>
        <Link className="saas-nav-item" to="/cozinha"><ChefHat size={19}/> Pedidos e cozinha</Link>
        <Link className="saas-nav-item" to="/balcao"><Store size={19}/> Venda no balcão</Link>
      </div>
      <div className="saas-nav-group"><span>GESTÃO</span>
        <button className={section === "products" ? "saas-nav-item active" : "saas-nav-item"} onClick={() => { setSection("products"); setTab("products"); setEditing(null); setForm(blank("products")); setComboComponents([]); }}><Package size={19}/> Produtos e combos</button>
        <button className={section === "promotions" ? "saas-nav-item active" : "saas-nav-item"} onClick={() => { setSection("promotions"); setTab("promotions"); setEditing(null); setForm(blank("promotions")); setComboComponents([]); }}><Megaphone size={19}/> Promoções</button>
        <button className={section === "announcements" ? "saas-nav-item active" : "saas-nav-item"} onClick={() => { setSection("announcements"); setTab("announcements"); setEditing(null); setForm(blank("announcements")); setComboComponents([]); }}><ShoppingBag size={19}/> Avisos da loja</button>
        <a className="saas-nav-item" href="#sales-chart" onClick={() => setSection("dashboard")}><BarChart3 size={19}/> Relatórios</a>
      </div>
      <div className="saas-sidebar-bottom">
        {user.role === "master" && <button className={section === "users" ? "saas-nav-item active" : "saas-nav-item"} onClick={() => setSection("users")}><Users size={19}/> Usuários</button>}
        {user.role === "master" && <Link className="saas-nav-item" to="/admin/planos"><CreditCard size={19}/> Planos SaaS</Link>}
        <span className="saas-store-chip"><span/> Loja conectada</span>
        <small>{user.email || (user.role === "master" ? "Admin master" : "Conta da loja")}</small>
      </div>
    </aside>
    <div className="saas-main">
      <header className="saas-topbar"><div className="saas-connection"><span/> Sistema operacional</div><div className="saas-topbar-actions">{user.role === "master" && <Link to="/admin/planos" className="saas-top-link"><CreditCard size={16}/> Planos</Link>}<span className="saas-avatar">{(user.email || "F").charAt(0).toUpperCase()}</span><button className="saas-top-link" onClick={() => { signOut(); setUser(null); }}><LogOut size={16}/> Sair</button></div></header>
      <div className="saas-content">
        {error && <div className="admin-error" role="alert">{error}</div>}{notice && <div className="admin-notice" role="status">{notice}</div>}
        {impersonating && <div className="trial-banner">Você está vendo o sistema como {user.email}. <button onClick={() => { returnToMaster(); window.location.reload(); }}>Voltar ao admin master</button></div>}
        {user.role === "owner" && user.subscriptionStatus === "trial" && <div className="trial-banner">Teste grátis: <b>{trialDaysLeft(user.trialEndsAt)} dia(s) restantes</b>. <Link to="/planos">Escolher um plano</Link></div>}
        {section === "users" && user.role === "master" ? <AdminUsers /> : section === "dashboard" ? <section className="saas-dashboard">
          <div className="saas-page-heading"><div><span className="admin-eyebrow">{user.role === "master" ? "ADMIN MASTER" : "GESTÃO DA LOJA"}</span><h1>Dashboard <span className="saas-heading-dot">·</span></h1><p>Visão geral · últimos 7 dias</p></div><div className="saas-range-pill"><Clock3 size={16}/> Últimos 7 dias</div></div>
          <div className="saas-metrics">
            <article className="saas-metric saas-metric-highlight"><div><span className="saas-metric-icon"><ShoppingBag size={19}/></span><span>Pedidos recebidos</span></div><strong>{recentOrders.length}</strong><small><ArrowRight size={14}/> {orders.filter(order => order.status === "new").length} novos</small></article>
            <article className="saas-metric"><div><span className="saas-metric-icon blue"><CircleDollarSign size={19}/></span><span>Vendas no período</span></div><strong>{currency(salesTotal)}</strong><small><BarChart3 size={14}/> {recentOrders.length} pedidos não cancelados</small></article>
            <article className="saas-metric"><div><span className="saas-metric-icon blue"><ChefHat size={19}/></span><span>Em preparo</span></div><strong>{activeKitchenOrders.length}</strong><small><Clock3 size={14}/> Acompanhe pela cozinha</small></article>
            <article className="saas-metric"><div><span className="saas-metric-icon amber"><AlertTriangle size={19}/></span><span>Estoque baixo</span></div><strong>{lowStockProducts.length}</strong><small><Package size={14}/> Produtos com até 5 unidades</small></article>
          </div>
          <div className="saas-dashboard-grid">
            <section className="saas-panel saas-chart-panel" id="sales-chart"><div className="saas-panel-heading"><div><h2>Vendas</h2><p>Valor dos pedidos por dia</p></div><span className="saas-chart-legend"><i/> Total vendido</span></div>
              <div className="saas-chart">{chartDays.map(day => <div className="saas-chart-column" key={day.date.toISOString()}><div className="saas-chart-track"><span style={{height: `${day.total ? Math.max(8, day.total / chartMax * 100) : 3}%`}} title={currency(day.total)} /></div><small>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day.date).replace(".", "")}</small></div>)}</div>
              {!recentOrders.length && <p className="saas-chart-empty">Os pedidos registrados nos últimos 7 dias aparecerão aqui.</p>}
            </section>
            <section className="saas-panel saas-priority-panel"><div className="saas-panel-heading"><div><h2><AlertTriangle size={19}/> Precisa de atenção</h2><p>O que merece prioridade agora</p></div></div>
              <div className="saas-priority-stats"><div><Clock3 size={15}/><span>EM ABERTO</span><b>{activeKitchenOrders.length}</b></div><div><Package size={15}/><span>ESTOQUE BAIXO</span><b>{lowStockProducts.length}</b></div></div>
              {activeKitchenOrders.slice(0, 3).map(order => <div className="saas-priority-order" key={order.id}><span className="saas-priority-dot"/><b>Pedido #{order.id}</b><small>{order.customer_name} · {order.status === "new" ? "Novo" : "Em preparo"}</small></div>)}
              {!activeKitchenOrders.length && !lowStockProducts.length && <p className="saas-all-clear">Tudo em dia por aqui.</p>}
              <div className="saas-panel-actions"><Link to="/cozinha">Abrir cozinha <ArrowRight size={15}/></Link>{lowStockProducts.length > 0 && <button onClick={() => { setSection("products"); setTab("products"); }}>Revisar estoque <ArrowRight size={15}/></button>}</div>
            </section>
          </div>
          <section className="saas-panel saas-recent-panel"><div className="saas-panel-heading"><div><h2>Pedidos recentes</h2><p>Últimos pedidos recebidos pela loja</p></div><Link to="/cozinha">Ver todos <ArrowRight size={15}/></Link></div>
            {orders.slice(0, 5).length ? orders.slice(0, 5).map(order => <article className="saas-order-row" key={order.id}><span className={`saas-order-status status-${order.status}`}/><b>#{order.id}</b><span>{order.customer_name}</span><small>{new Date(order.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small><strong>{currency(Number(order.total || 0))}</strong></article>) : <p className="saas-chart-empty">Os pedidos da loja aparecerão nesta lista.</p>}
          </section>
        </section> : <>
          <header className="saas-page-heading saas-management-heading"><div><span className="admin-eyebrow">{user.role === "master" ? "ADMIN MASTER" : "GESTÃO DA LOJA"}</span><h1>{tabs.find(t => t.id === tab)?.label}</h1><p>Gerencie os dados que aparecem na loja.</p></div><button className="saas-primary-action" onClick={fresh}><Plus size={17}/> Novo item</button></header>
          <nav className="admin-tabs">{tabs.map(t => <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => { setSection(t.id); setTab(t.id); setEditing(null); setForm(blank(t.id)); setComboComponents([]); }}>{t.label}</button>)}</nav>
          <section className="admin-card" id="admin-form"><div className="admin-card-head"><h2>{editing ? "Editar" : "Adicionar"} {tabs.find(t => t.id === tab)?.label.toLowerCase()}</h2>{editing && <button onClick={fresh}>Cancelar</button>}</div>
      <form className="admin-form" onSubmit={submit}>
        {tab === "products" && <><div className="admin-two"><label>Nome<input value={String(form["name"] || "")} onChange={e => setForm(f => ({...f,name:e.target.value}))} required /></label><label>Categoria<select value={String(form["category"])} onChange={e => setForm(f => ({...f,category:e.target.value}))}>{["Aves","Bovinos","Suínos","Acompanhamentos","Sobremesas","Bebidas","Combos"].map(x=><option key={x}>{x}</option>)}</select></label></div>{String(form["category"]) === "Combos" && <section className="combo-components-editor"><div><b>Composição do combo</b><small>Marque os itens incluídos e informe a quantidade consumida por unidade do combo.</small></div>{componentProducts.length ? componentProducts.map(product => {
          const selected = comboComponents.find(component => component.product_id === product.id);
          return <label className="combo-component-row" key={product.id}><input type="checkbox" checked={Boolean(selected)} disabled={!product.is_active && !selected} onChange={event => toggleComboComponent(product.id,event.currentTarget.checked)} /><span><b>{product.name}</b><small>{!product.is_active ? "Produto oculto" : product.stock_quantity === null ? "Estoque sem controle" : "Estoque atual: " + product.stock_quantity}</small></span><input type="number" min="1" max="99" step="1" disabled={!selected} value={selected?.quantity ?? ""} aria-label={"Quantidade de " + product.name + " por combo"} onChange={event => setComboComponentQuantity(product.id,Number(event.target.value))} /></label>;
        }) : <p>Cadastre e ative produtos que não sejam combos para adicioná-los à composição.</p>}</section>}<label>Preço (R$)<input type="number" min="0" step="0.01" value={String(form["price"] ?? "")} onChange={e=>setForm(f=>({...f,price:e.target.value}))} required /></label>{String(form["category"]) === "Combos" ? <small className="admin-stock-help">O estoque do combo é calculado pelos produtos da composição abaixo.</small> : <><label>Quantidade em estoque<input type="number" min="0" step="1" inputMode="numeric" placeholder="Sem controle de estoque" value={String(form["stock_quantity"] ?? "")} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))} /></label><small className="admin-stock-help">Deixe vazio para não controlar. Cada pedido confirmado reduz essa quantidade automaticamente.</small></>}<label>Descrição<textarea value={String(form["description"] || "")} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>{imageField}<div className="admin-checks"><label><input type="checkbox" checked={Boolean(form["is_popular"])} onChange={e=>setForm(f=>({...f,is_popular:e.target.checked}))}/> Mais pedido</label><label><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Visível na loja</label></div></>}
        {tab === "promotions" && <><label>Título<input value={String(form["title"] || "")} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required /></label><label>Descrição<input value={String(form["description"] || "")} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>{imageField}<div className="admin-two"><label>Começa em<input type="datetime-local" value={String(form["starts_at"] || "")} onChange={e=>setForm(f=>({...f,starts_at:e.target.value}))}/></label><label>Termina em<input type="datetime-local" value={String(form["ends_at"] || "")} onChange={e=>setForm(f=>({...f,ends_at:e.target.value}))}/></label></div><label className="admin-inline"><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Promoção ativa</label></>}
        {tab === "announcements" && <><label>Título<input value={String(form["title"] || "")} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required /></label><label>Texto<textarea value={String(form["body"] || "")} onChange={e=>setForm(f=>({...f,body:e.target.value}))} required /></label>{imageField}<label className="admin-inline"><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Aviso ativo</label></>}
        <button className="admin-primary" disabled={busy}>{busy ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar"}</button>
      </form>
    </section>
    <section className="admin-list"><div className="admin-card-head"><h2>Itens cadastrados ({rows.length})</h2><button className="admin-add" onClick={fresh}><Plus size={17}/> Novo</button></div>{rows.length ? rows.map(row => <article className="admin-row" key={row.id}>{("image_url" in row && row.image_url) && <img src={row.image_url} alt="" />}<div><b>{"name" in row ? row.name : row.title}</b><small>{"category" in row ? row.category + " · " + new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(row.price) : "description" in row ? row.description : row.body}</small><small>{row.is_active ? "Ativo" : "Oculto"}{"category" in row && <> · {row.category === "Combos" ? "Estoque pelos componentes" : row.stock_quantity === null ? "Estoque sem controle" : "Estoque: " + row.stock_quantity}</>}</small></div><button aria-label="Editar" onClick={()=>void edit(row)}><Pencil size={17}/></button><button aria-label="Excluir" onClick={()=>remove(row.id)}><Trash2 size={17}/></button></article>) : <p className="admin-empty">Nenhum item cadastrado ainda.</p>}</section>
        </>}
      </div>
    </div>
  </main>;
}
