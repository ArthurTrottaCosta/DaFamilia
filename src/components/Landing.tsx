import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Users,
  Search,
  Phone,
  CalendarDays,
  ShieldCheck,
  Check,
  Star,
  ChevronRight,
  House,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Brand } from "./Brand";
import { launchReady, configured } from "../lib/supabase";
function PreviewCard({
  name,
  job,
  by,
  tone,
  initial,
}: {
  name: string;
  job: string;
  by: string;
  tone: string;
  initial: string;
}) {
  return (
    <div className="preview-contact">
      <span className={"avatar " + tone}>{initial}</span>
      <div>
        <strong>{name}</strong>
        <small>{job}</small>
        <span className="preview-by">
          <Heart size={11} />
          Indicação da {by}
        </span>
      </div>
      <span className="mini-action">
        <Phone size={15} />
      </span>
    </div>
  );
}
export function Landing() {
  const ready = configured && launchReady;
  return (
    <div className="landing">
      <header className="site-nav">
        <Brand />
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#feito-para-voces">Feito para vocês</a>
          <a href="/app" className="nav-login">
            Entrar
          </a>
        </nav>
        <a className="button primary small" href={ready ? "/app" : "/demo"}>
          {ready ? "Criar minha família" : "Conhecer o app"}
          <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">
              <span className="status-dot" />
              COISAS BOAS A GENTE COMPARTILHA
            </span>
            <h1>
              Quem cuida da sua casa faz parte da <em>família.</em>
            </h1>
            <p>
              O eletricista da mãe. A pediatra de confiança. A oficina que o pai
              indica. Todos os contatos que vocês precisam, juntos em um só
              lugar.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={ready ? "/app" : "/demo"}>
                {ready ? "Começar minha família" : "Explorar o DaFamília"}
                <ArrowRight size={18} />
              </a>
              <a className="subtle-link" href="#como-funciona">
                Entenda como funciona
                <ChevronRight size={16} />
              </a>
            </div>
            <div className="hero-caption">
              <span className="tiny-avatars">
                <b>A</b>
                <b>P</b>
                <b>L</b>
              </span>
              <span>
                Feito para compartilhar com
                <br />
                <strong>quem você já confia.</strong>
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Exemplo ilustrativo da agenda compartilhada"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-note">
              <span className="note-icon">
                <Heart size={18} />
              </span>
              <span>
                “Foi a minha mãe
                <br />
                <strong>que indicou.”</strong>
              </span>
            </div>
            <div className="phone-preview">
              <div className="phone-top">
                <span>9:41</span>
                <span>● ▰</span>
              </div>
              <div className="preview-heading">
                <span className="mini-logo">
                  <House size={21} />
                </span>
                <div>
                  <small>BOM TER VOCÊ AQUI</small>
                  <strong>
                    Família Oliveira
                    <ChevronRight size={14} />
                  </strong>
                </div>
                <span className="user-avatar">A</span>
              </div>
              <div className="preview-greeting">
                <h3>
                  Gente de confiança.
                  <br />
                  <em>Sempre por perto.</em>
                </h3>
                <p>Os contatos que cuidam da nossa rotina.</p>
              </div>
              <div className="preview-search">
                <Search size={14} />
                De quem você precisa hoje?
              </div>
              <div className="preview-tabs">
                <b>Todos</b>
                <span>Casa</span>
                <span>Saúde</span>
                <span>Serviços</span>
              </div>
              <PreviewCard
                name="Carlos Mendes"
                job="Eletricista"
                by="Lúcia"
                tone="peach"
                initial="CM"
              />
              <PreviewCard
                name="Mariana Costa"
                job="Pediatra"
                by="Ana"
                tone="sage"
                initial="MC"
              />
              <PreviewCard
                name="Oficina do Paulo"
                job="Mecânica"
                by="família"
                tone="lavender"
                initial="OP"
              />
              <div className="preview-bottom">
                <span>
                  <Users size={17} />
                  Contatos
                </span>
                <span>
                  <CalendarDays size={17} />
                  Agenda
                </span>
                <span>
                  <House size={17} />
                  Família
                </span>
              </div>
            </div>
            <div className="floating-confirm">
              <span>
                <Check size={17} />
              </span>
              <div>
                <strong>Contato encontrado!</strong>
                <small>Menos procura. Mais tranquilidade.</small>
              </div>
            </div>
            <span className="art-caption">
              UMA FAMÍLIA ILUSTRATIVA. UMA IDEIA BEM REAL.
            </span>
          </div>
        </section>
        <div className="values-strip">
          <span>
            <LockKeyhole size={17} />
            Grupos privados
          </span>
          <span>
            <Heart size={17} />
            Indicações com contexto
          </span>
          <span>
            <Users size={17} />
            Todo mundo por perto
          </span>
          <span>
            <CalendarDays size={17} />
            Uma rotina mais leve
          </span>
        </div>
        <section id="como-funciona" className="section how-section">
          <div className="section-intro">
            <p className="eyebrow">MENOS “ME PASSA O CONTATO?”</p>
            <h2>
              Uma agenda que
              <br />é de <em>todo mundo.</em>
            </h2>
            <p>
              O que antes ficava no celular de uma pessoa agora pode ajudar a
              família inteira.
            </p>
          </div>
          <div className="steps">
            <article>
              <span>01</span>
              <div>
                <h3>Reúna sua família</h3>
                <p>
                  Crie um grupo privado e convide as pessoas que fazem parte da
                  sua rotina.
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Guarde quem vocês confiam</h3>
                <p>
                  Adicione os contatos, quem indicou e aqueles detalhes que
                  fazem diferença.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Encontre. Combine. Resolva.</h3>
                <p>
                  Abra o contato, organize um compromisso e avise alguém do
                  grupo.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section id="feito-para-voces" className="section feature-section">
          <p className="eyebrow">PEQUENOS CUIDADOS, TODOS OS DIAS</p>
          <h2>
            A vida já é corrida.
            <br />
            <em>Compartilhar pode ser simples.</em>
          </h2>
          <div className="feature-grid">
            <article className="feature large">
              <div className="feature-icon">
                <Heart />
              </div>
              <h3>
                Mais que um número.
                <br />
                Uma boa indicação.
              </h3>
              <p>
                Saiba quem indicou e guarde o que vale lembrar. O conhecimento
                da família deixa de se perder nas conversas.
              </p>
              <div className="quote-card">
                <span className="avatar peach">L</span>
                <p>
                  “O Carlos arrumou a iluminação
                  <br />
                  aqui em casa. Recomendo!”
                  <small>Exemplo de anotação · Lúcia</small>
                </p>
                <Star size={18} />
              </div>
            </article>
            <article className="feature">
              <div className="feature-icon">
                <CalendarDays />
              </div>
              <h3>Combinado em família.</h3>
              <p>
                Compromissos com responsável e contato relacionado, para
                organizar os próximos passos.
              </p>
            </article>
            <article className="feature">
              <div className="feature-icon">
                <ShieldCheck />
              </div>
              <h3>Um espaço de vocês.</h3>
              <p>
                Acesso individual, convites com prazo e controle de quem
                participa do grupo.
              </p>
            </article>
          </div>
        </section>
        <section className="closing">
          <span className="eyebrow">CONFIANÇA QUE SE COMPARTILHA</span>
          <h2>
            Uma família.
            <br />
            Muitas boas <em>conexões.</em>
          </h2>
          <p>
            {ready
              ? "Comece com os contatos que já fazem parte da vida de vocês."
              : "Estamos preparando a nova versão. Conheça a experiência com dados ilustrativos."}
          </p>
          <a className="button cream" href={ready ? "/app" : "/demo"}>
            {ready ? "Criar minha família" : "Experimentar a demonstração"}
            <ArrowUpRight size={18} />
          </a>
          <span className="closing-flower">
            <Sparkles size={110} />
          </span>
        </section>
        <section className="section faq-section">
          <h2>Antes de entrar…</h2>
          <div>
            <details>
              <summary>Preciso instalar alguma coisa?</summary>
              <p>
                Você pode acessar pelo navegador. A instalação na tela inicial
                está em preparação para a nova versão.
              </p>
            </details>
            <details>
              <summary>A demonstração usa dados de outras famílias?</summary>
              <p>
                Não. Nomes, contatos e compromissos são fictícios. Alterações na
                demonstração somem quando você sai ou recarrega.
              </p>
            </details>
            <details>
              <summary>Quanto vai custar?</summary>
              <p>
                Os planos serão definidos durante o piloto. A demonstração é
                gratuita e não solicita cartão.
              </p>
            </details>
            <details>
              <summary>Posso usar com outra comunidade?</summary>
              <p>
                Essa é uma possibilidade. Estamos começando pelas famílias para
                entender bem o que torna a experiência útil.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Brand />
        <span>Feito para cuidar do que conecta vocês.</span>
        <div>
          <a href="/privacidade">Privacidade</a>
          <a href="/ajuda">Ajuda</a>
          <a href="/excluir-conta">Excluir conta</a>
        </div>
        <small>© {new Date().getFullYear()} DaFamília</small>
      </footer>
    </div>
  );
}
