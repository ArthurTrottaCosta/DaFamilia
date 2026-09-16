# Proteção da base antiga — 16/09/2026

Projeto exclusivo DaFamilia: `szjwvmfwikruczkvbcpy`, Healthy no painel autenticado.
Nenhum registro pessoal foi extraído para este relatório.

As sete tabelas públicas antigas tinham políticas ALL para PUBLIC, com USING e
WITH CHECK verdadeiros, além de todos os privilégios para anon/authenticated.
RLS habilitada nessas condições não isolava famílias.

Executado pelo SQL Editor, em transação concluída:

```sql
begin;
revoke all on table public.appointments, public.contacts, public.families,
  public.interactions, public.members, public.nudges, public.push_subscriptions
  from public, anon, authenticated;
commit;
```

Consulta independente após COMMIT confirmou nas sete tabelas:
anon SELECT=false, anon INSERT=false, authenticated SELECT=false,
service_role SELECT=true. A operação somente mudou permissões, sem modificar ou
apagar registros. O cliente antigo deixa de ter acesso; o novo cadastro continua
fechado. Não restaurar grants públicos como forma de reativar o aplicativo.

Inspeção adicional no schema public retornou zero funções SECURITY DEFINER e
zero views. Isso não substitui uma auditoria completa de todas as integrações.

O download da função antiga notify foi preservado no diretório local ignorado
`artifacts/backups/2026-09-16/supabase/functions/notify/index.ts`.
Isso é backup de código, não backup do banco.

Função notify substituída pela implementação com autenticação individual e
validação de origem, participação e lembrete; versão remota 12, ACTIVE. A
verificação JWT do gateway permanece desativada por configuração do projeto,
mas o handler valida o token usando Supabase Auth getUser antes de acessar dados.
ALLOWED_ORIGINS foi limitado a https://www.dafamiliaa.com.br e
https://dafamiliaa.com.br. Verificação HTTP remota: ausência de login 401,
origem desconhecida 403, método GET 405. Nenhuma notificação real enviada.
Sem migração df_, a função não oferece o fluxo novo a usuários; ela falha fechada.

Dump remoto e consulta via CLI estão bloqueados por falta de permissão para
alterar o papel gerenciado cli_login_postgres. Não foram alteradas senhas nem
papéis internos para contornar essa restrição. Exportação protegida, teste de
restauração e migração real continuam pendentes.
