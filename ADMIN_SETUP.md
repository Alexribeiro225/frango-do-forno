# Painel administrativo — Frango Show

O painel está em /admin. O banco Supabase gerenciado pelo Lovable já foi habilitado, as tabelas e permissões foram aplicadas e os 14 produtos atuais foram carregados. O bucket público de imagens também foi criado, com gravação restrita ao superadministrador.

## O que falta para entrar no painel

1. No projeto Lovable, abra a área Cloud/Database e crie um usuário em Authentication para conectstore.app@gmail.com. Defina a senha diretamente no painel, sem compartilhá-la por chat.
2. Confirme na configuração do projeto se as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão disponíveis para a aplicação. Se não estiverem, adicione a Project URL e a chave pública anon/publishable do Supabase como variáveis de ambiente do site e publique novamente.
3. Acesse https://frango-do-forno.lovable.app/admin e faça login.

A lista de produtos e imagens iniciais já está no banco. Depois do login, você pode cadastrar/editar produtos, publicar promoções e avisos e enviar imagens pelo painel.

## Segurança

As alterações são protegidas por políticas RLS do banco e só a conta conectstore.app@gmail.com pode escrever. A chave anon/publishable é pública e pode ser usada no navegador. Nunca exponha service_role, senha do banco ou senha do usuário em código ou no GitHub.

Arquivos SQL e configuração mantidos no GitHub:
- supabase/migrations/20261023130000_admin_cms.sql
- supabase/migrations/20261023133000_seed_catalog.sql
- .env.example
