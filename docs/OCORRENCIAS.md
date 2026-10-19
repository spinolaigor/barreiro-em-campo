# Buracos e relatório de execução — Barreiro em Campo

**Versão de referência:** v0.4.6-beta (19/10/2026). **Piloto público, homologação física pendente.**

## Registro em campo

1. Iniciar **Ronda GPS** em uma das dez micros, com posição válida.
2. Tocar **+ Buraco** **uma vez para cada buraco**; salvar `B001`, `B002`, `B003` etc. (sequência reinicia em outra ronda).
3. Cada marcação guarda GPS, precisão informada pelo aparelho, horário, micro e bairro. Não exige foto nem preenchimento manual.
4. O sistema tenta completar **logradouro e número aproximado** por cadastro PBH/CTM local. Em esquina ou resultado duvidoso, a referência pode ser editada, sem substituir o GPS.
5. Pausar e retomar mantém **os mesmos IDs**, sem inserir trechos fictícios entre segmentos GPS.
6. **Finalizar** preserva a ronda no histórico. Em **Rondas salvas**, tocar **Gerar relatório (PDF + CSV)** na ronda desejada.

O **PDF** contém uma capa objetiva: micro e período, km GPS registrados, tempo ativo, total de buracos, distribuição por bairro e mapa da micro com contorno, trajeto e marcações. Nas páginas seguintes, há uma **relação individual** agrupada por bairro e logradouro, com **ID, rua, nº aproximado e horário**. No mapa, pontos coincidentes podem aparecer sob um marcador com contagem; na relação permanecem **todos os IDs**. **Não deduplicar por endereço nem coordenada.**

O **CSV** tem uma linha por marcação **da ronda selecionada**, com ID, data/hora, micro, bairro, rua, número, latitude, longitude, precisão GPS e link Google Maps. Não confundir com o CSV técnico do rastro.

O relatório é preparado **no navegador** e compartilhado manualmente. Sem suporte a compartilhamento conjunto, são baixados os dois arquivos. Se houver endereços pendentes, o aplicativo solicita preenchimento antes da entrega; preservar os dados e corrigir o necessário.

## Endereçamento e limites

- Base pública reduzida para a Regional Barreiro: 7.321 segmentos de logradouro e 94.444 referências numéricas do cadastro CTM/PBH, corte de 04/05/2026.
- O cadastro compactado é servido pelo site e consultado localmente no navegador; **primeiro carregamento depende de acesso à base**. Não há geocodificação remota contínua nem envio intencional de GPS a serviço externo.
- Rua e número são **referências operacionais próximas**; não comprovam a posição exata do buraco nem a existência física de imóvel diante dele. Cruzamentos e vias paralelas exigem conferência.
- A marcação requer ronda ativa e posição recente, dentro da micro e com precisão aceita. GPS impreciso/antigo ou fora da área **não deve gerar ponto**.
- A distância do percurso é estimativa baseada nos pontos GPS aceitos, **não extensão integral de ruas vistoriadas**.
- Todos os registros ficam no `localStorage` do aparelho, não no GitHub. **PDF/CSV não são backup integral**: baixar JSON em **Segurança e recuperação** para proteger histórico e ronda atual.

## Evidência e verificação

- PRs de referência: [#7](https://github.com/spinolaigor/barreiro-em-campo/pull/7) (marcação), [#8](https://github.com/spinolaigor/barreiro-em-campo/pull/8) (PDF/CSV), [#9](https://github.com/spinolaigor/barreiro-em-campo/pull/9) (referência cadastral) e [#10](https://github.com/spinolaigor/barreiro-em-campo/pull/10) (relatório executivo com mapa).
- Suíte automatizada de **50 testes** + simulação Chromium móvel com GPS virtual: **aprovadas**, incluindo geração/leitura do PDF e CSV, 3 buracos e cenário **sintético** de 91 IDs sem deduplicação.
- Na Micro 07 em 19/10/2026, o consolidado de **91 marcações** coincidiu com a anotação manual **relatada pela equipe**. Endereços, GPS físico e PDF final ainda precisam de conferência operacional.

**Homologação pendente:** [Issue #2](https://github.com/spinolaigor/barreiro-em-campo/issues/2) · [Roteiro de campo](TESTE_GPS_MOBILE.md). Não registrar nomes de fiscais ou coordenadas individuais nos Issues públicos.
