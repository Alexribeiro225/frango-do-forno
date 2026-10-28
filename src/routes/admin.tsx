import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { configured, currentUser, deleteRow, listRows, saveRow, signIn, signOut, uploadImage } from "@/lib/cms";
import type { Announcement, Product, Promo } from "@/lib/cms";

export const Route = createFileRoute("/admin")({ component: Admin });
type Tab = "products" | "promotions" | "announcements";
const tabs: { id: Tab; label: string }[] = [{ id: "products", label: "Produtos" }, { id: "promotions", label: "Promoções" }, { id: "announcements", label: "Avisos" }];
const blank = (tab: Tab) => tab === "products"
  ? { category: "Aves", name: "", price: "", description: "", image_url: "", is_popular: false, is_active: true, stock_quantity: "", sort_order: 100 }
  : tab === "promotions" ? { title: "", description: "", image_url: "", starts_at: "", ends_at: "", is_active: true }
  : { title: "", body: "", image_url: "", is_active: true };

function Admin() {
  const [user, setUser] = useState<{email?: string} | null>(null);
  const [tab, setTab] = useState<Tab>("products");
  const [rows, setRows] = useState<Array<Product | Promo | Announcement>>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(blank("products"));
  const [email, setEmail] = useState("conectstore.app@gmail.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { currentUser().then(setUser); }, []);
  useEffect(() => { if (user) refresh(); }, [user, tab]);
  async function refresh() { try { setRows(await listRows(tab)); } catch (e) { setError(message(e)); } }
  function message(e: unknown) { return e instanceof Error ? e.message : "Ocorreu um erro."; }
  async function login(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { setUser(await signIn(email, password)); } catch (e) { setError(message(e)); } finally { setBusy(false); } }
  function edit(row: Product | Promo | Announcement) {
    setEditing(row.id);
    const data = { ...row } as unknown as Record<string, unknown>;
    if (tab === "products") { data["category"] = (row as Product)["category"]; data["description"] = (row as Product)["description"]; }
    if (tab === "promotions") { data["starts_at"] = (row as Promo)["starts_at"]?.slice(0, 16) || ""; data["ends_at"] = (row as Promo)["ends_at"]?.slice(0, 16) || ""; }
    setForm(data);
    document.getElementById("admin-form")?.scrollIntoView({ behavior: "smooth" });
  }
  function fresh() { setEditing(null); setForm(blank(tab)); }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form };
      if (tab === "products") { payload["price"] = Number(payload["price"]); payload["stock_quantity"] = payload["stock_quantity"] === "" || payload["stock_quantity"] == null ? null : Number(payload["stock_quantity"]); }
      if (tab === "promotions") { payload["starts_at"] = payload["starts_at"] || null; payload["ends_at"] = payload["ends_at"] || null; }
      await saveRow(tab, payload, editing ?? undefined); setNotice("Alterações salvas."); fresh(); await refresh();
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
  if (!user) return <main className="admin-page"><form className="admin-login" onSubmit={login}><span className="admin-eyebrow">FRANGO SHOW · SUPERADMIN</span><h1>Entrar no painel</h1><p>Acesso exclusivo para conectstore.app@gmail.com.</p><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <div className="admin-error">{error}</div>}<button className="admin-primary" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button></form></main>;
  const imageField = <label className="admin-image-field">Imagem<input type="file" accept="image/*" onChange={e => image(e.currentTarget.files?.[0])} /><span><ImagePlus size={18}/> Enviar imagem</span>{typeof form["image_url"] === "string" && form["image_url"] && <img src={form["image_url"]} alt="Prévia" />}</label>;
  return <main className="admin-page"><div className="admin-wrap">
    <header className="admin-header"><div><span className="admin-eyebrow">FRANGO SHOW · SUPERADMIN</span><h1>Painel de conteúdo</h1><p>Gerencie o que aparece na loja.</p></div><div className="admin-header-actions"><a className="admin-logout" href="/cozinha">Abrir cozinha</a><button className="admin-logout" onClick={() => { signOut(); setUser(null); }}><LogOut size={17}/> Sair</button></div></header>
    <nav className="admin-tabs">{tabs.map(t => <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => { setTab(t.id); setEditing(null); setForm(blank(t.id)); }}>{t.label}</button>)}</nav>
    {error && <div className="admin-error">{error}</div>}{notice && <div className="admin-notice">{notice}</div>}
    <section className="admin-card" id="admin-form"><div className="admin-card-head"><h2>{editing ? "Editar" : "Adicionar"} {tabs.find(t => t.id === tab)?.label.toLowerCase()}</h2>{editing && <button onClick={fresh}>Cancelar</button>}</div>
      <form className="admin-form" onSubmit={submit}>
        {tab === "products" && <><div className="admin-two"><label>Nome<input value={String(form["name"] || "")} onChange={e => setForm(f => ({...f,name:e.target.value}))} required /></label><label>Categoria<select value={String(form["category"])} onChange={e => setForm(f => ({...f,category:e.target.value}))}>{["Aves","Bovinos","Suínos","Acompanhamentos","Sobremesas","Bebidas","Combos"].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Preço (R$)<input type="number" min="0" step="0.01" value={String(form["price"] ?? "")} onChange={e=>setForm(f=>({...f,price:e.target.value}))} required /></label><label>Quantidade em estoque<input type="number" min="0" step="1" inputMode="numeric" placeholder="Sem controle de estoque" value={String(form["stock_quantity"] ?? "")} onChange={e=>setForm(f=>({...f,stock_quantity:e.target.value}))} /></label><small className="admin-stock-help">Deixe vazio para não controlar. Cada pedido confirmado reduz essa quantidade automaticamente.</small><label>Descrição<textarea value={String(form["description"] || "")} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>{imageField}<div className="admin-checks"><label><input type="checkbox" checked={Boolean(form["is_popular"])} onChange={e=>setForm(f=>({...f,is_popular:e.target.checked}))}/> Mais pedido</label><label><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Visível na loja</label></div></>}
        {tab === "promotions" && <><label>Título<input value={String(form["title"] || "")} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required /></label><label>Descrição<input value={String(form["description"] || "")} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>{imageField}<div className="admin-two"><label>Começa em<input type="datetime-local" value={String(form["starts_at"] || "")} onChange={e=>setForm(f=>({...f,starts_at:e.target.value}))}/></label><label>Termina em<input type="datetime-local" value={String(form["ends_at"] || "")} onChange={e=>setForm(f=>({...f,ends_at:e.target.value}))}/></label></div><label className="admin-inline"><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Promoção ativa</label></>}
        {tab === "announcements" && <><label>Título<input value={String(form["title"] || "")} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required /></label><label>Texto<textarea value={String(form["body"] || "")} onChange={e=>setForm(f=>({...f,body:e.target.value}))} required /></label>{imageField}<label className="admin-inline"><input type="checkbox" checked={Boolean(form["is_active"])} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Aviso ativo</label></>}
        <button className="admin-primary" disabled={busy}>{busy ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar"}</button>
      </form>
    </section>
    <section className="admin-list"><div className="admin-card-head"><h2>Itens cadastrados ({rows.length})</h2><button className="admin-add" onClick={fresh}><Plus size={17}/> Novo</button></div>{rows.length ? rows.map(row => <article className="admin-row" key={row.id}>{("image_url" in row && row.image_url) && <img src={row.image_url} alt="" />}<div><b>{"name" in row ? row.name : row.title}</b><small>{"category" in row ? row.category + " · " + new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(row.price) : "description" in row ? row.description : row.body}</small><small>{row.is_active ? "Ativo" : "Oculto"}{"name" in row && <> · {row.stock_quantity === null ? "Estoque sem controle" : "Estoque: " + row.stock_quantity}</>}</small></div><button aria-label="Editar" onClick={()=>edit(row)}><Pencil size={17}/></button><button aria-label="Excluir" onClick={()=>remove(row.id)}><Trash2 size={17}/></button></article>) : <p className="admin-empty">Nenhum item cadastrado ainda.</p>}</section>
  </div></main>;
}
