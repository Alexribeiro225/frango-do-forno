# Configuração inicial do SaaS

Esta branch prepara o banco para um produto SaaS de uma única loja: o admin master continua podendo prestar suporte, enquanto o proprietário precisa ter assinatura ativa para gerenciar produtos, pedidos, cozinha, caixa e imagens.

## O que esta etapa inclui

- Cadastro de planos e links de checkout da Kiwify no banco.
- Registro de assinatura pendente quando um usuário cria a conta.
- Liberação e bloqueio de acesso por eventos recebidos da Kiwify.
- Endpoint de webhook com token próprio na URL e gravação idempotente de eventos.
- Policies do banco para limitar as operações administrativas a assinaturas ativas, mantendo o bypass do admin master.

## Configuração pendente antes de ativar em produção

1. Aplicar a migration `supabase/migrations/20261029100000_saas_subscriptions.sql`.
2. Fazer deploy da função `kiwify-webhook` no Supabase.
3. Cadastrar o segredo `KIWIFY_WEBHOOK_SECRET` nas secrets das Edge Functions. Use um valor aleatório longo e mantenha-o fora do Git.
4. Na Kiwify, cadastrar a URL HTTPS `https://<project-ref>.supabase.co/functions/v1/kiwify-webhook?token=<mesmo-segredo>` e selecionar compra aprovada, renovação, atraso, cancelamento, reembolso e chargeback.
5. Cadastrar cada plano com seu link de checkout e ID de produto Kiwify. Os eventos de compra precisam trazer o mesmo e-mail usado pelo assinante ao criar o login.

A tela de planos/cadastro ainda precisa ser conectada a esses dados e deve ser publicada junto com a próxima etapa. Não aplique a migration nem cadastre o webhook antes de revisar a tela de cadastro e os secrets, para evitar bloquear o acesso atual.
