-- Passo 3 do paywall — defesa-em-profundidade (RLS backstop).
--
-- As tabelas de LEADS de investigação da folha são evidência 100% PAGA
-- (funcionário-doador da campanha do próprio chefe; nepotismo cruzado). Hoje o
-- gate vive só no código (DAL/páginas). Aqui adicionamos uma rede de segurança
-- no nível do banco: o role `anon` fica PROIBIDO de lê-las por padrão.
--
-- Por que é seguro ligar agora, sem mudar comportamento:
--   - Todo o app lê via SERVICE_ROLE (getSupabase / supabase-server), que IGNORA
--     RLS — páginas e serviços seguem funcionando idênticos.
--   - A ingestão (analytics) também escreve via service-role — segue funcionando.
--   - Não existe cliente anônimo wired ainda; e a edge function `ask` (que usa a
--     anon key) responde Q&A pública sobre gastos/emendas e NÃO consulta estas
--     tabelas de leads derivadas — então não é afetada.
--
-- Não criamos NENHUMA policy de propósito: sem policy = deny-by-default para
-- anon/authenticated. Quando um caminho anon legítimo precisar (Passo 3 cliente
-- duplo), adiciona-se uma policy SELECT explícita e auditável.

alter table if exists public.folha_doador_leads   enable row level security;
alter table if exists public.folha_nepotismo_leads enable row level security;
