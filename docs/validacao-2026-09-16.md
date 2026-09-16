# Validação — 16/09/2026

## Resultado local

- `npm run check`: build TypeScript/Vite concluído; 6 testes unitários aprovados.
- `npm run test:security`: 47 verificações aprovadas contra Supabase local isolado.
- `npm audit --audit-level=moderate`: zero vulnerabilidades reportadas.
- Migrações aplicadas desde banco local vazio com CLI Supabase 2.117.0.
- Login por e-mail OTP exercitado no navegador com caixa local Mailpit.
- Criar grupo, salvar contato e recuperar após recarregar: verificados via UI.
- Criar compromisso com contato e responsável: verificado via UI e horário local.
- Layout desktop e móvel inspecionados; leitura móvel aumentada, cartões em uma
  coluna e largura sem transbordamento horizontal da página.

## Segurança exercitada

Acesso anônimo, leitura/alteração/exclusão de outra família, inserção de membro
forjada, alteração de autoria, movimentação entre grupos, referências cruzadas,
convite reutilizado/expirado/revogado, ex-membro com JWT antigo, propriedade de
inscrições push, função administrativa inacessível a clientes, bloqueio de
exclusão do responsável por grupo compartilhado, exclusão transacional e
anonimização da autoria. Funções HTTP rejeitam token forjado, ausência de login,
origem desconhecida e confirmação inválida de exclusão.

## Prévia remota

Deployment `dpl_2ZnCnxj7sG4gU8m4KxxF35oJGrTe`, estado READY.
Site, `/demo` e `/app` abrem no navegador. Cadastro fechado confirmado; nenhuma
URL/chave local enviada no build remoto. Console sem erros/avisos no teste.
CSP, proteção de enquadramento, no-sniff e política de referência conferidos
na resposta real autenticada da preview. A página de autenticação da Vercel
não foi confundida com a resposta do aplicativo.

## Conteúdo

Primeiro Reel em `artifacts/social/2026-09-16/quem-tem-o-contato.mp4`:
18 segundos, 720×1280, H.264, 24 fps, áudio AAC. Quatro cenas inspecionadas em
contato visual; capa, legenda e manifesto gerados. Música original sintetizada,
sem narração. Estado: rascunho, não publicado no Instagram.
Rotina diária às 09:00 criada como heartbeat desta tarefa, ID
`v-deo-di-rio-do-dafam-lia`. Requer computador/Codex disponíveis no agendamento.

## O que não foi validado

Dados, políticas e funções remotas antigas; migração da base real; envio por SMTP
externo; push em aparelhos físicos; recuperação de backup; faturamento; lojas
Apple/Google e publicação do Instagram. Testes locais não substituem essas etapas.

## Site público de pré-lançamento

Deployment de produção `dpl_716EFbSuZqKDqHw3C9gDQpADkY6Y`, READY.
`https://www.dafamiliaa.com.br/`, `/demo`, `/app`, manifesto, capa social e
service worker responderam HTTP 200 com tipos corretos. CSP conferida no domínio
público. Site e demonstração inspecionados no navegador; console sem erros.
Tela móvel de 390px conferida, sem transbordamento horizontal. Cadastro continua
fechado, sem conexão ao banco local ou ao projeto antigo inativo.
