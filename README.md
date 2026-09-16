# DaFamília

Contatos de confiança e compromissos compartilhados em grupos privados.
Projeto pessoal independente de Octopool/Nexus.

## Estado desta versão

Reformulação em React + TypeScript + Vite. Site institucional, demonstração
interativa e aplicativo com Supabase Auth individual e autorização no banco.
A demonstração funciona sem backend e usa somente dados fictícios em memória.
Cadastro público permanece fechado por padrão. Este repositório não significa
que a infraestrutura de produção já foi migrada ou que o app está nas lojas.

## Desenvolvimento

Node 22.12+ e Docker para os testes do banco. Não reutilize o Supabase de produção
nem os containers de outros projetos.

```sh
npm ci
npx supabase start
npx supabase functions serve
```

Copie `.env.example` para `.env.local` e preencha apenas a URL e a chave
**publishable** locais retornadas por `npx supabase status`. Nunca coloque
service_role, secret key ou segredo VAPID em variáveis VITE_.

```sh
npm run dev
npm run check
npm run test:security
```

O teste de segurança recusa qualquer destino diferente de localhost:56421.
Cria e remove exclusivamente usuários sintéticos locais. Requer as funções
locais em execução e VAPID não configurado. O servidor Vite usa a porta 5178;
Supabase usa API 56421, banco 56422 e caixa de e-mail local 56424.

## Modelo de acesso

- Conta individual por código de e-mail. Nenhuma senha familiar compartilhada.
- Grupos, participação e cargos validados no banco com RLS.
- Convites aleatórios de 256 bits, armazenados por hash, uso único e 48 horas.
- Qualquer membro organiza contatos/compromissos; administradores gerenciam
  convites e participação; apenas o responsável transfere o grupo.
- Referências compostas impedem associar contatos ou responsáveis de outro grupo.
- Exclusão de conta ocorre em transação; exige transferência de grupos com
  outros membros. Registros compartilhados remanescentes perdem a autoria.
- Funções HTTP validam usuário e origem. `verify_jwt=false` permite as chaves
  atuais do gateway; não significa ausência de autenticação no handler.
- Push usa web-push, payload genérico e destinos conhecidos. Aceitação do
  provedor não prova entrega. Lembretes ficam disponíveis dentro do app.
- O service worker não armazena contatos ou respostas autenticadas em cache.

## Publicação

Siga [docs/lancamento.md](docs/lancamento.md). Uma preview deve usar
`VITE_LAUNCH_READY=false` e nenhuma URL/chave do ambiente local. O fluxo completo
precisa ser validado novamente na infraestrutura remota antes de abrir cadastros.

## Conteúdo

Diretrizes em [content/instagram.md](content/instagram.md). Um Reel é renderizado
localmente a partir de briefing JSON, com arte própria e música sintetizada:

```sh
python scripts/render-reel.py content/reel-01.json --output artifacts/social/2026-09-16
```

Requer Pillow e FFmpeg. Saídas: MP4 vertical 720×1280, capa, legenda, contato de
revisão e manifesto com hash. O script preserva vídeos existentes e não publica
no Instagram. Não usa contatos reais, imagens pessoais ou músicas de terceiros.
