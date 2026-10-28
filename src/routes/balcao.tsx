import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LogOut, Minus, Plus, Printer, Search, ShoppingCart, Trash2 } from "lucide-react";
import { configured, createCounterSale, currentUser, listRows, signIn, signOut, type Product } from "@/lib/cms";

export const Route = createFileRoute("/balcao")({ component: Counter });
const money = (value: number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SaleReceipt = { id: number; items: Array<{ product_id: number; name: string; quantity: number; unit_price: number; line_total: number }>; total: number; payment_method: string; created_at: string };

function Counter() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState("PIX");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [email, setEmail] = useState("conectstore.app@gmail.com");
  const [password, setPassword] = useState("");

  useEffect(() => { currentUser().then(setUser).finally(() => setChecked(true)); }, []);
  const loadProducts = useCallback(async () => {
    const rows = await listRows("products") as Product[];
    setProducts(rows.filter(product => product.is_active));
  }, []);
  useEffect(() => { if (user) void loadProducts().catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar os produtos.")); }, [user, loadProducts]);

  const visibleProducts = useMemo(() => products.filter(product => product.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [products, search]);
  const selected = products.filter(product => (cart[product.id] || 0) > 0);
  const total = selected.reduce((sum, product) => sum + Number(product.price) * cart[product.id], 0);

  function change(product: Product, amount: number) {
    setCart(current => {
      const quantity = Math.max(0, Math.min(99, product.stock_quantity ?? 99, (current[product.id] || 0) + amount));
      const next = { ...current, [product.id]: quantity };
      if (!quantity) delete next[product.id];
      return next;
    });
    setReceipt(null);
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { setUser(await signIn(email, password)); setPassword(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }
  async function finishSale() {
    if (!selected.length || busy) return;
    setBusy(true); setError("");
    try {
      const sale = await createCounterSale(payment, selected.map(product => ({ product_id: product.id, quantity: cart[product.id] })));
      setReceipt({ ...sale, created_at: new Date().toISOString() });
      setCart({});
      void loadProducts().catch(() => setError("Venda registrada, mas não foi possível atualizar a lista de estoque."));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registrar a venda."); }
    finally { setBusy(false); }
  }
  function printReceipt() {
    const target = document.getElementById("counter-receipt");
    if (!target) return;
    document.body.classList.add("printing-counter-receipt");
    target.classList.add("print-current");
    const cleanup = () => {
      document.body.classList.remove("printing-counter-receipt");
      target.classList.remove("print-current");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
  }

  if (!checked) return <main className="counter-page">Verificando acesso…</main>;
  if (!user) return <main className="counter-page counter-login-wrap"><form className="counter-login" onSubmit={login}>
    <span className="counter-kicker">FRANGO SHOW · CAIXA</span><h1>Venda no balcão</h1><p>Acesso exclusivo para a conta superadmin.</p>
    {!configured && <p className="counter-error">Banco de dados não configurado.</p>}
    <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
    <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
    {error && <p className="counter-error" role="alert">{error}</p>}
    <button className="counter-primary" disabled={busy || !configured}>{busy ? "Entrando…" : "Entrar"}</button>
  </form></main>;

  return <main className="counter-page">
    <header className="counter-header"><div><span className="counter-kicker">FRANGO SHOW · CAIXA</span><h1>Venda no balcão</h1><p>Registre a venda e atualize o estoque automaticamente.</p></div><a href="/admin">Superadmin</a><button onClick={() => { signOut(); setUser(null); }}><LogOut size={17}/> Sair</button></header>
    {error && <p className="counter-error counter-alert" role="alert">{error}</p>}
    {receipt && <section className="counter-confirmation"><div><b>Venda #{receipt.id} registrada</b><span>{money(receipt.total)} · {receipt.payment_method}</span></div><button className="counter-secondary" onClick={printReceipt}><Printer size={17}/> Imprimir comprovante</button></section>}
    <div className="counter-layout">
      <section className="counter-catalog">
        <label className="counter-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto…" /></label>
        <div className="counter-products">{visibleProducts.map(product => {
          const quantity = cart[product.id] || 0;
          const stock = product.stock_quantity;
          const unavailable = stock === 0;
          const reachedStock = stock != null && quantity >= stock;
          return <article className={"counter-product" + (unavailable ? " is-unavailable" : "")} key={product.id}>
            {product.image_url && <img src={product.image_url} alt="" />}
            <div className="counter-product-info"><b>{product.name}</b><span>{money(Number(product.price))}</span><small>{stock == null ? "Estoque sem controle" : unavailable ? "Esgotado" : "Disponível: " + stock}</small></div>
            <div className="counter-quantity"><button aria-label={"Diminuir " + product.name} disabled={!quantity} onClick={() => change(product,-1)}><Minus size={15}/></button><span>{quantity}</span><button aria-label={"Adicionar " + product.name} disabled={unavailable || reachedStock} onClick={() => change(product,1)}><Plus size={15}/></button></div>
          </article>;
        })}{!visibleProducts.length && <p className="counter-empty">Nenhum produto encontrado.</p>}</div>
      </section>
      <aside className="counter-cart"><h2><ShoppingCart size={20}/> Venda atual</h2>
        {!selected.length ? <p className="counter-empty">Adicione produtos para iniciar a venda.</p> : <div className="counter-cart-lines">{selected.map(product => <div className="counter-cart-line" key={product.id}>
          <div><b>{cart[product.id]}× {product.name}</b><span>{money(Number(product.price) * cart[product.id])}</span></div>
          <button aria-label={"Remover " + product.name} onClick={() => change(product,-cart[product.id])}><Trash2 size={16}/></button>
        </div>)}</div>}
        <label className="counter-payment">Forma de pagamento<select value={payment} onChange={e => setPayment(e.target.value)}><option>PIX</option><option>Cartão</option><option>Dinheiro</option></select></label>
        <div className="counter-total"><span>Total</span><b>{money(total)}</b></div>
        <button className="counter-primary counter-finish" disabled={!selected.length || busy} onClick={() => void finishSale()}>{busy ? "Registrando…" : "Registrar venda"}</button>
      </aside>
    </div>
    {receipt && <div className="counter-receipt" id="counter-receipt"><h2>FRANGO SHOW ROTISSERIE</h2><p>Comprovante de venda no balcão<br/>Venda #{receipt.id}<br/>{new Date(receipt.created_at).toLocaleString("pt-BR")}</p><hr/>{receipt.items.map(item => <div key={item.product_id}><span>{item.quantity}× {item.name}</span><b>{money(Number(item.line_total))}</b></div>)}<hr/><p>Pagamento: {receipt.payment_method}</p><strong>TOTAL: {money(Number(receipt.total))}</strong><p>Obrigado pela preferência!</p></div>}
  </main>;
}
