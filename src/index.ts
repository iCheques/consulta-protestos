import { Client } from "@credithub/webservice";
import { select } from "xpath";

// Define the TypeScript interfaces to represent the structured data
export interface Protest {
  cpfCnpj: string;
  data: string;
  dataProtesto: string;
  valor: number;
  valorProtestado: number;
  anuenciaVencida: boolean;
  temAnuencia: boolean;
  nomeApresentante: string;
  nomeCedente: string;
  nm_chave: string;
  vl_custas?: number; // Optional field for 'vl_custas'
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
  situacao: string;
  conteudo: Cartorio[];
  cenprotDetalhesSp: string;
  registros: number;
}

export default async function consultarProtestos(
  cpfCnpj: string,
  apiKey?: string
) {
  const webService = new Client.WebService(
    apiKey || process.env.CREDITHUB_APIKEY
  );

  const response = await webService.request(
    "SELECT FROM 'IEPTB'.'IEPTBHARLAN'",
    { documento: cpfCnpj }
  );
  const content = await Client.WebService.parse(response);
  const data = parseXMLData(content);
  return data;
}

// Function to parse the XML data using XPath
function parseXMLData(dom: Node): Consulta {
  const consulta: Consulta = {
    situacao: select("string(//consulta/@documento)", dom) as string,
    conteudo: [],
    cenprotDetalhesSp: select("string(//cenprotDetalhesSp)", dom) as string,
    registros: parseInt(select("string(//registros)", dom) as string, 10),
  };

  // Get all 'cartorio' elements
  const cartorioElems = select("//cartorio", dom) as Node[];

  // Iterate through each 'cartorio' element
  for (let i = 0; i < cartorioElems.length; i++) {
    const cartorioElem = cartorioElems[i] as Element;
    const cartorio: Cartorio = {
      nome: select("string(nome)", cartorioElem) as string,
      endereco: select("string(endereco)", cartorioElem) as string,
      bairro: select("string(bairro)", cartorioElem) as string,
      cidade: select("string(cidade)", cartorioElem) as string,
      uf: select("string(uf)", cartorioElem) as string,
      telefone: select("string(telefone)", cartorioElem) as string,
      codigo_cartorio: select(
        "string(codigo_cartorio)",
        cartorioElem
      ) as string,
      codigo_cidade: select("string(codigo_cidade)", cartorioElem) as string,
      protestos: [],
    };

    // Get all 'protesto' elements within the 'cartorio'
    const protestoElems = select("./protesto", cartorioElem) as Node[];

    // Iterate through each 'protesto' element
    for (let j = 0; j < protestoElems.length; j++) {
      const protestoElem = protestoElems[j] as Element;
      const protesto: Protest = {
        cpfCnpj: select("string(cpfCnpj)", protestoElem) as string,
        data: select("string(data)", protestoElem) as string,
        dataProtesto: select("string(dataProtesto)", protestoElem) as string,
        valor: parseFloat(select("string(valor)", protestoElem) as string),
        valorProtestado: parseFloat(
          select("string(valorProtestado)", protestoElem) as string
        ),
        anuenciaVencida:
          select("string(anuenciaVencida)", protestoElem) === "true",
        temAnuencia: select("string(temAnuencia)", protestoElem) === "true",
        nomeApresentante: select(
          "string(nomeApresentante)",
          protestoElem
        ) as string,
        nomeCedente: select("string(nomeCedente)", protestoElem) as string,
        nm_chave: select("string(nm_chave)", protestoElem) as string,
      };

      // Check if 'vl_custas' exists and extract it if it does
      const vlCustas = select("string(vl_custas)", protestoElem) as
        | string
        | null;
      if (vlCustas) {
        protesto.vl_custas = parseFloat(vlCustas);
      }

      cartorio.protestos.push(protesto);
    }

    consulta.conteudo.push(cartorio);
  }

  return consulta;
}
