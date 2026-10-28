import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ChefHat, Clock3, LogOut, Printer, RefreshCw } from "lucide-react";
import { configured, currentUser, listOrders, signIn, signOut, updateOrderStatus, type KitchenOrder } from "@/lib/cms";

export const Route = createFileRoute("/cozinha")({ component: Kitchen });

const money = (value: number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const statusLabel: Record<KitchenOrder["status"], string> = {
  new: "Novo", preparing: "Em preparo", ready: "Pronto", completed: "Concluído", cancelled: "Cancelado",
};
const nextStatus: Partial<Record<KitchenOrder["status"], KitchenOrder["status"]>> = {
  new: "preparing", preparing: "ready", ready: "completed",
};

function Kitchen() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [email, setEmail] = useState("conectstore.app@gmail.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [printQueue, setPrintQueue] = useState<number[]>([]);
  const [printPulse, setPrintPulse] = useState(0);
  const knownOrderIds = useRef<Set<number> | null>(null);
  const autoPrintRef = useRef(true);
  const printingRef = useRef(false);

  useEffect(() => { currentUser().then(setUser).finally(() => setChecked(true)); }, []);
  useEffect(() => {
    const enabled = localStorage.getItem("frango-kitchen-auto-print") !== "false";
    autoPrintRef.current = enabled;
    setAutoPrint(enabled);
  }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const latest = await listOrders();
      const known = knownOrderIds.current;
      const storedLastSeen = localStorage.getItem("frango-kitchen-last-seen-order-id");
      const maxId = latest.reduce((max, order) => Math.max(max, order.id), Number(storedLastSeen || 0));
      if (known === null) {
        const firstSeen = storedLastSeen === null ? [] : latest.filter(order => order.id > Number(storedLastSeen)).map(order => order.id);
        knownOrderIds.current = new Set(latest.map(order => order.id));
        if (autoPrintRef.current && firstSeen.length) setPrintQueue(queue => [...queue, ...firstSeen.sort((a, b) => a - b)]);
      } else {
        const incoming = latest.filter(order => !known.has(order.id)).map(order => order.id);
        latest.forEach(order => known.add(order.id));
        if (autoPrintRef.current && incoming.length) setPrintQueue(queue => [...queue, ...incoming.reverse()]);
      }
      if (maxId > 0) localStorage.setItem("frango-kitchen-last-seen-order-id", String(maxId));
      setOrders(latest); setUpdatedAt(new Date().toLocaleTimeString("pt-BR")); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os pedidos."); }
  }, [user]);
  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [user, refresh]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { setUser(await signIn(email, password)); setPassword(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }
  async function changeStatus(order: KitchenOrder, status: KitchenOrder["status"]) {
    try { await updateOrderStatus(order.id, status); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o pedido."); }
  }
  const printOrder = useCallback((id: number, onFinished?: () => void) => {
    if (printingRef.current) return false;
    const target = document.getElementById("order-" + id);
    if (!target) return false;
    printingRef.current = true;
    document.body.classList.add("printing-kitchen-order");
    target.classList.add("print-current");
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove("printing-kitchen-order");
      target.classList.remove("print-current");
      window.removeEventListener("afterprint", cleanup);
      printingRef.current = false;
      onFinished?.();
      setPrintPulse(pulse => pulse + 1);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
    return true;
  }, []);
  useEffect(() => {
    if (!user || !autoPrint || !printQueue.length || printingRef.current) return;
    const timer = window.setTimeout(() => {
      const started = printOrder(printQueue[0], () => setPrintQueue(queue => queue.slice(1)));
      if (!started) setPrintPulse(pulse => pulse + 1);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [user, autoPrint, printQueue, printPulse, printOrder]);

  if (!checked) return <main className="kitchen-page"><p>Verificando acesso…</p></main>;
  if (!user) return <main className="kitchen-page kitchen-login-wrap">
    <form className="kitchen-login" onSubmit={login}>
      <ChefHat size={34} />
      <h1>Cozinha</h1>
      <p>Entre com a conta administrativa para acessar os pedidos.</p>
      {!configured && <p className="kitchen-error">O banco ainda não está configurado neste site.</p>}
      <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
      <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p className="kitchen-error" role="alert">{error}</p>}
      <button className="kitchen-primary" disabled={busy || !configured}>{busy ? "Entrando…" : "Entrar"}</button>
    </form>
  </main>;

  return <main className="kitchen-page">
    <header className="kitchen-header">
      <div><span className="kitchen-mark"><ChefHat /></span><div><h1>Painel da cozinha</h1><p>Pedidos recebidos pelo site · Atualiza a cada 10 segundos · Impressão automática {autoPrint ? "ligada" : "desligada"}</p></div></div>
      <div className="kitchen-header-actions"><span className="kitchen-refresh-label">{updatedAt ? "Atualizado às " + updatedAt : "Carregando…"}</span><label className="kitchen-auto-print"><input type="checkbox" checked={autoPrint} onChange={event => { const enabled = event.currentTarget.checked; autoPrintRef.current = enabled; setAutoPrint(enabled); localStorage.setItem("frango-kitchen-auto-print", String(enabled)); if (!enabled) setPrintQueue([]); }} /><Printer size={16} /> Impressão automática</label><button onClick={() => void refresh()} aria-label="Atualizar pedidos"><RefreshCw size={17} /> Atualizar</button><button onClick={() => { signOut(); setUser(null); }}><LogOut size={17} /> Sair</button></div>
    </header>
    {error && <p className="kitchen-error kitchen-alert" role="alert">{error}</p>}
    <section className="kitchen-orders" aria-label="Lista de pedidos">
      {orders.length === 0 ? <div className="kitchen-empty"><ChefHat size={36} /><b>Nenhum pedido recebido</b><span>Quando um cliente finalizar a compra, o pedido aparecerá aqui.</span></div> :
      orders.map(order => <article className="kitchen-order" id={"order-" + order.id} key={order.id}>
        <div className="kitchen-order-top"><div><span className="kitchen-order-number">Pedido #{order.id}</span><span className={"kitchen-status status-" + order.status}>{statusLabel[order.status]}</span></div><time><Clock3 size={15} />{time(order.created_at)}</time></div>
        <div className="kitchen-order-customer"><b>{order.customer_name}</b><a href={"tel:" + order.customer_phone}>{order.customer_phone}</a><span>{order.fulfillment === "delivery" ? "🛵 Delivery" : "🏠 Retirada"} · {order.payment_method}</span></div>
        {order.fulfillment === "delivery" && <div className="kitchen-address"><b>Endereço</b><span>{[order.address["street"], order.address["number"] && "nº " + order.address["number"], order.address["neighborhood"], order.address["cep"]].filter(Boolean).join(", ")}</span>{order.address["complement"] && <span>Complemento: {order.address["complement"]}</span>}{order.address["reference"] && <span>Referência: {order.address["reference"]}</span>}</div>}
        <div className="kitchen-items"><b>Itens</b>{(order.items || []).map((item,index) => <div className="kitchen-item" key={item.product_id + "-" + index}><span><strong>{item.quantity}×</strong> {item.name}</span><b>{money(Number(item.line_total))}</b></div>)}</div>
        {order.notes && <div className="kitchen-notes"><b>Observação:</b> {order.notes}</div>}
        <div className="kitchen-total"><span>Subtotal</span><b>{money(Number(order.subtotal))}</b><span>Entrega</span><b>{order.delivery_fee === null ? "A combinar" : money(Number(order.delivery_fee))}</b><strong>Total</strong><strong>{money(Number(order.total))}{order.delivery_fee === null ? " + entrega" : ""}</strong></div>
        <div className="kitchen-order-actions"><button className="kitchen-print" onClick={() => printOrder(order.id)}><Printer size={17} /> Imprimir</button>{nextStatus[order.status] && <button className="kitchen-primary" onClick={() => void changeStatus(order, nextStatus[order.status]!)}>Marcar como {statusLabel[nextStatus[order.status]!]}</button>}{order.status === "new" && <button className="kitchen-cancel" onClick={() => void changeStatus(order,"cancelled")}>Cancelar</button>}</div>
      </article>)}
    </section>
  </main>;
}
