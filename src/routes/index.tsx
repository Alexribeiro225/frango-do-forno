import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createOrder, loadPublicContent, type Product as CmsProduct } from "@/lib/cms";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Instagram, MapPin, Menu,
  Minus, Plus, Search, ShoppingBag, ShoppingCart, Star, Truck, X,
} from "lucide-react";




import joelhoPorco from "@/assets/joelho_porco.jpg";
import arrozGrega from "@/assets/arroz_grega.jpg";

import maioneseLegumes from "@/assets/maionese_legumes.jpg";


import comboFamilia from "@/assets/combo_familia.jpg";
import comboJoelho from "@/assets/combo_joelho.jpg";
import cocaColaImage from "@/assets/coca_cola.jpg";
import guaranaImage from "@/assets/guarana.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Frango Show Rotisserie | Frango Assado em Bauru" },
      { name: "description", content: "Frangos, carnes, acompanhamentos e combos preparados com carinho em Bauru. Faça seu pedido pelo WhatsApp." },
      { property: "og:title", content: "Frango Show Rotisserie | Bauru" },
      { property: "og:description", content: "Frango assado e carnes no capricho. Peça pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const hero = "/images/hero-frango.jpeg";
const costela = "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/a02c5299fe12f1343615fcb6966c76fcede43c357ad7dc6c89b85f283c3e9a6b.jpeg";
const frango = "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/463224a57ccd4aaefe199615cc63a71e1091764fb868e3533d912a19a17d074c.jpeg";
const cocaCola = cocaColaImage;
const pontaPeito = "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/a02c5299fe12f1343615fcb6966c76fcede43c357ad7dc6c89b85f283c3e9a6b.jpeg";
const guarana = guaranaImage;
const arrozCarreteiro = "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/08694d940cd40ea86e1e82344c9514da41aa11216aff82cb0df420ea8c8d5221.jpeg";
const frangoRecheado = "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/c2365bcd03242b43eef51af5455033b37fbbd75516068dcd0c5517a10aa605a9.jpeg";
const WHATS = "5514988085532";
const ADDRESS = "R. José Ferreira Leite, 2-05 - Parque Júlio Nóbrega, Bauru - SP, 17031-451";
const INSTAGRAM = "https://www.instagram.com/frangoshow.bauru/";
const MAPS = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ADDRESS);
const comboFrangoImg = "/images/combo-frango.jpeg";
const comboCostelaImg = "/images/combo-costela.jpeg";
const kitchenImg = "/images/cozinha.jpeg";
const logoImg = "/images/frango-show-logo.webp";

