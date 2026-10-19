import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import hero from "@/assets/hero.jpg";
import frango from "@/assets/frango.jpg";
import costela from "@/assets/costela.jpg";
import combo from "@/assets/combo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Frango Show Rotisserie | Frango Assado em Bauru" },
      { name: "description", content: "Frango assado, costela, joelho de porco, acompanhamentos e combos em Bauru. Monte seu pedido e envie pelo WhatsApp." },
      { property: "og:title", content: "Frango Show Rotisserie | Bauru" },
      { property: "og:description", content: "Frango assado e carnes no capricho. Peça pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const WHATS = "5514988085532";
const ADDRESS = "R. José Ferreira Leite, 2-05 - Parque Júlio Nóbrega, Bauru - SP, 17031-451";

type Item = { id: number; cat: string; name: string; price: number; desc: string; img: string };
const items: Item[] = [
  { id: 1, cat: "Aves", name: "Frango Tradicional", price: 50, img: frango, desc: "Frango inteiro assado, dourado e temperado." },
  { id: 2, cat: "Aves", name: "Frango Recheado", price: 57, img: frango, desc: "Recheio de bacon, calabresa, presunto, queijos, azeitonas, milho, ervilha e cenoura." },
  { id: 3, cat: "Bovinos", name: "Costela Minga Tradicional", price: 90, img: costela, desc: "Costela bovina assada devagar até ficar macia." },
  { id: 4, cat: "Bovinos", name: "Ponta de Peito", price: 90, img: costela, desc: "Ponta de peito no tempero da casa." },
  { id: 5, cat: "Suínos", name: "Joelho de Porco", price: 70, img: combo, desc: "Joelho seringado, carne rosada estilo tender." },
  { id: 6, cat: "Acompanhamentos", name: "Arroz à Grega (500g)", price: 25, img: combo, desc: "Arroz colorido com legumes, azeitona e uva passa." },
  { id: 7, cat: "Acompanhamentos", name: "Arroz Carreteiro (500g)", price: 25, img: combo, desc: "Com bacon, calabresa, carne seca, cebola e tomate." },
  { id: 8, cat: "Acompanhamentos", name: "Maionese de Legumes (500g)", price: 25, img: combo, desc: "Batata, cenoura, vagem, ovos, milho, ervilha e azeitonas." },
  { id: 9, cat: "Bebidas", name: "Coca-Cola 2 Litros", price: 15, img: combo, desc: "Bem gelada." },
  { id: 10, cat: "Bebidas", name: "Guaraná Antarctica 2 Litros", price: 10, img: combo, desc: "Bem gelado." },
  { id: 11, cat: "Combos", name: "Combo Frango", price: 80, img: frango, desc: "Frango assado + maionese 500g + Guaraná 2L." },
  { id: 12, cat: "Combos", name: "Combo Família", price: 100, img: combo, desc: "Frango assado + arroz à grega 500g + maionese 500g + Coca-Cola 2L." },
  { id: 13, cat: "Combos", name: "Combo Joelho de Porco", price: 125, img: combo, desc: "Joelho + maionese 500g + arroz à grega 500g + Guaraná 2L + molho barbecue." },
  { id: 14, cat: "Combos", name: "Combo Costela", price: 145, img: costela, desc: "Costela minga + arroz carreteiro 500g + maionese 500g + Coca-Cola 2L." },
];
const cats = ["Todos", "Combos", "Aves", "Bovinos", "Suínos", "Acompanhamentos", "Bebidas"];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Index() {
  const [cat, setCat] = useState("Todos");
  const [cart, setCart] = useState<Record<number, number>>({});
  const list = cat === "Todos" ? items : items.filter((i) => i.cat === cat);
  const lines = items.filter((i) => cart[i.id]);
  const total = useMemo(() => lines.reduce((s, i) => s + i.price * cart[i.id], 0), [lines, cart]);
  const add = (id: number, d: number) =>
    setCart((c) => {
      const n = { ...c, [id]: Math.max(0, (c[id] ?? 0) + d) };
      if (!n[id]) delete n[id];
      return n;
    });
  const order = () => {
    const txt = `Olá! Quero fazer um pedido:\n${lines.map((i) => `${cart[i.id]}x ${i.name} - ${brl(i.price * cart[i.id])}`).join("\n")}\nTotal: ${brl(total)}`;
    window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(txt)}`, "_blank");
  };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="font-display text-3xl tracking-wide text-primary">FRANGO <span className="text-accent">SHOW</span></span>
          <nav className="hidden gap-6 text-sm font-semibold uppercase text-muted-foreground sm:flex">
            <a href="#cardapio" className="hover:text-foreground">Cardápio</a>
            <a href="#visite" className="hover:text-foreground">Visite</a>
          </nav>
          <a href={`https://wa.me/${WHATS}`} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Pedir agora</a>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img src={hero} alt="Frangos assando na brasa" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 py-28 md:py-40">
          <p className="font-semibold uppercase tracking-widest text-accent">Rotisserie em Bauru</p>
          <h1 className="mt-3 max-w-xl text-6xl leading-none md:text-8xl">Seu almoço mais saboroso começa aqui.</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">Frangos, carnes e acompanhamentos feitos na hora para a sua mesa.</p>
          <div className="mt-8 flex gap-3">
            <a href="#cardapio" className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Ver cardápio</a>
            <a href={`https://wa.me/${WHATS}`} target="_blank" rel="noreferrer" className="rounded-full border border-accent px-6 py-3 font-bold text-accent">WhatsApp</a>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">★ 4,8 no Google</p>
        </div>
      </section>

      <section id="cardapio" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-5xl md:text-6xl">Cardápio</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{c}</button>
          ))}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((i) => (
            <article key={i.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <img src={i.img} alt={i.name} loading="lazy" width={816} height={816} className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">{i.cat}</p>
                <h3 className="mt-1 text-2xl">{i.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{i.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-bold">{brl(i.price)}</span>
                  {cart[i.id] ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => add(i.id, -1)} className="h-9 w-9 rounded-full bg-secondary font-bold">−</button>
                      <span className="font-bold">{cart[i.id]}</span>
                      <button onClick={() => add(i.id, 1)} className="h-9 w-9 rounded-full bg-primary font-bold text-primary-foreground">+</button>
                    </div>
                  ) : (
                    <button onClick={() => add(i.id, 1)} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Adicionar</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="visite" className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-5xl">Venha nos visitar</h2>
            <p className="mt-4 text-muted-foreground">{ADDRESS}</p>
            <ul className="mt-6 space-y-1 text-sm">
              <li className="flex justify-between border-b border-border py-2"><span>Segunda</span><span className="text-muted-foreground">Fechado</span></li>
              <li className="flex justify-between border-b border-border py-2"><span>Terça a Domingo</span><span>10:00 – 15:00</span></li>
            </ul>
            <div className="mt-6 flex gap-4 text-sm font-semibold text-accent">
              <a href="https://www.instagram.com/frangoshow.bauru" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://www.facebook.com/rotisseriefrangoshow" target="_blank" rel="noreferrer">Facebook</a>
            </div>
          </div>
          <iframe title="Mapa Frango Show" className="h-80 w-full rounded-xl border border-border" loading="lazy" src="https://www.google.com/maps?q=R.+Jos%C3%A9+Ferreira+Leite,+2-05+Parque+Julio+Nobrega+Bauru+SP&output=embed" />
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Frango Show Rotisserie · Bauru - SP</footer>

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <span className="font-semibold">{lines.reduce((s, i) => s + cart[i.id], 0)} itens · {brl(total)}</span>
            <button onClick={order} className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Enviar pedido no WhatsApp</button>
          </div>
        </div>
      )}
    </div>
  );
}
