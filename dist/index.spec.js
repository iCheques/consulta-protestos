const { default: consultarProtestos } = require(".");

describe("consultarProtestos", () => {
  it("deve retornar dados de protesto para um CPF/CNPJ válido", async () => {
    const cpfCnpj = process.env.CPF_CNPJ_TO_COVER ?? "04134373026";
    const resultado = await consultarProtestos(cpfCnpj);
    expect(resultado).toBeDefined();
    expect(resultado.conteudo).toBeInstanceOf(Array);
  });
});
