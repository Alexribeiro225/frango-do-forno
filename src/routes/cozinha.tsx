import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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

  useEffect(() => { currentUser().then(setUser).finally(() => setChecked(true)); }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    try { setOrders(await listOrders()); setUpdatedAt(new Date().toLocaleTimeString("pt-BR")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os pedidos."); }
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
  function printOrder(id: number) {
    const target = document.getElementById("order-" + id);
    if (!target) return;
    document.body.classList.add("printing-kitchen-order");
    target.classList.add("print-current");
    const cleanup = () => {
      document.body.classList.remove("printing-kitchen-order");
      target.classList.remove("print-current");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
  }

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
      <div><span className="kitchen-mark"><ChefHat /></span><div><h1>Painel da cozinha</h1><p>Pedidos recebidos pelo site · Atualiza automaticamente a cada 10 segundos</p></div></div>
      <div className="kitchen-header-actions"><span className="kitchen-refresh-label">{updatedAt ? "Atualizado às " + updatedAt : "Carregando…"}</span><button onClick={() => void refresh()} aria-label="Atualizar pedidos"><RefreshCw size={17} /> Atualizar</button><button onClick={() => { signOut(); setUser(null); }}><LogOut size={17} /> Sair</button></div>
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
