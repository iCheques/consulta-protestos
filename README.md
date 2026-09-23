# @credithub/consulta-protesto

Cliente Node.js para consultar protestos de um CPF ou CNPJ pela API CreditHub. O pacote envia a consulta à rota `IEPTB.IEPTBHARLAN` e converte a resposta XML em um objeto JavaScript tipado.

É necessária uma chave de API CreditHub com acesso à consulta de protestos. [Conheça a CreditHub](https://credithub.com.br/).

## Instalação

```bash
npm install @credithub/consulta-protesto
```

## Uso

```ts
import consultarProtestos from '@credithub/consulta-protesto';

async function main() {
  const resultado = await consultarProtestos('SEU_CPF_OU_CNPJ', process.env.CREDITHUB_APIKEY);

  console.log(resultado.situacao); // "CONSTA" ou "NÃO CONSTA"
  console.log(resultado.registros); // quantidade informada pela consulta

  for (const cartorio of resultado.conteudo) {
    for (const protesto of cartorio.protestos) {
      console.log(cartorio.nome, cartorio.uf, protesto.valorProtestado);
    }
  }
}

main().catch(console.error);
```

O segundo argumento é opcional quando `CREDITHUB_APIKEY` está definida no ambiente. Mantenha a chave no servidor; não a inclua em código enviado ao navegador. A função retorna `Promise<Consulta>` e rejeita a promessa quando a API, a rede ou a leitura da resposta falha.

## Estrutura do retorno

Exemplo ilustrativo de uma resposta com um título:

```json
{
  "documento": "00058067000187",
  "situacao": "CONSTA",
  "registros": 1,
  "cenprotDetalhesSp": "pass",
  "conteudo": [
    {
      "nome": "Cartório de exemplo",
      "endereco": "",
      "bairro": "",
      "cidade": "Belo Horizonte",
      "uf": "MG",
      "telefone": "",
      "codigo_cartorio": "01",
      "codigo_cidade": "3106200",
      "protestos": [
        {
          "cpfCnpj": "00058067000187",
          "data": "25/08/2026",
          "dataProtesto": "25/08/2026",
          "valor": 1152,
          "valorProtestado": 1152,
          "anuenciaVencida": false,
          "temAnuencia": false,
          "nomeApresentante": "",
          "nomeCedente": "",
          "nm_chave": "07200012025000184260825"
        }
      ]
    }
  ]
}
```

| Campo | Significado |
| --- | --- |
| `documento` | Documento informado no atributo da resposta da API. |
| `situacao` | Situação geral: `CONSTA` ou `NÃO CONSTA`. |
| `registros` | Quantidade de títulos informada pela API. Use este campo para o total; alguns cartórios podem vir sem detalhes dos títulos. |
| `conteudo` | Lista de cartórios encontrados. Cada cartório contém seus dados de identificação e um array `protestos` com os títulos detalhados disponíveis. |
| `cenprotDetalhesSp` | Estado dos detalhes de São Paulo retornado pela API, quando presente. `pass` indica sucesso; `error` sinaliza falha nessa etapa. |

Cada item de `conteudo` tem `nome`, `endereco`, `bairro`, `cidade`, `uf`, `telefone`, `codigo_cartorio` e `codigo_cidade` como texto. Seu campo `protestos` é uma lista de títulos; ele não é a contagem do cartório.

| Campo de `protestos[]` | Tipo | Significado |
| --- | --- | --- |
| `cpfCnpj` | `string` | Documento do título, quando fornecido. |
| `data`, `dataProtesto` | `string` | Datas como vieram da API, geralmente em `DD/MM/AAAA`. |
| `valor`, `valorProtestado` | `number`, opcionais | Valores em reais. `valorProtestado` é o valor do protesto informado pela fonte. |
| `vl_custas` | `number`, opcional | Custas, quando informadas. |
| `anuenciaVencida`, `temAnuencia` | `boolean` | Indicadores de anuência. |
| `nomeApresentante`, `nomeCedente` | `string` | Identificação das partes, quando disponível. |
| `nm_chave` | `string` | Chave do título, quando fornecida. |

O pacote interpreta valores monetários nos formatos `1152.00`, `1.152,00` e `1.152`. Campos de texto ausentes são retornados como `""`; valores monetários ausentes são omitidos. Um booleano ausente é `false`.

Uma consulta sem protestos retorna `situacao: "NÃO CONSTA"`, `registros: 0` e, normalmente, `conteudo: []`. Não use apenas o tamanho de `conteudo` ou dos arrays `protestos` para decidir se há registros: a API pode informar um total mesmo quando algum detalhe não foi disponibilizado.

## Erros

Use `try/catch` ou `.catch()` para lidar com falhas. Sem uma chave de API, a função rejeita com `Informe a API key ou defina CREDITHUB_APIKEY.`. Erros de autenticação, limite, indisponibilidade e transporte são propagados pelo cliente `@credithub/webservice`. Uma resposta sem `consulta`, `situacao` ou `registros` válidos também é rejeitada, para não ser confundida com `NÃO CONSTA`.

## Licença

MIT.
