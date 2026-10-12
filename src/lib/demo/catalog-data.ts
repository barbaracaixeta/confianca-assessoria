/**
 * ⚠️ DADOS MOCKADOS DE DESENVOLVIMENTO
 * Preços, prazos e textos abaixo são exemplos editáveis — não representam valores
 * reais da empresa. São usados (1) como catálogo de demonstração quando o Supabase
 * ainda não está configurado e (2) para gerar supabase/seed.sql (npm run seed:generate).
 */
import type { Category, Institution, Product, ProductFile } from "@/types/domain";

export const DEMO_CATEGORIES: Category[] = [
  { id: "00000000-0000-4000-8000-000000000101", name: "TCC", slug: "tcc", description: "Modelos, guias e recursos para o trabalho de conclusão de curso.", sortOrder: 1, isActive: true },
  { id: "00000000-0000-4000-8000-000000000102", name: "Artigos", slug: "artigos", description: "Modelos e materiais para artigos científicos.", sortOrder: 2, isActive: true },
  { id: "00000000-0000-4000-8000-000000000103", name: "ABNT", slug: "abnt", description: "Guias de normalização e formatação ABNT.", sortOrder: 3, isActive: true },
  { id: "00000000-0000-4000-8000-000000000104", name: "Apresentações", slug: "apresentacoes", description: "Templates de slides para defesa e seminários.", sortOrder: 4, isActive: true },
  { id: "00000000-0000-4000-8000-000000000105", name: "Templates", slug: "templates", description: "Documentos editáveis prontos para usar.", sortOrder: 5, isActive: true },
  { id: "00000000-0000-4000-8000-000000000106", name: "E-books", slug: "ebooks", description: "Guias e e-books de apoio ao estudo.", sortOrder: 6, isActive: true },
];

export const DEMO_INSTITUTIONS: Institution[] = [
  { id: "00000000-0000-4000-8000-000000000301", name: "UNOPAR", slug: "unopar", description: "Materiais adequados ao modelo de trabalho da UNOPAR.", logoUrl: null, sortOrder: 1, isActive: true },
  { id: "00000000-0000-4000-8000-000000000302", name: "UNIASSELVI", slug: "uniasselvi", description: "Recursos no padrão exigido pela UNIASSELVI.", logoUrl: null, sortOrder: 2, isActive: true },
  { id: "00000000-0000-4000-8000-000000000303", name: "Anhanguera", slug: "anhanguera", description: "Materiais alinhados ao trabalho da Anhanguera.", logoUrl: null, sortOrder: 3, isActive: true },
  { id: "00000000-0000-4000-8000-000000000304", name: "Estácio", slug: "estacio", description: "Conteúdo pensado para a rotina acadêmica da Estácio.", logoUrl: null, sortOrder: 4, isActive: true },
];

const cat = (slug: string) => DEMO_CATEGORIES.find((c) => c.slug === slug)!;
const inst = (slug: string) => DEMO_INSTITUTIONS.find((i) => i.slug === slug)!;

function file(id: string, name: string, label: string, sizeBytes: number): ProductFile {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  const mime: Record<string, string> = {
    PDF: "application/pdf",
    DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ZIP: "application/zip",
    XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    EPUB: "application/epub+zip",
  };
  return {
    id,
    productId: "PLACEHOLDER",
    originalName: name,
    mimeType: mime[ext] ?? "application/octet-stream",
    sizeBytes,
    label,
    sortOrder: 0,
    createdAt: "2026-10-01T00:00:00Z",
  };
}

type DemoProductInput = Omit<
  Product,
  "categoryId" | "categoryName" | "institutionId" | "institutionName" | "institutionSlug" | "imageUrl" | "isActive" | "seoTitle" | "seoDescription" | "tiers" | "promoStartsAt" | "promoEndsAt" | "minPriceCents" | "maxPriceCents" | "sku" | "stockQuantity" | "weightGrams" | "dimensions" | "productType" | "downloadLimit" | "files"
> &
  Partial<Pick<Product, "promoStartsAt" | "promoEndsAt" | "files">> & {
    category: string;
    institution?: string;
  };

