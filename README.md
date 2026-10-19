# Barreiro em Campo

**Mapa e apoio à fiscalização das 10 microrregiões da Regional Barreiro, Belo Horizonte.**

**Aplicativo:** https://spinolaigor.github.io/barreiro-em-campo/  
**Versão pública:** `v0.4.6-beta` — piloto em validação operacional (19/10/2026).  
**Situação e próximas etapas:** [Estado do projeto](docs/ESTADO_DO_PROJETO.md) · [Plano de evolução](docs/PLANO_DE_EVOLUCAO.md) · [Histórico](VERSOES.md).

## Para que serve

- Consultar **10 micros**, bairros, limites territoriais e corredores no mapa.
- Realizar **ronda GPS**: iniciar, pausar, retomar e finalizar, com trajeto aproximado salvo no próprio navegador.
- Registrar **buracos individualmente**, com um toque em **+ Buraco**, sem foto nem formulário obrigatório.
- Associar a cada buraco **rua e número de referência aproximado** a partir de cadastro PBH/CTM local, sujeito a conferência em campo.
- Entregar **um PDF executivo e um CSV por ronda**, sem misturar rondas diferentes.

**Princípio operacional:** um ID de ocorrência corresponde a um buraco. Se três marcações forem feitas diante do mesmo endereço, **são três buracos**, sem deduplicação por coordenada, rua ou número.

## Como utilizar na fiscalização

1. Abrir o aplicativo e selecionar a **micro**.
2. Em **Ronda GPS**, tocar **Iniciar**. Manter a página em primeiro plano e conferir a localização.
3. Tocar **+ Buraco** para cada ocorrência. O identificador sequencial é `B001`, `B002`, `B003` etc. **por ronda**. O GPS grava a posição primeiro; a referência de endereço é preenchida posteriormente.
4. Usar **Pausar** e **Retomar** quando necessário. A mesma ronda preserva seu ID e os registros já feitos. Pausas não devem gerar linhas fictícias no trajeto.
5. Ao concluir, tocar **Finalizar**. A ronda fica no histórico local; escolher **Gerar relatório (PDF + CSV)** nela. Conferir referências pendentes antes de compartilhar.

### O que vem no relatório

**Primeira página do PDF:** identificação da micro e da ronda, início/fim, distância GPS aproximada, tempo ativo, total de buracos, totais por bairro e **mapa da micro** com contorno, percurso e marcações. O desenho é gerado a partir da cartografia e das posições registradas, não é uma prova de cobertura integral das ruas.

**Demais páginas:** relação dos buracos por **bairro e logradouro**, com **um ID por marcação**, rua, número de referência aproximado e horário. O CSV é complementar e mantém coordenadas, precisão do GPS e link para localização no Google Maps.

**Arquivos e privacidade:** os relatórios são gerados no navegador; em aparelhos compatíveis, o fiscal escolhe o destinatário pelo menu de compartilhamento. Se o envio conjunto não for suportado, são baixados PDF e CSV. O projeto não envia automaticamente as rondas ao GitHub, ao Drive nem a um servidor do aplicativo.

## Relatório não é backup

- **PDF + CSV:** entrega operacional de **uma** ronda à equipe.
- **Backup completo JSON:** cópia de segurança da **ronda em andamento e de todo o histórico**. Fica recolhido em **Segurança e recuperação** no painel; em falha de gravação aparece com destaque.
- **GPX/GeoJSON/CSV técnicos de trajeto:** disponíveis como opções avançadas, não como entrega principal.

O armazenamento `localStorage` é do aparelho/navegador; não existe sincronização automática entre aparelhos nem importação de backup pela interface. Antes de trocar de celular, limpar dados do site ou testar alterações importantes, faça **backup completo JSON** e guarde-o fora do navegador em local autorizado. Ver [RECUPERACAO.md](RECUPERACAO.md).

## Situação da validação

**Concluído tecnicamente:** publicação da `v0.4.6-beta`, suíte de **50 testes automatizados** e simulação Chromium móvel com GPS virtual, PDF legível, CSV e compartilhamento simulado; último teste de referência: [PR #10](https://github.com/spinolaigor/barreiro-em-campo/pull/10).

**Evidência operacional parcial:** na ronda da **Micro 07 (19/10/2026)**, a equipe informou **91 buracos nas anotações manuais**, compatíveis com o consolidado de 91 registros de campo. Essa concordância verifica a **contagem naquele levantamento**; **não valida automaticamente endereço de todos os pontos, quilometragem, GPS físico ou diagramação final do PDF no Android**.

**Pendente:** homologação física do GPS e da exportação no Android; conferência de rua e número aproximados em cruzamentos; checagem de PDF com grande volume de pontos. Ver [roteiro de campo](docs/TESTE_GPS_MOBILE.md) e [Issue #2](https://github.com/spinolaigor/barreiro-em-campo/issues/2).

## Limites e segurança

- O GPS é **aproximado**, condicionado à precisão e às permissões do aparelho. A coleta em segundo plano **não é garantida**; ao perder o foco a ronda pode pausar, exigindo retomada.
- O sistema distingue **distância GPS registrada** de extensão de ruas vistoriadas; passar por uma via não comprova que ela foi fiscalizada.
- A referência **“próximo ao nº”** aponta um imóvel cadastrado próximo, não confirma o número exato em frente ao buraco; o fiscal pode corrigir a referência preservando o GPS.
- A ferramenta **Onde estou?** mostra posição e referência territorial, mas **ainda não exibe automaticamente o nome da rua em texto**; essa evolução está na [Issue #4](https://github.com/spinolaigor/barreiro-em-campo/issues/4).
- Não opere o celular enquanto dirige. Dados de percurso, horário e identificação operacional precisam ser armazenados/compartilhados apenas em ambiente autorizado.

## Documentação e manutenção

- [Estado atual, evidências e limites](docs/ESTADO_DO_PROJETO.md)
- [Plano de evolução e prioridades](docs/PLANO_DE_EVOLUCAO.md)
- [Procedimento de validação física](docs/TESTE_GPS_MOBILE.md)
- [Marcação de buracos e relatórios](docs/OCORRENCIAS.md)
- [Histórico de versões](VERSOES.md) · [Recuperação dos dados](RECUPERACAO.md)
- [Créditos e fontes geográficas](CREDITOS.md) · [Licença](LICENSE.txt)

**Desenvolvimento:** HTML, CSS, JavaScript, Leaflet e GitHub Pages. O workflow [Publicar Barreiro em Campo](.github/workflows/pages.yml) publica `main`; as branches/PRs passam por testes automatizados. Para testar localmente: `node --check ronda.js` e `node --test tests/*.test.cjs`.

**Elaboração cartográfica e estruturação vetorial:** Igor Spínola Mello (2026). Fontes: PBH/CTM e insumos documentados em [CREDITOS.md](CREDITOS.md).
