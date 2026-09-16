import { Brand } from "./Brand";
import { supportEmail, launchReady } from "../lib/supabase";
export function Legal({ page }: { page: string }) {
  return (
    <main className="legal-page">
      <Brand />
      <a href="/" className="back-link">
        ← Voltar
      </a>
      {page === "/ajuda" ? (
        <>
          <h1>Vamos te ajudar.</h1>
          <p>
            Para entrar, use seu próprio e-mail e o código que chegar na caixa
            de entrada. Convites são pessoais, de uso único e expiram em 48
            horas.
          </p>
          <h2>Contato antigo não aparece?</h2>
          <p>
            A nova versão usa contas individuais. Dados da versão anterior
            precisam passar por uma migração com confirmação de responsabilidade
            pelo grupo.
          </p>
          <h2>Falar com o DaFamília</h2>
          {supportEmail ? (
            <a href={"mailto:" + supportEmail}>{supportEmail}</a>
          ) : (
            <p>
              O canal de suporte será divulgado antes da abertura dos cadastros.
              A demonstração não recebe dados reais.
            </p>
          )}
        </>
      ) : page === "/excluir-conta" ? (
        <>
          <h1>Seus dados. Sua escolha.</h1>
          <p>
            Para excluir sua conta, <a href="/app">entre no aplicativo</a>, abra
            Família e escolha Excluir minha conta. A confirmação é necessária
            para evitar exclusões por engano.
          </p>
          <p>
            Se você é responsável por um grupo com outras pessoas, transfira a
            responsabilidade antes. Grupos dos quais você é o único membro serão
            excluídos junto com a conta.
          </p>
          <p>
            Seus registros pessoais de participação, lembretes e dispositivos
            são removidos. Contatos e compromissos compartilhados em grupos que
            continuam existindo permanecem sem atribuição à sua conta. Você pode
            exportar ou remover os registros que gerencia antes de encerrar o
            acesso.
          </p>
          {supportEmail && (
            <p>
              Se não conseguir entrar, solicite ajuda em{" "}
              <a href={"mailto:" + supportEmail}>{supportEmail}</a>.
              Precisaremos verificar a identidade do solicitante.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="eyebrow">
            {launchReady
              ? "PRIVACIDADE"
              : "VERSÃO DE PREPARAÇÃO · CADASTRO AINDA FECHADO"}
          </p>
          <h1>Confiança começa com clareza.</h1>
          <p>
            O DaFamília organiza contatos e compromissos em grupos privados.
            Esta página descreve o comportamento desta versão; os dados do
            responsável legal e os prazos operacionais serão concluídos antes da
            abertura pública.
          </p>
          <h2>O que é usado</h2>
          <p>
            Na demonstração, dados ilustrativos ficam apenas na memória da
            página. Na versão com conta, usamos seu e-mail para autenticação,
            nome no grupo, contatos e anotações que você cadastrar, compromissos
            e associações aos grupos. Notificações são opcionais.
          </p>
          <h2>Quem pode ver</h2>
          <p>
            Membros do mesmo grupo podem consultar e organizar os contatos e
            compromissos compartilhados. Quem administra controla convites e
            remoção de participantes. Não publique informação que não deve ser
            vista pelos demais membros.
          </p>
          <h2>Contatos de outras pessoas</h2>
          <p>
            Cadastre somente o necessário e tenha autorização adequada para
            compartilhar. Evite documentos, diagnósticos, senhas ou detalhes
            íntimos nas anotações. Não importe a agenda inteira sem selecionar
            os contatos.
          </p>
          <h2>Serviços e armazenamento</h2>
          <p>
            O projeto usa Supabase para autenticação e banco de dados e Vercel
            para hospedagem. A implantação final deve documentar região,
            operadores, bases legais e retenção. Não vendemos listas de
            contatos. Esta versão não contém anúncios nem rastreamento
            publicitário.
          </p>
          <h2>Controle e exclusão</h2>
          <p>
            Você pode exportar os dados de grupos aos quais tem acesso, sair de
            um grupo ou solicitar exclusão da conta pelo aplicativo. Ao remover
            um membro, o acesso a novas consultas é revogado; cópias
            anteriormente exportadas não podem ser recolhidas.
          </p>
          <p>
            Consulte o <a href="/excluir-conta">fluxo de exclusão</a> para
            entender o tratamento de dados compartilhados.
          </p>
          <h2>Dúvidas</h2>
          {supportEmail ? (
            <a href={"mailto:" + supportEmail}>{supportEmail}</a>
          ) : (
            <p>
              O canal de atendimento e a identificação do responsável serão
              preenchidos antes do lançamento público.
            </p>
          )}
        </>
      )}
    </main>
  );
}
