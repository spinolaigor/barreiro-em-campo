# Barreiro em Campo — mapa territorial público

**Site em operação (piloto):** https://spinolaigor.github.io/barreiro-em-campo/ · **Versão atual:** v0.4.6-beta (piloto de campo) — [histórico de versões](VERSOES.md)

**Validação física pendente:** o GPS e a marcação de buracos passaram em testes de lógica e em Chromium com GPS virtual, mas o comportamento de posicionamento real precisa ser testado no Android. Faça backup das rondas e mantenha a página aberta durante o teste.

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

## Marcação rápida de buracos (v0.4.3-beta)
Durante uma ronda ativa, toque em **＋ Buraco** para registrar um ponto individual, com coordenadas GPS, horário, precisão, micro e bairro. Não exige foto nem formulário.
O código da ocorrência é sequencial em cada ronda. O aplicativo consulta **localmente** uma base compacta do Cadastro Técnico Municipal (PBH, 04/05/2026) para associar a rua ao GPS e informar um **número cadastral próximo**. Nas esquinas, o trajeto recente pode ajudar a escolher a via. As referências são **aproximadas e sujeitas à conferência**, não comprovam o imóvel exato diante do buraco. A operação de marcar permanece com um toque; a consulta é executada depois de salvar o ponto. Se faltar referência ou houver dúvida, use **Ronda GPS → Buracos (N) → Editar referência**. O botão de compartilhar pede correção de campos pendentes antes de gerar PDF e CSV. O cadastro público é servido como arquivo compacto; as coordenadas das rondas não são enviadas para geocodificação.
Abra **Ronda GPS → Buracos (N)** e toque em **Compartilhar relatório (PDF + planilha)**. Um único toque cria os dois arquivos da ronda: PDF legível e CSV para tratamento. Em aparelhos compatíveis, o menu de compartilhamento abre com ambos os arquivos, e o fiscal escolhe o destinatário. Quando o navegador não aceita envio de dois arquivos, os dois são baixados juntos, sem escolha de formato. Também faça o **backup completo JSON**. Os dados ficam somente neste navegador até exportação e compartilhamento manual.
Consulte [instruções e limitações](docs/OCORRENCIAS.md). O teste automatizado em Chromium inclui três locais simulados, vídeo, prints, leitura do PDF, leitura do CSV e confirmação de dois arquivos entregues à API de compartilhamento simulada. **Nenhum envio real é feito sem seleção do destinatário.** O GPS virtual não substitui teste físico em Android.

## Versões e falhas de GPS (v0.4.0)

Consulte [VERSOES.md](VERSOES.md) para saber o que mudou no aplicativo e comparar versões anteriores pelo histórico de commits. O mapa registra eventos de pausa, falhas e intervalos longos sem pontos de GPS e marca **o último ponto válido antes de uma interrupção** em laranja. Esse marcador **não representa necessariamente o local exato da perda do GPS**.

O histórico de versões do site **não é backup das rondas**. As rondas permanecem neste navegador até serem exportadas; salvar arquivos GPX, GeoJSON ou CSV ao terminar cada ronda é essencial para evitar perda de dados. Arquivos de trajetória incluem coordenadas e horários, portanto devem ser guardados e compartilhados somente com as pessoas autorizadas.

## Preservação e backup (v0.4.1)

O painel da ronda oferece **Baixar backup completo** em JSON. O arquivo inclui o histórico e a ronda atual, inclusive dados ainda em memória se o salvamento falhar. Confira o download e envie pelo celular ao local privado autorizado. Não envie rondas para este repositório ou para a pasta de publicação do site.

Não há mais descarte automático por quantidade de rondas, pontos do histórico ou eventos. O armazenamento continua finito: se falhar, a coleta é pausada e o usuário deve baixar o backup antes de fechar a página. Use apenas uma aba para gravar. Não há sincronização automática entre aparelhos nem importador de backup na interface nesta versão.

Para validar o código: `node --check ronda.js` e `node --test tests/*.test.cjs`. Consulte [RECUPERACAO.md](RECUPERACAO.md) para retorno de versão.
