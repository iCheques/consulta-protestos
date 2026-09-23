import { Client } from "@credithub/webservice";
import { select } from "xpath";

export interface Protest {
  cpfCnpj: string;
  data: string;
  dataProtesto: string;
  valor?: number;
  valorProtestado?: number;
  anuenciaVencida: boolean;
  temAnuencia: boolean;
  nomeApresentante: string;
  nomeCedente: string;
  nm_chave: string;
  vl_custas?: number;
}

export interface Cartorio {
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  codigo_cartorio: string;
  codigo_cidade: string;
  protestos: Protest[];
}

export interface Consulta {
  documento: string;
  situacao: string;
  conteudo: Cartorio[];
  cenprotDetalhesSp: string;
  registros: number;
}

/** Consulta protestos de um CPF/CNPJ pela API CreditHub. */
export default async function consultarProtestos(
  cpfCnpj: string,
  apiKey?: string
): Promise<Consulta> {
  const key = apiKey || process.env.CREDITHUB_APIKEY;
  if (!key) {
    throw new Error("Informe a API key ou defina CREDITHUB_APIKEY.");
  }

  const webService = new Client.WebService(key);
  const response = await webService.request(
    "SELECT FROM 'IEPTB'.'IEPTBHARLAN'",
    { documento: cpfCnpj }
  );
  const content = await Client.WebService.parse(response);
  return parseXMLData(content);
}

function value(path: string, node: Node): string {
  return select(`string(${path})`, node) as string;
}

function money(raw: string): number | undefined {
  const input = raw.trim().replace(/\s|R\$/g, "");
  if (!input) return undefined;

  // A API combina valores normalizados (1152.00) e valores pt-BR (1.152,00).
  const normalized = input.includes(",")
    ? input.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(input)
    ? input.replace(/\./g, "")
    : input;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function affirmative(raw: string): boolean {
  return ["true", "1", "sim"].includes(raw.trim().toLowerCase());
}

function parseXMLData(dom: Node): Consulta {
  const root = select("//consulta", dom) as Node[];
  if (!root.length) {
    throw new Error("A resposta não contém uma consulta de protestos.");
  }

  const situacao = value("situacao", root[0]);
  const registrosRaw = value("registros", root[0]);
  const registros = Number(registrosRaw);
  if (!situacao || !registrosRaw || !Number.isInteger(registros) || registros < 0) {
    throw new Error("A resposta contém um resumo de protestos inválido.");
  }

  const consulta: Consulta = {
    documento: value("@documento", root[0]),
    situacao,
    conteudo: [],
    cenprotDetalhesSp: value("cenprotDetalhesSp", root[0]),
    registros,
  };

  const cartorios = select("./conteudo/cartorio", root[0]) as Node[];
  for (const cartorioNode of cartorios) {
    const cartorio: Cartorio = {
      nome: value("nome", cartorioNode),
      endereco: value("endereco", cartorioNode),
      bairro: value("bairro", cartorioNode),
      cidade: value("cidade", cartorioNode),
      uf: value("uf", cartorioNode),
      telefone: value("telefone", cartorioNode),
      codigo_cartorio: value("codigo_cartorio", cartorioNode),
      codigo_cidade: value("codigo_cidade", cartorioNode),
      protestos: [],
    };

    const protestos = select("./protesto", cartorioNode) as Node[];
    for (const protestoNode of protestos) {
      const protesto: Protest = {
        cpfCnpj: value("cpfCnpj", protestoNode),
        data: value("data", protestoNode),
        dataProtesto: value("dataProtesto", protestoNode),
        anuenciaVencida: affirmative(value("anuenciaVencida", protestoNode)),
        temAnuencia: affirmative(value("temAnuencia", protestoNode)),
        nomeApresentante: value("nomeApresentante", protestoNode),
        nomeCedente: value("nomeCedente", protestoNode),
        nm_chave: value("nm_chave", protestoNode),
      };

      const valor = money(value("valor", protestoNode));
      const valorProtestado = money(value("valorProtestado", protestoNode));
      const custas = money(value("vl_custas", protestoNode));
      if (valor !== undefined) protesto.valor = valor;
      if (valorProtestado !== undefined) protesto.valorProtestado = valorProtestado;
      if (custas !== undefined) protesto.vl_custas = custas;
      cartorio.protestos.push(protesto);
    }

    consulta.conteudo.push(cartorio);
  }

  return consulta;
}
