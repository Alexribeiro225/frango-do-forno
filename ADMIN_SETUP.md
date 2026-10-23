# Painel do Frango Show

O painel administrativo fica em `/admin`. Ele usa Supabase Auth, Postgres com RLS e o bucket de imagens `site-images`.

## Configuração única

1. Crie um projeto em [supabase.com](https://supabase.com/) e abra o **SQL Editor**.
2. Execute o conteúdo de `supabase/migrations/20261023130000_admin_cms.sql`.
3. Em **Authentication → Users**, crie um usuário para `conectstore.app@gmail.com` com uma senha forte. Não compartilhe essa senha.
4. Em **Project Settings → API**, copie a Project URL e a chave pública **anon/publishable**. Nunca coloque a chave `service_role` no site.
5. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do deploy e publique o site.

Sem essas variáveis, o site continua exibindo o catálogo atual e `/admin` mostra a orientação de configuração. Depois de conectado, produtos ativos gerenciados pelo painel serão exibidos na loja. A política do banco restringe alterações à conta autenticada `conectstore.app@gmail.com`; a checagem no navegador serve apenas como conveniência, a proteção real é a política RLS.

O repositório inclui `.env.example` como modelo. Não envie senhas nem chaves privadas por chat ou commit.
