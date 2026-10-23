export type Product = { id: number; category: string; name: string; price: number; description: string; image_url: string; is_popular: boolean; is_active: boolean };
export type Promo = { id: number; title: string; description: string; image_url: string | null; starts_at: string | null; ends_at: string | null; is_active: boolean };
export type Announcement = { id: number; title: string; body: string; image_url: string | null; is_active: boolean };

const url = import.meta.env["VITE_SUPABASE_URL"]?.replace(/\/$/, "");
const anon = import.meta.env["VITE_SUPABASE_ANON_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
export const configured = Boolean(url && anon);
const storageKey = "frango-show-admin-session";
type Session = { access_token: string; refresh_token: string; expires_at: number; user: { email?: string } };
const getSession = (): Session | null => {
  try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; }
};
const saveSession = (session: Session | null) => session ? localStorage.setItem(storageKey, JSON.stringify(session)) : localStorage.removeItem(storageKey);
async function authFetch(path: string, init: RequestInit = {}, token?: string) {
  if (!configured) throw new Error("Configure o Supabase para ativar o painel.");
  const response = await fetch(url + path, { ...init, headers: { apikey: anon!, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || "Não foi possível concluir a operação.");
  return data;
}
export async function signIn(email: string, password: string) {
  if (email.trim().toLowerCase() !== "conectstore.app@gmail.com") throw new Error("Este e-mail não tem acesso de superadministrador.");
  const data = await authFetch("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user };
  saveSession(session); return session.user;
}
export function signOut() { saveSession(null); }
async function token() {
  let session = getSession();
  if (!session) throw new Error("Entre novamente para continuar.");
  if (session.expires_at < Date.now() + 60_000) {
    const data = await authFetch("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
    session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user };
    saveSession(session);
  }
  if (session.user.email?.toLowerCase() !== "conectstore.app@gmail.com") throw new Error("Esta conta não tem acesso de superadministrador.");
  return session.access_token;
}
export async function currentUser() {
  const session = getSession();
  if (!session || session.user.email?.toLowerCase() !== "conectstore.app@gmail.com") return null;
  try { await token(); return session.user; } catch { saveSession(null); return null; }
}
async function rest(table: string, query = "", init: RequestInit = {}) {
  const access = await token();
  return authFetch(`/rest/v1/${table}${query}`, { ...init, headers: { Prefer: "return=representation", ...init.headers } }, access);
}
export async function loadPublicContent() {
  if (!configured) return null;
  try {
    const [products, promos, announcements] = await Promise.all([
      authFetch("/rest/v1/products?select=id,category,name,price,description,image_url,is_popular,is_active&is_active=eq.true&order=sort_order.asc"),
      authFetch("/rest/v1/promotions?select=id,title,description,image_url,starts_at,ends_at,is_active&is_active=eq.true"),
      authFetch("/rest/v1/announcements?select=id,title,body,image_url,is_active&is_active=eq.true"),
    ]);
    return { products: products as Product[], promos: promos as Promo[], announcements: announcements as Announcement[] };
  } catch { return null; }
}
export async function listRows(table: "products" | "promotions" | "announcements") { return rest(table, "?select=*&order=created_at.desc"); }
export async function saveRow(table: "products" | "promotions" | "announcements", row: Record<string, unknown>, id?: number) {
  return rest(table, id ? `?id=eq.${id}` : "", { method: id ? "PATCH" : "POST", body: JSON.stringify(row) });
}
export async function deleteRow(table: "products" | "promotions" | "announcements", id: number) {
  return rest(table, `?id=eq.${id}`, { method: "DELETE" });
}
export async function uploadImage(file: File) {
  const access = await token();
  const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const response = await fetch(`${url}/storage/v1/object/site-images/${path}`, { method: "POST", headers: { apikey: anon!, Authorization: `Bearer ${access}`, "Content-Type": file.type, "x-upsert": "false" }, body: file });
  if (!response.ok) throw new Error("Falha ao enviar imagem. Verifique o bucket e as permissões.");
  return `${url}/storage/v1/object/public/site-images/${path}`;
}
