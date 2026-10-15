# Barreiro em Campo — mapa territorial público

**Site planejado:** https://spinolaigor.github.io/barreiro-em-campo/

Projeto público de consulta cartográfica das **10 microrregiões da Regional Barreiro (Belo Horizonte)**, com busca por micro, bairro ou avenida, camadas territoriais e localização aproximada mediante permissão do navegador.

**Elaboração cartográfica e estruturação das camadas vetoriais derivadas:** Igor Spínola Mello (2026).  
**Fontes de referência:** Prefeitura de Belo Horizonte (PBH) e demais insumos geográficos do projeto. Consulte [CREDITOS.md](CREDITOS.md) e [LICENSE.txt](LICENSE.txt).

## Ativar a publicação (uma única vez)

1. Acesse [Settings → Pages](https://github.com/spinolaigor/barreiro-em-campo/settings/pages).
2. Em **Build and deployment**, selecione **GitHub Actions** como origem (*Source*).
3. Confira a execução automática em [Actions](https://github.com/spinolaigor/barreiro-em-campo/actions/workflows/pages.yml).
4. Aguarde a execução mostrar **Success**. Só então distribua o endereço HTTPS do site para os fiscais.

O fluxo `.github/workflows/pages.yml` já está criado para publicar automaticamente cada alteração da branch `main`. A ativação inicial do Pages deve ser feita pelo proprietário do repositório.

## Conteúdo público

- `index.html`: mapa interativo com 10 micros, 79 localidades e corredores candidatos
- `micros.geojson`: polígonos geográficos e metadados de proveniência
- `CREDITOS.md` e `LICENSE.txt`: créditos, direitos e restrições de uso

**Privacidade:** esta edição pública não inclui nomes dos fiscais. O GPS só é consultado após autorização do usuário. O projeto não substitui delimitação oficial nem verificação de ruas limítrofes.

**Compartilhamento:** após a publicação, um link individual para uma micro pode ser enviado com `#micro=01`, substituindo o número.

Para visualizar as geometrias no aplicativo Google Maps, é necessário importá-las separadamente no Google My Maps; o site não oferece navegação por voz.
