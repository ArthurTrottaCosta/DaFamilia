# iPhone e abertura do DaFamília — decisão de produto

Confirmado pelo titular em 16/09/2026: tem iPhone, não tem Mac; o responsável
será ele como pessoa física. Nome legal completo ainda deve ser confirmado antes
de publicar a política final. O canal autorizado continua contato@octopool.com.br;
isso não torna a Octopool responsável pelo produto nem valida SMTP.

## Recomendação

Abrir primeiro o piloto web/PWA com a base atual. Evoluir para integração com a
agenda do iPhone e, depois, widget de favoritos. O usuário deveria abrir o
DaFamília para organizar a confiança e o grupo; consultar números e ligar usando
a agenda habitual. Uma instalação inicial de um app nativo ainda seria necessária
no caminho ContactProvider/WidgetKit.

| Caminho | Experiência | Esforço e limites |
| --- | --- | --- |
| Web/PWA + vCard | Abre por link; pode guardar atalho na tela inicial; salva contato escolhido | Mais curto; exportação é cópia pontual, sem sincronização automática |
| ContactProvider nativo | Contatos geridos pelo DaFamília aparecem no ecossistema Contatos do iPhone | Requer app instalado, ativação do provedor, extensão Swift, compilação Apple e testes físicos; os contatos fornecidos são somente leitura na agenda |
| Widget nativo | Poucos favoritos e ações rápidas na tela inicial | Complementa o app; não comporta uma agenda completa; exige extensão WidgetKit, não é um widget fornecido pela PWA |
| CardDAV | Conta adicionada nos Ajustes; contatos sincronizados sem app próprio instalado | Exige servidor compatível, autenticação por pessoa/dispositivo e sincronização com grupos; configuração inicial menos amigável |
| Extensão Safari | Ajuda a capturar um contato durante a navegação | Serve à navegação; não oferece por si só integração com a agenda de todo o sistema |

Complexidade acima é avaliação técnica, não prazo de entrega. Nenhuma integração
nativa/CardDAV foi implementada ou testada neste turno.

## Caminho técnico proposto

Reaproveitar React/Vite e Supabase. Avaliar Capacitor para o app instalado, com
módulos Swift próprios para ContactProvider, WidgetKit e compartilhamento.
Não pressupor que um plugin web resolva essas extensões. Validar o provedor numa
prova pequena em iPhone real antes de desenvolver todo o app nativo. O projeto
precisará de macOS/Xcode local ou remoto; não é necessário comprar um Mac agora.

No iPhone, a agenda exibiria dados essenciais; histórias e administração ficam
no DaFamília. Começar com fornecimento de contatos em um sentido, do grupo para
o sistema, para evitar conflitos de edição. Nunca sobrescrever contatos pessoais.
Selecionar quais grupos sincronizar, deduplicar por identificador estável, limpar
cache da extensão em logout e remoção, permitir desativação, tratar uso offline.
Não prometer revogação instantânea de cópias que já saíram do serviço.

O widget mostraria no máximo alguns favoritos escolhidos, sem notas sensíveis.
Atualizações dependem do agendamento do iOS; não prometer sincronização imediata
ou serviço continuamente executando em segundo plano.

## O que impede abrir contas reais agora

1. **Banco:** exportação protegida e restauração verificável do legado. O dump
   CLI está bloqueado pela permissão do papel cli_login_postgres; acesso pelo
   painel funciona. Resolver pelo caminho suportado de exportação/conexão ou
   suporte Supabase, sem alterar papéis gerenciados às cegas.
2. **Backend remoto:** aplicar o schema df_ após validação em staging, configurar
   Auth e URLs permitidas, implantar delete-account, vincular o frontend ao
   projeto correto. notify já foi protegido, mas o fluxo novo depende do schema.
3. **Login real:** escolher/configurar SMTP transacional autorizado para este
   projeto, verificar remetente/domínio e testar chegada do OTP, expiração,
   reenvio e limites. E-mail de contato não é credencial nem provedor de envio.
4. **Política e operação:** finalizar identificação do titular, retenção,
   atendimento, rotina de backup/recuperação, orçamento e alertas de falha.
5. **Teste de ponta a ponta:** duas famílias de teste controladas, convite,
   contatos, exclusão, remoção com sessão antiga, logout e recuperação. No
   iPhone físico: Safari, adicionar à tela inicial, teclado, vCard, chamadas,
   links e sessão após fechar/reabrir. Tela de 390px no desktop não valida iOS.
6. **Piloto:** abrir para poucas famílias, acompanhar falhas e só então ampliar.

Migrar contatos antigos somente com responsabilidade do grupo confirmada.
Pode-se iniciar um piloto com grupos novos sem importar imediatamente o legado,
desde que ele fique protegido e preservado; nenhuma migração automática por nome
ou código compartilhado. Push pode ficar desativado no piloto até validação em
aparelhos físicos. Instagram, cobrança, widgets e App Store não precisam bloquear
o primeiro piloto web. A abertura deve manter VITE_LAUNCH_READY=false até concluir
as condições de acesso e dados acima.

## Para publicar na App Store depois

Conta Apple Developer do titular, assinatura/identificadores, build macOS/Xcode,
TestFlight em aparelhos reais, funcionalidades nativas úteis, metadados,
privacidade e revisão da Apple. Conta individual exibe o nome legal do titular
como vendedor. A taxa informada pela Apple é US$99/ano, com preço local/regional
no cadastro; nenhuma compra ou inscrição foi efetuada.

## Fontes oficiais consultadas

- [ContactProvider](https://developer.apple.com/documentation/ContactProvider): contatos fornecidos pelo app, domínio habilitado, atualização e remoção.
- [Criar widget](https://developer.apple.com/documentation/WidgetKit/Creating-a-Widget-Extension): extensão vinculada a app instalado, limites de interação.
- [CardDAV nos dispositivos Apple](https://support.apple.com/pt-br/guide/deployment/depbd78ea978/web): sincronização padrão de contatos.
- [Contas no iPhone](https://support.apple.com/en-mt/guide/iphone/ipha0d932e96/ios): configuração manual de CardDAV.
- [Safari extensions](https://developer.apple.com/safari/extensions/): foco em navegação; empacotamento atual de web extensions também pode ocorrer sem Mac, mas não substitui extensões nativas de contatos/widgets.
- [Capacitor iOS](https://capacitorjs.com/docs/ios): runtime e módulos nativos geridos pelo Xcode.
- [Web apps no iOS](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/): instalação na tela inicial.
- [Apple Developer](https://developer.apple.com/programs/enroll/): inscrição individual, nome público e taxa.
- [Revisão App Store](https://developer.apple.com/app-store/review/guidelines/): seção 4.2, utilidade além de um site reempacotado.
