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

## Modo Ronda GPS — versão experimental

O mapa conta com um botão **Ronda GPS**, disponível no celular. A experiência foi desenhada para três ações simples:

1. **Iniciar ronda** — selecionar a micro e autorizar o GPS.
2. **Marcar vistoria** — registrar com um toque um ponto efetivamente inspecionado (a posição precisa estar recente e dentro da micro escolhida).
3. **Finalizar** — pausar e retomar quando necessário; ao terminar, salvar o percurso e exportar em **GPX, GeoJSON ou CSV**.

Os pontos de GPS entram no registro apenas **dentro da micro selecionada**. Leituras com precisão ruim, saltos impossíveis e pausas são tratados de forma conservadora. O caminho traçado é **indicativo**, não representa automaticamente a cobertura ou a conclusão de todas as ruas.

**Privacidade:** os percursos e marcações são gravados somente no armazenamento local do navegador no próprio aparelho, e **não são publicados no repositório ou enviados ao GitHub**. Exportar cria um arquivo para o usuário compartilhar sob sua responsabilidade. Qualquer pessoa com acesso ao aparelho/navegador poderá visualizar os registros locais; convém utilizar dispositivo autorizado e gerenciar os arquivos exportados com cuidado.

**Limitação importante:** o site usa Geolocation API com a página em primeiro plano. Os navegadores móveis podem pausar o GPS ao bloquear a tela ou alternar para outro aplicativo. Por isso, o modo de ronda **pausa ao sair de foco**, e precisa ser retomado quando voltar à página. Recurso de manter tela acesa é solicitado quando disponível, mas **não há gravação garantida em segundo plano**. Nunca opere o celular enquanto dirige; delegue a interação ao passageiro ou pare em local seguro.

**Resiliência:** a ronda é salva no navegador ao longo do percurso. Após recarregar a página, uma ronda interrompida pode ser retomada manualmente. Limpar o armazenamento do navegador pode apagar os registros não exportados. Para uso oficial e continuado, fazer pilotos em diferentes celulares e estabelecer orientações de privacidade e conservação dos dados.

A análise de percentual de ruas percorridas ou consideradas vistoriadas **não está implementada**; isso exige associar GPS à malha viária e definir regras operacionais de aceitação da vistoria.