type Item = { id: number; cat: string; name: string; price: number; desc: string; img: string; popular?: boolean; stock_quantity?: number | null };
const items: Item[] = [
  { id: 1, cat: "Aves", name: "Frango Tradicional", price: 50, img: frango, desc: "Frango assado preparado para deixar sua refeição ainda mais saborosa.", popular: true },
  { id: 2, cat: "Aves", name: "Frango Recheado", price: 57, img: frangoRecheado, desc: "Frango recheado com cenoura, bacon, azeitonas pretas e verdes, linguiça calabresa, milho, ervilha, queijo provolone, queijo mussarela e presunto.", popular: true },
  { id: 3, cat: "Bovinos", name: "Costela Minga Tradicional", price: 90, img: costela, desc: "Costela bovina assada lentamente, macia e suculenta.", popular: true },
  { id: 4, cat: "Bovinos", name: "Ponta de Peito", price: 90, img: pontaPeito, desc: "Ponta de peito assada no tempero especial da casa." },
  { id: 5, cat: "Suínos", name: "Joelho de Porco", price: 70, img: joelhoPorco, desc: "Joelho seringado (carne rosada tipo tender).", popular: true },
  { id: 6, cat: "Acompanhamentos", name: "Arroz à Grega (500g)", price: 25, img: arrozGrega, desc: "Arroz temperado com mix de pimentões, azeitona preta, vagem, milho, ervilha, cenoura e uva passa. Porção de 500g." },
  { id: 7, cat: "Acompanhamentos", name: "Arroz Carreteiro (500g)", price: 25, img: arrozCarreteiro, desc: "Arroz temperado com bacon, calabresa, cebola, tomate e carne seca. Porção de 500g." },
  { id: 8, cat: "Acompanhamentos", name: "Maionese de Legumes (500g)", price: 25, img: maioneseLegumes, desc: "Salada com maionese Hellmann's, batata, cenoura, vagem, ovos cozidos, azeitonas fatiadas, milho e ervilhas.", popular: true },
  { id: 9, cat: "Bebidas", name: "Coca-Cola 2 Litros", price: 15, img: cocaCola, desc: "Refrigerante Coca-Cola 2 litros gelado." },
  { id: 10, cat: "Bebidas", name: "Guaraná Antárctica 2 Litros", price: 10, img: guarana, desc: "Refrigerante Guaraná Antárctica 2 litros gelado." },
  { id: 11, cat: "Combos", name: "Combo Família", price: 100, img: comboFamilia, desc: "01 Frango assado + 01 Arroz à grega 500g + 01 Maionese 500g + 01 Coca Cola 2 litros.", popular: true },
  { id: 12, cat: "Combos", name: "Combo Frango", price: 80, img: comboFrangoImg, desc: "01 Frango assado + 500g de maionese de legumes + 01 Guaraná Antárctica de 2 litros.", popular: true },
  { id: 13, cat: "Combos", name: "Combo Joelho de Porco", price: 125, img: comboJoelho, desc: "01 Joelho de porco + 500g de maionese de legumes + 500g de arroz à grega + 01 Guaraná Antárctica de 2 litros. Acompanha molho Barbecue.", popular: true },
  { id: 14, cat: "Combos", name: "Combo Costela", price: 145, img: comboCostelaImg, desc: "01 Costela minga assada + 500g de arroz carreteiro + 500g de maionese + 01 Coca Cola de 2 litros.", popular: true },
];
const categories = ["Todos", "Aves", "Bovinos", "Suínos", "Acompanhamentos", "Sobremesas", "Bebidas", "Combos"];
const combos = items.filter((item) => item.cat === "Combos");
const favoriteOrder = [1, 3, 5, 2];
const favorites = favoriteOrder
  .map((id) => items.find((item) => item.id === id))
  .filter((item): item is Item => item !== undefined);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const waLink = (text = "") => `https://wa.me/${WHATS}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

function openStatus() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = value["weekday"];
  const time = Number(value["hour"]) * 60 + Number(value["minute"]);
  return day !== "Mon" && time >= 600 && time < 900;
}

function Index() {
  const [catalog, setCatalog] = useState<Item[]>(items);
  const [cmsPromos, setCmsPromos] = useState<Array<{id:number;title:string;description:string;image_url:string|null}>>([]);
  const [cmsAnnouncements, setCmsAnnouncements] = useState<Array<{id:number;title:string;body:string;image_url:string|null}>>([]);
  useEffect(() => { loadPublicContent().then(content => { if (!content) return; if (content.products.length) setCatalog(content.products.map((p: CmsProduct) => ({id:p.id,cat:p.category,name:p.name,price:Number(p.price),desc:p.description,img:p.image_url,popular:p.is_popular,stock_quantity:p.stock_quantity}))); setCmsPromos(content.promos); setCmsAnnouncements(content.announcements); }); }, []);
  const combos = catalog.filter(item => item.cat === "Combos");
  const favoriteOrder = [1, 3, 5, 2];
  const favorites = favoriteOrder.map(id => catalog.find(item => item.id === id)).filter((item): item is Item => item !== undefined);
  const [cat, setCat] = useState("Todos");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState("PIX");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [whatsappFallback, setWhatsappFallback] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen] = useState(openStatus);
  const shown = useMemo(() => catalog.filter((item) =>
    (cat === "Todos" || item.cat === cat) && item.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
  ), [cat, search, catalog]);
  const lines = catalog.filter((item) => (cart[item.id] ?? 0) > 0);
  const total = lines.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);
  const count = lines.reduce((sum, item) => sum + (cart[item.id] ?? 0), 0);
  const openCheckout = () => {
    const hasItems = lines.length > 0;
    setCheckout(hasItems);
    setWhatsappFallback("");
    setOrderError("");
    setCartOpen(true);
  };
  const quantityFor = (id: number) => quantities[id] ?? 1;
  const changeQuantity = (id: number, amount: number) => {
    const item = catalog.find(product => product.id === id);
    const remaining = item?.stock_quantity == null ? 99 : Math.min(99, Math.max(1, item.stock_quantity - (cart[id] ?? 0)));
    setQuantities(current => ({ ...current, [id]: Math.min(remaining, Math.max(1, (current[id] ?? 1) + amount)) }));
  };
  const add = (id: number, amount: number) => setCart(current => {
    const item = catalog.find(product => product.id === id);
    const maximum = item?.stock_quantity == null ? 99 : Math.min(99, item.stock_quantity);
    const quantity = Math.min(maximum, Math.max(0, (current[id] ?? 0) + amount));
    const next = { ...current, [id]: quantity };
    if (!quantity) delete next[id];
    return next;
  });
  const order = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lines.length || orderBusy) return;
    setOrderError(""); setWhatsappFallback("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("customerName") ?? "").trim();
    const phone = String(form.get("customerPhone") ?? "").trim();
    const notes = String(form.get("orderNotes") ?? "").trim();
    const address = fulfillment === "delivery" ? {
      street: String(form.get("address") ?? "").trim(), number: String(form.get("number") ?? "").trim(),
      cep: String(form.get("cep") ?? "").trim(), neighborhood: String(form.get("neighborhood") ?? "").trim(),
      complement: String(form.get("complement") ?? "").trim(), reference: String(form.get("reference") ?? "").trim(),
    } : {};
    const popup = window.open("about:blank", "_blank");
    setOrderBusy(true);
    try {
      const saved = await createOrder({
        customer_name: name, customer_phone: phone, fulfillment, address, payment_method: payment, notes,
        items: lines.map(item => ({ product_id: item.id, quantity: cart[item.id] ?? 0 })),
      });
      const deliveryDetails = fulfillment === "delivery" ? [
        "Endereço: " + address.street + ", nº " + address.number,
        address.cep ? "CEP: " + address.cep : "",
        address.neighborhood ? "Bairro: " + address.neighborhood : "",
        address.complement ? "Complemento: " + address.complement : "",
        address.reference ? "Ponto de referência: " + address.reference : "",
      ].filter(Boolean) : [];
      const orderLines = saved.items.map(item => item.quantity + "x " + item.name + " — " + brl(Number(item.line_total)));
      const message = [
        "Olá! Pedido #" + saved.order_number, "",
        "Modalidade: " + (fulfillment === "delivery" ? "Delivery" : "Retirada"),
        "Nome: " + name, "Telefone: " + phone, ...deliveryDetails, "Forma de pagamento: " + payment,
        notes ? "Observação: " + notes : "", "", "Itens do pedido:", ...orderLines, "",
        "Subtotal: " + brl(Number(saved.subtotal)),
        "Taxa de entrega: " + (saved.delivery_fee === null ? "A combinar" : brl(Number(saved.delivery_fee))),
        "Total: " + brl(Number(saved.total)) + (saved.delivery_fee === null ? " + taxa de entrega a combinar" : ""),
      ].filter(line => line !== "").join("\n");
      const link = waLink(message);
      if (popup) { popup.location.href = link; setCart({}); setCartOpen(false); setCheckout(false); }
      else { setWhatsappFallback(link); }
    } catch (e) {
      popup?.close();
      setOrderError(e instanceof Error ? e.message : "Não foi possível salvar o pedido. Tente novamente.");
    } finally { setOrderBusy(false); }
  };

  const nav = [
    ["Cardápio", "#cardapio"], ["Combos", "#combos"], ["Sobre", "#sobre"],
    ["Avaliações", "#avaliacoes"], ["Localização", "#visite"],
  ];
  const ProductCard = ({ item, favorite = false }: { item: Item; favorite?: boolean }) => (
    <article className={`product-card ${favorite ? "favorite-card" : ""}`}>
      <div className="product-photo">
        <img src={item.img} alt={item.name} loading="lazy" />
        {item.popular && !favorite && <span className="popular-badge"><Star size={13} fill="currentColor" /> Mais pedido</span>}
      </div>
      <div className="product-info">
        {!favorite && <span className="product-category">{item.cat}</span>}
        <h3>{item.name}</h3>
        {!favorite && <p className="product-description">{item.desc}</p>}
        <div className="product-bottom">
          <strong className="price">{brl(item.price)}</strong>
          {item.stock_quantity === 0 ? <span className="product-out-of-stock">Esgotado</span> : favorite ? <button className="button button-primary button-small" disabled={item.stock_quantity != null && (cart[item.id] ?? 0) >= item.stock_quantity} onClick={() => add(item.id, 1)}>{item.stock_quantity != null && (cart[item.id] ?? 0) >= item.stock_quantity ? "No carrinho" : "Pedir agora"} <ArrowRight size={15} /></button> :
            <div className="product-action">
              <div className="quantity-control" aria-label={`Quantidade de ${item.name}`}>
                <button aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus size={15} /></button>
                <span>{quantityFor(item.id)}</span>
                <button aria-label={`Aumentar quantidade de ${item.name}`} disabled={item.stock_quantity != null && quantityFor(item.id) >= Math.max(1, item.stock_quantity - (cart[item.id] ?? 0))} onClick={() => changeQuantity(item.id, 1)}><Plus size={15} /></button>
              </div>
              <button className="button button-primary button-small" disabled={item.stock_quantity != null && (cart[item.id] ?? 0) >= item.stock_quantity} onClick={() => add(item.id, quantityFor(item.id))}>{item.stock_quantity != null && (cart[item.id] ?? 0) >= item.stock_quantity ? "No carrinho" : "Adicionar"}</button>
            </div>
          }
        </div>
      </div>
    </article>
  );

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="Frango Show Rotisserie, início">
            <img src={logoImg} alt="" className="brand-logo" />
            <span><b>FRANGO SHOW</b><small>ROTISSERIE · BAURU</small></span>
          </a>
          <nav className="desktop-nav" aria-label="Navegação principal">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
          <div className="header-actions">
            <button type="button" className="button button-primary header-order" onClick={openCheckout}>{count > 0 ? "Finalizar pedido" : "Pedir agora"}</button>
            <button className="cart-button" aria-label={`Abrir carrinho, ${count} itens`} onClick={() => setCartOpen(true)}>
              <ShoppingCart size={20} /><span>Carrinho</span>{count > 0 && <b>{count}</b>}
            </button>
            <button className="menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav className="mobile-nav">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
      </header>

      <main>
        <section className="hero-section" id="inicio">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow"><span>🍗</span> Feito com sabor e qualidade</span>
              <h1>Seu almoço mais saboroso <em>começa aqui.</em></h1>
              <p>Frangos, carnes, acompanhamentos e muito sabor preparados para você.</p>
              <div className="hero-buttons">
                <a className="button button-primary" href="#cardapio">Fazer pedido <ArrowRight size={17} /></a>
                <a className="button button-outline" href="#cardapio">Ver cardápio <ChevronDown size={16} /></a>
              </div>
              <div className="hero-highlights">
                <span><Star size={17} fill="currentColor" /><b>4,8 no Google</b></span>
                <i />
                <span><Truck size={18} /><b>Entrega rápida em Bauru-SP</b></span>
              </div>
            </div>
            <div className="hero-image-wrap"><img src={hero} alt="Frango assado dourado da Frango Show" /><div className="hero-image-caption"><span>Feito com carinho, servido quentinho</span><b>Desde o primeiro pedaço 🍗</b></div></div>
          </div>
        </section>

        {(cmsPromos.length > 0 || cmsAnnouncements.length > 0) && <section className="cms-banners section-wrap" aria-label="Avisos e promoções">{cmsAnnouncements.map(a => <article className="cms-banner" key={"a"+a.id}>{a.image_url && <img src={a.image_url} alt="" />}<div><b>{a.title}</b><p>{a.body}</p></div></article>)}{cmsPromos.map(p => <article className="cms-banner promo-banner" key={"p"+p.id}>{p.image_url && <img src={p.image_url} alt="" />}<div><b>{p.title}</b><p>{p.description}</p></div></article>)}</section>}
        <section className="menu-section section-wrap" id="cardapio">
          <div className="section-heading">
            <span className="section-kicker">Sabor de verdade em cada escolha</span>
            <h2>Escolha seu favorito <span>🍗</span></h2>
            <p>Monte seu pedido e finalize pelo WhatsApp em poucos cliques.</p>
          </div>
          <div className="catalog-tools">
            <label className="search-box"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no cardápio..." aria-label="Buscar produtos pelo nome" />{search && <button aria-label="Limpar busca" onClick={() => setSearch("")}><X size={16} /></button>}</label>
            <div className="category-list" role="group" aria-label="Filtrar por categoria">{categories.map((category) =>
              <button key={category} className={cat === category ? "category-chip active" : "category-chip"} onClick={() => setCat(category)}>{category}</button>
            )}</div>
          </div>
          <div className="product-grid">{shown.map((item) => <ProductCard key={item.id} item={item} />)}</div>
          {shown.length === 0 && <div className="empty-results">Não encontramos produtos com esse nome. Tente outra busca.</div>}
        </section>

        <section className="combos-section" id="combos">
          <div className="section-wrap">
            <div className="section-heading section-heading-dark">
              <span className="section-kicker">Mais comida, mais economia</span>
              <h2>Combos que valem a pena <span>🔥</span></h2>
              <p>Combinações especiais para aproveitar com quem você ama.</p>
            </div>
            <div className="product-grid combo-grid">{combos.map((item) => <ProductCard key={item.id} item={item} />)}</div>
          </div>
        </section>

        <section className="favorites-section section-wrap" id="favoritos">
          <div className="section-heading section-heading-row"><div><span className="section-kicker">Campeões de pedidos</span><h2>Os favoritos da casa</h2></div><a href="#cardapio" className="text-link">Ver cardápio completo <ArrowRight size={16} /></a></div>
          <div className="product-grid favorites-grid">{favorites.map((item) => <ProductCard key={item.id} item={item} favorite />)}</div>
        </section>

        <section className="about-section" id="sobre">
          <div className="about-inner section-wrap">
            <div className="about-image"><img src={kitchenImg} alt="Cozinha da Frango Show Rotisserie" loading="lazy" /><span>Comida feita com carinho</span></div>
            <div className="about-copy">
              <span className="section-kicker">Tradição que dá gosto</span>
              <h2>Mais sabor para a sua mesa.</h2>
              <p>Na Frango Show Rotisserie, cada frango é preparado com capricho, tempero especial e aquele sabor de comida feita com carinho. Qualidade no preparo, praticidade na entrega e um atendimento que trata você como família.</p>
              <div className="benefit-grid">{["Qualidade no preparo", "Sabor de verdade", "Praticidade na entrega", "Atendimento próximo"].map((benefit) => <span key={benefit}><Check size={17} />{benefit}</span>)}</div>
              <a href={waLink()} target="_blank" rel="noreferrer" className="button button-primary">Faça seu pedido <ArrowRight size={17} /></a>
            </div>
          </div>
        </section>

        <section className="reviews-section section-wrap" id="avaliacoes">
          <div className="section-heading">
            <span className="section-kicker">Quem prova, recomenda</span>
            <h2>O que nossos clientes dizem</h2>
            <div className="google-rating"><span>★★★★★</span><b>4,8 no Google</b></div>
          </div>
          <div className="review-grid">{[
            ["O frango recheado é maravilhoso! Entrega rápida e tudo muito saboroso.", "Mariana S."],
            ["Melhor rotisserie de Bauru. Peço todo domingo pela família toda.", "Carlos Eduardo"],
            ["Atendimento ótimo pelo WhatsApp e comida sempre quentinha. Recomendo!", "Juliana P."],
            ["Sabor de comida caseira, tempero perfeito. Virei cliente fiel.", "Roberto A."],
          ].map(([quote, author]) => <article className="review-card" key={author}><span className="review-stars">★★★★★</span><p>“{quote}”</p><b>{author}</b></article>)}</div>
        </section>

        <section className="instagram-section" id="instagram">
          <div className="section-wrap">
            <div className="section-heading section-heading-row"><div><span className="section-kicker">Um pouquinho do nosso dia a dia</span><h2>Siga a Frango Show</h2></div><a href={INSTAGRAM} target="_blank" rel="noreferrer" className="button button-outline"><Instagram size={17} /> Seguir no Instagram</a></div>
            <div className="instagram-grid">{[
              "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/463224a57ccd4aaefe199615cc63a71e1091764fb868e3533d912a19a17d074c.jpeg",
              "https://static.prod-images.emergentagent.com/jobs/5d4248a5-245c-4546-ad2d-dc6d39306348/images/c2365bcd03242b43eef51af5455033b37fbbd75516068dcd0c5517a10aa605a9.jpeg",
              "/images/instagram-3.jpeg",
              "/images/instagram-4.jpeg",
            ].map((src, index) => <a key={src} href={INSTAGRAM} target="_blank" rel="noreferrer" aria-label={`Ver publicação ${index + 1} no Instagram`}><img src={src} alt={`Comida da Frango Show, publicação ${index + 1}`} loading="lazy" /></a>)}</div>
          </div>
        </section>

        <section className="visit-section" id="visite">
          <div className="section-wrap visit-inner">
            <div className="visit-copy">
              <span className="section-kicker">Estamos esperando por você</span>
              <h2>Venha nos visitar</h2>
              <p className="visit-address"><MapPin size={20} />{ADDRESS}</p>
              <div className="open-indicator"><span className={isOpen ? "status-dot open" : "status-dot"} />{isOpen ? "Aberto agora" : "Fechado agora"}</div>
              <div className="hours"><div><Clock3 size={18} /><b>Horário de funcionamento</b></div><p><span>Segunda-feira</span><strong>Fechado</strong></p><p><span>Terça a domingo</span><strong>10:00 às 15:00</strong></p></div>
              <a href={MAPS} target="_blank" rel="noreferrer" className="button button-primary">Abrir no Google Maps <ArrowRight size={17} /></a>
            </div>
            <iframe title="Localização da Frango Show Rotisserie em Bauru" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="map-frame" src={`https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`} />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner section-wrap">
          <div className="footer-brand"><a className="brand brand-light" href="#inicio"><img src={logoImg} alt="" className="brand-logo" /><span><b>FRANGO SHOW</b><small>ROTISSERIE · BAURU</small></span></a><p>O sabor de comida feita com carinho, direto para a sua mesa.</p></div>
          <div className="footer-nav"><b>Navegue</b>{[...nav.slice(0, 3), ["Favoritos", "#favoritos"], ["Instagram", "#instagram"]].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div>
          <div className="footer-contact"><b>Fale com a gente</b><span>{ADDRESS}</span><a href={waLink()} target="_blank" rel="noreferrer">WhatsApp</a><a href={INSTAGRAM} target="_blank" rel="noreferrer">Instagram</a></div>
        </div>
        <div className="footer-bottom section-wrap">© {new Date().getFullYear()} Frango Show Rotisserie · Bauru - SP</div>
      </footer>

      {count > 0 && <div className="cart-summary"><div><ShoppingBag size={19} /><b>{count} {count === 1 ? "item" : "itens"}</b><span>· {brl(total)}</span></div><button className="button button-primary" onClick={() => setCartOpen(true)}>Ver carrinho <ArrowRight size={16} /></button></div>}
      {cartOpen && <div className="cart-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) { setCartOpen(false); setCheckout(false); } }}>
        <aside className="cart-panel" role="dialog" aria-modal="true" aria-label={checkout ? "Finalizar pedido" : "Seu carrinho"}>
          <div className="cart-heading">
            <div className="cart-heading-title">
              {checkout && <button className="cart-back-button" type="button" aria-label="Voltar ao carrinho" onClick={() => setCheckout(false)}><ArrowLeft size={22} /></button>}
              <ShoppingBag className="checkout-title-icon" size={22} />
              <h2>{checkout ? "Finalizar Pedido" : "Carrinho"}</h2>
            </div>
            <button aria-label="Fechar carrinho" onClick={() => { setCartOpen(false); setCheckout(false); }}><X /></button>
          </div>
          {lines.length ? checkout ? (
            <form className="checkout-form" onSubmit={order}>
              <div className="checkout-fields">
                <div className="fulfillment-options" role="group" aria-label="Forma de recebimento">
                  <button type="button" className={fulfillment === "delivery" ? "fulfillment-option active" : "fulfillment-option"} aria-pressed={fulfillment === "delivery"} onClick={() => setFulfillment("delivery")}>🛵 Delivery</button>
                  <button type="button" className={fulfillment === "pickup" ? "fulfillment-option active" : "fulfillment-option"} aria-pressed={fulfillment === "pickup"} onClick={() => setFulfillment("pickup")}>🏠 Retirada</button>
                </div>
                <input type="hidden" name="fulfillment" value={fulfillment} />
                <label className="checkout-field">Nome *
                  <input name="customerName" autoComplete="name" required />
                </label>
                <label className="checkout-field">Telefone *
                  <input name="customerPhone" type="tel" autoComplete="tel" placeholder="(14) 9...." required />
                </label>
                {fulfillment === "delivery" && <>
                  <div className="checkout-two-col">
                    <label className="checkout-field">CEP
                      <input name="cep" inputMode="numeric" autoComplete="postal-code" />
                    </label>
                    <label className="checkout-field">Número *
                      <input name="number" inputMode="numeric" required />
                    </label>
                  </div>
                  <label className="checkout-field">Endereço *
                    <input name="address" autoComplete="street-address" required />
                  </label>
                  <div className="checkout-two-col">
                    <label className="checkout-field">Bairro
                      <input name="neighborhood" autoComplete="address-level3" />
                    </label>
                    <label className="checkout-field">Complemento
                      <input name="complement" />
                    </label>
                  </div>
                  <label className="checkout-field">Ponto de referência
                    <input name="reference" />
                  </label>
                </>}
                <fieldset className="payment-fieldset">
                  <legend>Forma de pagamento</legend>
                  <div className="payment-options" role="group" aria-label="Forma de pagamento">
                    {["PIX", "Cartão", "Dinheiro"].map((option) =>
                      <button key={option} type="button" className={payment === option ? "payment-option active" : "payment-option"} aria-pressed={payment === option} onClick={() => setPayment(option)}>{option}</button>
                    )}
                  </div>
                </fieldset>
                <label className="checkout-field">Observação do pedido
                  <textarea name="orderNotes" rows={3} placeholder="Ex.: entregar depois das 12h" />
                </label>
              </div>
              <div className="checkout-footer">
                <div className="checkout-totals">
                  <p><span>Subtotal</span><b>{brl(total)}</b></p>
                  <p><span>Taxa de entrega</span><b>{fulfillment === "delivery" ? "A combinar" : "R$ 0,00"}</b></p>
                  <p className="checkout-grand-total"><strong>Total</strong><strong>{brl(total)}</strong></p>
                </div>
                {orderError && <p className="checkout-error" role="alert">{orderError}</p>}{whatsappFallback && <div className="checkout-success" role="status"><b>Pedido registrado!</b><a href={whatsappFallback} target="_blank" rel="noreferrer">Continuar para o WhatsApp</a></div>}<button className="button checkout-whatsapp" type="submit" disabled={orderBusy || Boolean(whatsappFallback)}>{orderBusy ? "Registrando pedido..." : whatsappFallback ? "Pedido registrado" : "Finalizar pelo WhatsApp"}</button>
              </div>
            </form>
          ) : (
            <>
              <div className="cart-lines">{lines.map((item) => <div className="cart-line" key={item.id}><img src={item.img} alt="" /><div className="cart-line-copy"><b>{item.name}</b><span>{brl(item.price)}</span><div className="quantity-control"><button aria-label="Remover uma unidade" onClick={() => add(item.id, -1)}><Minus size={14} /></button><span>{cart[item.id]}</span><button aria-label="Adicionar uma unidade" disabled={item.stock_quantity != null && (cart[item.id] ?? 0) >= item.stock_quantity} onClick={() => add(item.id, 1)}><Plus size={14} /></button></div></div><strong>{brl(item.price * (cart[item.id] ?? 0))}</strong></div>)}</div>
              <div className="cart-total"><span>Total</span><b>{brl(total)}</b></div>
              <button className="button button-primary checkout-button" disabled={count === 0} onClick={() => { if (count > 0) setCheckout(true); }}>Continuar para finalizar <ArrowRight size={17} /></button>
            </>
          ) : (
            <div className="cart-empty"><ShoppingBag size={36} /><b>Seu carrinho está vazio</b><p>Escolha seus pratos favoritos no cardápio.</p><button className="button button-primary" onClick={() => { setCartOpen(false); document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth" }); }}>Ver cardápio</button></div>
          )}
        </aside>
      </div>
      }
    </div>
  );
}
