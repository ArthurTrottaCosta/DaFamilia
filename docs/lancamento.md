# Plano de lançamento — 16/09/2026

## O que está pronto no código

Novo site, demonstração identificada, app responsivo, autenticação individual,
contatos e favoritos, busca por indicação/serviço, histórico, agenda, convites,
gestão de participantes, exportação, exclusão de conta e backend de notificações.
Não há cobrança, importação em massa, sincronização nativa de agenda, lembretes
automáticos de compromissos nem publicação nas lojas nesta versão.

## Infraestrutura encontrada

- Supabase `szjwvmfwikruczkvbcpy` (DaFamilia) inicialmente INACTIVE; posteriormente conferido Healthy no painel autenticado em 16/09/2026. Backup CLI bloqueado por permissão do papel cli_login_postgres; migração remota ainda pendente.
- Acesso PUBLIC/anon/authenticated às sete tabelas antigas revogado e conferido no painel, preservando os registros. Evidências em `docs/supabase-quarentena-2026-09-16.md`.
- Vercel `da-familia`, projeto `prj_n1Di2ZavO4uPUHSmjW797xJezz8w`.
- Site de pré-lançamento publicado e conferido em `https://www.dafamiliaa.com.br/`; demonstração pública em `/demo`, cadastro fechado.
- Checkout histórico preservado em `C:\Windows\System32\dafamilia`.
- Trabalho novo em `C:\Users\trott\Documents\Codex\DaFamilia\app`.

## Ordem para abertura real

1. Confirmar acesso ao Supabase antigo e existência de dados reais. Antes de
   reativar endpoints antigos, colocar o frontend antigo em manutenção e preparar
   a quarentena de acesso. Restaurar o banco com exportação protegida e testar
   recuperação. Não apagar tabelas antigas.
2. Inspecionar tabelas, views, funções SECURITY DEFINER, permissões PUBLIC/anon,
   políticas e integrações antigas. A migração revoga as tabelas conhecidas, mas
   uma inspeção remota é necessária para encontrar objetos fora do repositório.
3. Aplicar as migrações df_ em staging. Fazer teste com duas famílias reais
   controladas, remoção, transferência, exclusão e sessão expirada. Somente depois
   aplicar em produção. Não provar propriedade por nome ou código compartilhado.
4. Migrar dados antigos somente após comprovação de responsabilidade pelo grupo.
   Autenticar cada pessoa por e-mail próprio e validar a contagem/exportação.
5. Configurar SMTP transacional, remetente e domínio verificados, template de OTP,
   limites e proteção contra abuso. O e-mail local do teste não valida a entrega
   por um provedor externo. Prever recuperação de acesso e atendimento.
6. Configurar URLs permitidas de autenticação e ALLOWED_ORIGINS para os domínios
   exatos. Configurar VAPID e implantar notify e delete-account. Testar push em
   Android e iPhone instalado, revogação e logout, sem alegar garantia de entrega.
7. E-mail público autorizado: contato@octopool.com.br. Completar identificação do controlador, bases
   legais, operadores/regiões, retenção e resposta a solicitações. Definir uso por
   adultos inicialmente; não pedir dados de crianças ou informações de saúde.
   Revisar a política de privacidade antes de abrir contas.
8. Definir plano comercial de hospedagem adequado, orçamento mensal, backups,
   logs sem dados pessoais, alertas, recuperação e responsável por incidentes.
9. Publicar a versão web/PWA, verificar CSP, domínio, assets, login, todas as
   funções e backup remoto. Liberar VITE_LAUNCH_READY=true apenas após esses itens.
10. Piloto com 5 famílias; 2 semanas de uso e correções. Decidir cobrança e lojas
    depois de observar ativação e utilidade. Não cobrar por recursos indisponíveis.

## Hipótese de renda e decisões

Começar por contatos indicados e organização em família. Um organizador convida
os demais e paga pelo grupo; evitar cobrar por cada familiar. Testar plano anual
e mensal somente após perceber uso recorrente, com preço apresentado como
experimento, nunca como disposição a pagar já comprovada. Comunidades pequenas
podem justificar plano com mais grupos e administração. Sem venda de contatos.

Critério de ativação sugerido para o piloto: grupo criado + 2 pessoas + 5 contatos
úteis. Medir retorno do grupo em semanas 1 e 4, convites aceitos, buscas e contatos
úteis encontrados, sem coletar nomes/telefones em analytics. Perguntar sobre
pagamento a quem usou de verdade antes de implementar checkout.

## Limites de validação

Os testes locais não provam segurança absoluta ou prontidão da infraestrutura
remota. Continuam pendentes migração real, política final, SMTP, entrega push em
dispositivos, recuperação de backup e testes de acessibilidade com usuários.
O piloto deve incluir aparelhos reais Android/iOS e conexões instáveis.