function product(p: DemoProductInput): Product {
  const c = cat(p.category);
  const i = p.institution ? inst(p.institution) : null;
  const { category: _category, institution: _institution, ...rest } = p;
  void _category;
  void _institution;
  return {
    tiers: [],
    promoStartsAt: null,
    promoEndsAt: null,
    minPriceCents: null,
    maxPriceCents: null,
    sku: null,
    stockQuantity: null,
    weightGrams: null,
    dimensions: null,
    downloadLimit: null,
    productType: "digital",
    files: rest.files ?? [],
    ...rest,
    categoryId: c.id,
    categoryName: c.name,
    institutionId: i?.id ?? null,
    institutionName: i?.name ?? null,
    institutionSlug: i?.slug ?? null,
    imageUrl: null,
    isActive: true,
    seoTitle: null,
    seoDescription: null,
  };
}

export const DEMO_PRODUCTS: Product[] = [
  product({
    id: "00000000-0000-4000-8000-000000000201",
    category: "tcc",
    institution: "unopar",
    name: "Modelo de TCC ABNT (Word)",
    slug: "modelo-tcc-abnt",
    shortDescription: "Modelo de TCC completo e editável em Word, já estruturado segundo as normas ABNT.",
    description:
      "Um modelo de trabalho acadêmico em formato .docx com todos os elementos pré-textuais, textuais e pós-textuais já configurados conforme a ABNT (NBR 14724, 6023, 10520). Estilos de títulos, sumário automático, numeração de páginas e exemplos de citação incluídos.",
    pricingUnit: "fixed",
    basePriceCents: 14990,
    discountType: "sale_price",
    discountValue: 9990,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["Economiza horas de configuração de formatação", "Sumário e numeração automáticos", "Atualizações incluídas"],
    audience: ["Graduandos iniciando o TCC", "Quem precisa reconfigurar o trabalho nas normas"],
    includes: ["Arquivo .docx editável", "Guia rápido de uso (PDF)", "Exemplos de citação e referência"],
    faqs: [
      { question: "O modelo escreve o TCC por mim?", answer: "Não. O modelo é uma estrutura pronta e editável para você organizar e escrever o seu próprio conteúdo com a formatação correta." },
      { question: "Em qual versão do Word funciona?", answer: "O arquivo .docx abre em Word 2016+, Google Docs e LibreOffice. Recursos de sumário automático funcionam melhor no Word para desktop." },
    ],
    isFeatured: true,
    isBestSeller: true,
    isNew: false,
    sortOrder: 1,
    files: [
      file("00000000-0000-4000-8000-000000000901", "Modelo-TCC-ABNT.docx", "Modelo TCC (DOCX)", 2_400_000),
      file("00000000-0000-4000-8000-000000000902", "Guia-de-uso-do-modelo.pdf", "Guia rápido de uso (PDF)", 640_000),
    ],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000202",
    category: "artigos",
    institution: "uniasselvi",
    name: "Modelo de Artigo Científico ABNT",
    slug: "modelo-artigo-cientifico-abnt",
    shortDescription: "Estrutura IMRaD pronta em Word com formatação ABNT e exemplos de citação.",
    description:
      "Modelo de artigo científico em .docx pronto para preencher: título, resumo, palavras-chave, introdução, método, resultados, discussão e referências, com estilos configurados.",
    pricingUnit: "fixed",
    basePriceCents: 8990,
    discountType: "none",
    discountValue: 0,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["Estrutura IMRaD pronta", "Formatação de referências exemplificada"],
    audience: ["Graduandos e pós-graduandos preparando submissão"],
    includes: ["Arquivo .docx editável", "Exemplos de resumo e palavras-chave"],
    faqs: [],
    isFeatured: true,
    isBestSeller: false,
    isNew: false,
    sortOrder: 2,
    files: [file("00000000-0000-4000-8000-000000000903", "Modelo-Artigo-ABNT.docx", "Modelo de artigo (DOCX)", 1_200_000)],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000203",
    category: "abnt",
    institution: "unopar",
    name: "Guia de Formatação ABNT",
    slug: "guia-formatacao-abnt",
    shortDescription: "Guia passo a passo para formatar TCC, dissertação e tese nas normas ABNT.",
    description:
      "E-book com o passo a passo da normalização: margens, fontes, espaçamento, sumário, citações, referências e elementos pré-textuais, com checklists para cada parte.",
    pricingUnit: "fixed",
    basePriceCents: 5990,
    discountType: "sale_price",
    discountValue: 3990,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["Passo a passo visual com exemplos", "Checklists prontos"],
    audience: ["Qualquer pessoa formatando um trabalho acadêmico"],
    includes: ["E-book (PDF)", "Resumo em uma página (PDF)"],
    faqs: [{ question: "Cobre a última versão das normas?", answer: "O guia é baseado nas NBR 14724, 6023, 10520, 6024 e 6027 vigentes e recebe atualizações." }],
    isFeatured: true,
    isBestSeller: false,
    isNew: false,
    sortOrder: 3,
    files: [
      file("00000000-0000-4000-8000-000000000904", "Guia-Formatacao-ABNT.pdf", "Guia completo (PDF)", 3_800_000),
      file("00000000-0000-4000-8000-000000000905", "Checklist-ABNT.pdf", "Checklist (PDF)", 300_000),
    ],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000204",
    category: "apresentacoes",
    institution: "anhanguera",
    name: "Template de Apresentação de TCC",
    slug: "template-apresentacao-tcc",
    shortDescription: "Template de slides profissional para a defesa do TCC, editável no PowerPoint.",
    description:
      "Conjunto de slides em .pptx com layout profissional em harmonia com a identidade da marca: capa, sumário, resultados, gráficos e encerramento. Fontes e cores prontas para alterar.",
    pricingUnit: "fixed",
    basePriceCents: 4990,
    discountType: "none",
    discountValue: 0,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["Layout profissional pronto", "Slide de abertura e encerramento"],
    audience: ["Graduandos e pós-graduandos na defesa e em seminários"],
    includes: ["Arquivo .pptx editável", "Roteiro de fala sugerido (PDF)"],
    faqs: [],
    isFeatured: false,
    isBestSeller: false,
    isNew: true,
    sortOrder: 4,
    files: [
      file("00000000-0000-4000-8000-000000000906", "Template-Defesa-TCC.pptx", "Template de slides (PPTX)", 5_100_000),
      file("00000000-0000-4000-8000-000000000907", "Roteiro-de-fala.pdf", "Roteiro de fala (PDF)", 420_000),
    ],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000205",
    category: "templates",
    name: "Kit Acadêmico · 315 modelos editáveis",
    slug: "kit-academico-modelos",
    shortDescription: "Pacote com templates para TCC, artigo, projeto, apresentação e documentos acadêmicos.",
    description:
      "O kit completo de materiais de apoio: modelos de TCC e artigo, projetos de pesquisa, regras de formatação, apresentações, planilhas de cronograma e roteiros de escrita. Um único pacote com os recursos essenciais para a jornada acadêmica.",
    pricingUnit: "fixed",
    basePriceCents: 19990,
    discountType: "sale_price",
    discountValue: 14990,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["315 modelos organizados em pastas", "Um único pacote para toda a graduação"],
    audience: ["Graduandos do início ao fim do curso", "Pós-graduandos"],
    includes: ["Arquivo .zip com os 315 modelos", "Sumário do conteúdo (PDF)"],
    faqs: [{ question: "Quais formatos estão no kit?", answer: "DOCX, PPTX, XLSX e PDF, organizados por categoria." }],
    isFeatured: true,
    isBestSeller: true,
    isNew: false,
    sortOrder: 5,
    files: [file("00000000-0000-4000-8000-000000000908", "Kit-Academico-315-modelos.zip", "Kit completo (ZIP)", 48_000_000)],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000206",
    category: "templates",
    institution: "estacio",
    name: "Modelo de Projeto de Pesquisa",
    slug: "modelo-projeto-de-pesquisa",
    shortDescription: "Modelo em Word com as seções de um projeto: problema, objetivos, metodologia e cronograma.",
    description:
      "Estrutura editável de projeto de pesquisa em .docx, com instruções em cada seção para você preencher o seu próprio projeto com segurança.",
    pricingUnit: "fixed",
    basePriceCents: 7990,
    discountType: "percent",
    discountValue: 20,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["Seções com instruções no próprio documento"],
    audience: ["Quem precisa aprovar um projeto de pesquisa ou TCC"],
    includes: ["Arquivo .docx editável", "Cronograma em planilha (XLSX)"],
    faqs: [],
    isFeatured: false,
    isBestSeller: false,
    isNew: false,
    sortOrder: 6,
    files: [
      file("00000000-0000-4000-8000-000000000909", "Modelo-Projeto-de-Pesquisa.docx", "Modelo de projeto (DOCX)", 980_000),
      file("00000000-0000-4000-8000-000000000910", "Cronograma.xlsx", "Cronograma (XLSX)", 120_000),
    ],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000207",
    category: "templates",
    institution: "unopar",
    name: "Checklist de Revisão de TCC",
    slug: "checklist-revisao-tcc",
    shortDescription: "Checklist de mais de 80 itens para revisar estrutura, conteúdo e normas antes da entrega.",
    description:
      "Planilha e lista de verificação para revisar o trabalho antes da entrega: estrutura, coesão, metodologia, normas, referências e apresentação. Ajuda a evitar os erros mais comuns.",
    pricingUnit: "fixed",
    basePriceCents: 2990,
    discountType: "none",
    discountValue: 0,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["80+ itens organizados por etapa"],
    audience: ["Quem está na reta final do TCC"],
    includes: ["Planilha de revisão (XLSX)", "Versão em PDF para imprimir"],
    faqs: [],
    isFeatured: false,
    isBestSeller: false,
    isNew: true,
    sortOrder: 7,
    files: [
      file("00000000-0000-4000-8000-000000000911", "Checklist-Revisao-TCC.xlsx", "Checklist (XLSX)", 210_000),
      file("00000000-0000-4000-8000-000000000912", "Checklist-Revisao-TCC.pdf", "Checklist para imprimir (PDF)", 260_000),
    ],
  }),
  product({
    id: "00000000-0000-4000-8000-000000000208",
    category: "ebooks",
    institution: "uniasselvi",
    name: "E-book: Como escrever um TCC do zero",
    slug: "ebook-como-escrever-tcc-do-zero",
    shortDescription: "Roteiro prático de escrita do TCC, do tema à versão final, com método de escrita em etapas.",
    description:
      "E-book com um método simples para escrever o TCC sem travar: escolha de tema, problema de pesquisa, planejamento de escrita, primeiras versões, revisão e preparação para a defesa.",
    pricingUnit: "fixed",
    basePriceCents: 6990,
    discountType: "percent",
    discountValue: 15,
    minQuantity: 1,
    maxQuantity: 1,
    deliveryDays: 0,
    deliveryLabel: "Entrega imediata",
    benefits: ["Método de escrita passo a passo", "Exemplos práticos"],
    audience: ["Quem está começando o TCC", "Quem está travado na escrita"],
    includes: ["E-book (PDF)", "Capa personalizada para leitura em dispositivos"],
    faqs: [],
    isFeatured: false,
    isBestSeller: false,
    isNew: true,
    sortOrder: 8,
    files: [file("00000000-0000-4000-8000-000000000913", "E-book-Como-escrever-um-TCC.pdf", "E-book (PDF)", 4_600_000)],
  }),
];

export const DEMO_FAQS = [
  { question: "Como recebo os produtos?", answer: "Imediatamente. Assim que o pagamento é confirmado, os produtos comprados ficam disponíveis para download na sua conta, em \"Meus produtos\".", category: "pedidos" },
  { question: "O que está incluso no preço?", answer: "O arquivo (ou conjunto de arquivos) descrito na página de cada produto. Nada é cobrado depois da compra.", category: "produtos" },
  { question: "Quais formas de pagamento são aceitas?", answer: "Pix, com confirmação automática, e cartão de crédito, com opção de parcelamento.", category: "pagamento" },
  { question: "Posso baixar mais de uma vez?", answer: "Sim. Depois de comprado, o produto fica disponível na sua conta para baixar quantas vezes precisar.", category: "seguranca" },
  { question: "Os materiais substituem o conteúdo que devo produzir?", answer: "Não. São modelos, guias e recursos de apoio para você estruturar e escrever o seu próprio trabalho com mais segurança e autonomia.", category: "produtos" },
];