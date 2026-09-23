const { Client } = require('@credithub/webservice');
const consultarProtestos = require('../dist/index.js').default;

const resposta = (consulta) => ({
  headers: { get: () => 'text/xml' },
  text: async () => `<BPQL><content>${consulta}</content></BPQL>`,
});

describe('consultarProtestos', () => {
  let request;

  beforeEach(() => {
    request = jest.spyOn(Client.WebService.prototype, 'request');
  });

  afterEach(() => {
    request.mockRestore();
    delete process.env.CREDITHUB_APIKEY;
  });

  test('retorna resumo e títulos com valores pt-BR', async () => {
    request.mockResolvedValue(resposta(`
      <consulta documento="00058067000187">
        <situacao>CONSTA</situacao>
        <conteudo><cartorio>
          <nome>Cartório A</nome><cidade>Belo Horizonte</cidade><uf>MG</uf>
          <protestos>1</protestos>
          <protesto>
            <cpfCnpj>00058067000187</cpfCnpj><data>25/08/2026</data>
            <valor>1152.00</valor><valorProtestado>1.152,00</valorProtestado>
            <vl_custas>R$ 12,50</vl_custas><temAnuencia>Sim</temAnuencia>
            <nm_chave>07200012025000184260825</nm_chave>
          </protesto>
        </cartorio></conteudo>
        <cenprotDetalhesSp>pass</cenprotDetalhesSp><registros>1</registros>
      </consulta>`));

    const result = await consultarProtestos('00058067000187', 'test-key');

    expect(request).toHaveBeenCalledWith(
      "SELECT FROM 'IEPTB'.'IEPTBHARLAN'",
      { documento: '00058067000187' }
    );
    expect(result.documento).toBe('00058067000187');
    expect(result.situacao).toBe('CONSTA');
    expect(result.registros).toBe(1);
    expect(result.conteudo[0].protestos[0]).toMatchObject({
      valor: 1152,
      valorProtestado: 1152,
      vl_custas: 12.5,
      temAnuencia: true,
      anuenciaVencida: false,
    });
  });

  test('preserva total sem detalhes e omite valores ausentes', async () => {
    process.env.CREDITHUB_APIKEY = 'env-key';
    request.mockResolvedValue(resposta(`
      <consulta documento="00058067000187">
        <situacao>CONSTA</situacao>
        <conteudo><cartorio><nome>Cartório B</nome><uf>SP</uf></cartorio></conteudo>
        <cenprotDetalhesSp>error</cenprotDetalhesSp><registros>2</registros>
      </consulta>`));

    const result = await consultarProtestos('00058067000187');
    expect(result.registros).toBe(2);
    expect(result.conteudo[0].protestos).toEqual([]);
    expect(result.cenprotDetalhesSp).toBe('error');
  });

  test('retorna NÃO CONSTA sem cartórios', async () => {
    request.mockResolvedValue(resposta(`
      <consulta documento="00058067000187">
        <situacao>NÃO CONSTA</situacao><conteudo></conteudo><registros>0</registros>
      </consulta>`));

    const result = await consultarProtestos('00058067000187', 'test-key');
    expect(result).toMatchObject({ situacao: 'NÃO CONSTA', registros: 0, conteudo: [] });
  });

  test('interpreta separador de milhar sem centavos', async () => {
    request.mockResolvedValue(resposta(`
      <consulta documento="00058067000187">
        <situacao>CONSTA</situacao><registros>1</registros>
        <conteudo><cartorio><protesto><valorProtestado>8.614</valorProtestado></protesto></cartorio></conteudo>
      </consulta>`));

    const result = await consultarProtestos('00058067000187', 'test-key');
    expect(result.conteudo[0].protestos[0].valorProtestado).toBe(8614);
    expect(result.conteudo[0].protestos[0]).not.toHaveProperty('vl_custas');
  });

  test('rejeita chave ausente e resposta sem resumo', async () => {
    await expect(consultarProtestos('00058067000187')).rejects.toThrow('API key');
    expect(request).not.toHaveBeenCalled();

    request.mockResolvedValue(resposta('<consulta documento="x"><conteudo/></consulta>'));
    await expect(consultarProtestos('00058067000187', 'test-key')).rejects.toThrow('resumo');
  });
});
