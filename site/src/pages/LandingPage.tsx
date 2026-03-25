export default function LandingPageAsstramed() {
  const brand = {
    primary: '#123B6D',
    primaryDark: '#0B2747',
    primarySoft: '#EAF1F8',
  };
  const services = [
    {
      title: 'Gestão completa de SST',
      description:
        'Assessoria e consultoria para estruturar, acompanhar e manter toda a rotina de saúde e segurança do trabalho da empresa.',
    },
    {
      title: 'PGR e GRO',
      description:
        'Gerenciamento de riscos ocupacionais com foco em prevenção, conformidade e redução de exposição.',
    },
    {
      title: 'PCMSO e ASO Digital',
      description:
        'Coordenação do programa médico, realização e controle de exames ocupacionais e atendimento in-company.',
    },
    {
      title: 'LTCAT, LIP e PPP eletrônico',
      description:
        'Documentação técnica e previdenciária para dar segurança jurídica e operacional à empresa.',
    },
    {
      title: 'eSocial SST',
      description:
        'Gestão e envio dos eventos S-2210, S-2220 e S-2240 com integração entre RH, medicina e segurança do trabalho.',
    },
    {
      title: 'Monitoramento ambiental',
      description:
        'Dosimetria, luminosidade, agentes químicos, vibração, IBUTG e medições com equipamentos específicos.',
    },
    {
      title: 'Ergonomia e riscos psicossociais',
      description:
        'AEP, mapeamento de riscos psicossociais e apoio à adequação à NR 17 e nova NR 1.',
    },
    {
      title: 'Cursos e treinamentos',
      description:
        'Capacitações em NR 05, NR 20, NR 23, NR 33, NR 35 e outras normas conforme a necessidade da operação.',
    },
    {
      title: 'Gestão ambiental',
      description:
        'Planos e suporte para PGRS e PGRSS com visão técnica e operacional.',
    },
  ];

  const differentials = [
    '25 anos de experiência em assessoria, consultoria e gestão',
    'Atendimento em todo o território nacional por rede credenciada',
    'Integração entre RH, SST e eSocial',
    'Empresa credenciada pela ABRESST e com registro no CRM-MT',
    'Atendimento consultivo com foco em conformidade e resultado',
  ];

  const steps = [
    {
      title: 'AEP (NR-17)',
      description: 'Identificação preliminar dos riscos ergonômicos.',
    },
    {
      title: 'PGR – Inventário de Riscos',
      description: 'Registro e tratamento dos riscos ocupacionais.',
    },
    {
      title: 'Plano de ação',
      description: 'Aplicação da gestão dentro da empresa.',
    },
    {
      title: 'PCMSO – NR-07',
      description: 'Exames e monitoramento da saúde conforme os riscos.',
    },
    {
      title: 'eSocial SST',
      description: 'Declaração oficial dos riscos e eventos obrigatórios.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10 lg:px-12">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500"
              aria-label="Espaço reservado para logo PNG da ASSTRAMED"
            >
              Logo PNG
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://crm.asstramed.com.br"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border px-5 py-2.5 text-sm font-medium transition hover:-translate-y-0.5"
              style={{ borderColor: brand.primary, color: brand.primary }}
            >
              Área restrita
            </a>
            <button
              className="rounded-2xl px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:-translate-y-0.5"
              style={{ backgroundColor: brand.primary }}
            >
              Solicitar proposta
            </button>
          </div>
        </div>
      </header>
      <section
        className="relative overflow-hidden border-b border-slate-200 text-white"
        style={{
          background: `linear-gradient(135deg, ${brand.primaryDark} 0%, ${brand.primary} 55%, #163A63 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 left-0 h-72 w-72 rounded-full bg-cyan-400 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-400 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:px-10 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm text-slate-100 backdrop-blur">
              Saúde Ocupacional • Segurança do Trabalho • Meio Ambiente
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
              Gestão de SST com experiência, conformidade e atendimento nacional
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              A ASSTRAMED atua com assessoria, consultoria e gestão em saúde ocupacional,
              segurança do trabalho e meio ambiente, integrando processos, documentação
              técnica e eSocial para empresas de diferentes segmentos.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                className="rounded-2xl bg-white px-6 py-3 text-sm font-medium shadow-lg transition hover:-translate-y-0.5"
                style={{ color: brand.primaryDark }}
              >
                Solicitar proposta
              </button>
              <button className="rounded-2xl border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                Falar no WhatsApp
              </button>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-2xl font-semibold">25+</div>
                <div className="mt-1 text-sm text-slate-300">anos de experiência</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-2xl font-semibold">Brasil</div>
                <div className="mt-1 text-sm text-slate-300">atendimento nacional</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur col-span-2 md:col-span-1">
                <div className="text-2xl font-semibold">eSocial</div>
                <div className="mt-1 text-sm text-slate-300">integração SST e RH</div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-5 text-slate-900">
                  <div className="text-sm font-medium text-slate-500">Especialidades</div>
                  <div className="mt-3 text-xl font-semibold">SST e Saúde Ocupacional</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Consultoria técnica, gestão documental, exames ocupacionais, treinamentos e monitoramentos.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                  <div className="text-sm font-medium text-slate-300">Credenciais</div>
                  <div className="mt-3 space-y-3 text-sm text-slate-200">
                    <div className="rounded-xl border border-white/10 px-4 py-3">Empresa certificada ABRESST</div>
                    <div className="rounded-xl border border-white/10 px-4 py-3">Registro CRM-MT 2396</div>
                    <div className="rounded-xl border border-white/10 px-4 py-3">Rede credenciada em todo o país</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5 md:col-span-2">
                  <div className="text-sm font-medium text-slate-300">Ideal para</div>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Empresas que precisam organizar compliance de SST, fortalecer a gestão ocupacional,
                    atender exigências legais e manter processos integrados com o eSocial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sobre a empresa
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Estrutura institucional sólida para empresas que precisam de segurança técnica
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              A ASSTRAMED oferece gestão em saúde ocupacional, segurança do trabalho e meio ambiente,
              com foco em preservar a vida, promover ambientes seguros e apoiar o sucesso dos clientes
              por meio de soluções técnicas, atendimento próximo e visão integrada da operação.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-500">Missão</div>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Preservar a vida e a saúde dos trabalhadores, construindo uma consciência coletiva positiva,
                harmônica com o meio ambiente e orientada pela excelência em gestão de SST.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-500">Visão</div>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Ser referência nacional em gestão de segurança e saúde do trabalho, reconhecida pela excelência na prestação de serviços.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-500">Valores</div>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Trabalho, ética, honestidade, integridade, inovação, dinamismo, foco no cliente e excelência no atendimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200" style={{ backgroundColor: brand.primarySoft }}>
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Diferenciais
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              O que reforça a credibilidade da operação
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {differentials.map((item) => (
              <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm leading-7 text-slate-700">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Serviços
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Estrutura de serviços para atender a rotina completa de SST
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            O layout abaixo prioriza clareza comercial e leitura rápida, apresentando os serviços em blocos objetivos para facilitar entendimento e conversão.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service.title} className="rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h3 className="text-lg font-semibold tracking-tight">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Fluxo de gestão
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Jornada sugerida para comunicar o processo de SST
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 p-8 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Treinamentos e capacitações
            </div>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Espaço para destacar cursos em formato de grade ou lista compacta: NR 05, NR 06, NR 11, NR 12, NR 13, NR 16, NR 18, NR 20, NR 23, NR 33 e NR 35.
            </p>
          </div>
          <div className="rounded-[28px] border border-slate-200 p-8 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cobertura nacional
            </div>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Área ideal para mapa do Brasil, logos de sistemas parceiros ou elementos de prova visual da rede credenciada e da operação nacional.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Chamada final
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Sua empresa precisa organizar SST, eSocial e documentação técnica com mais segurança?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Estruture uma seção final com botão de contato, WhatsApp e formulário rápido para orçamento.
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="text-lg font-semibold">Contato institucional</div>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <p>Avenida Coronel Escolástico nº 365, Bairro Bandeirantes, Cuiabá - MT</p>
                <p>WhatsApp: (65) 3027-1403</p>
                <p>E-mail: asstra@asstramed.com.br</p>
                <p>CEO: Elson Pedro Rosa</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5">
                  Pedir orçamento
                </button>
                <button className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
