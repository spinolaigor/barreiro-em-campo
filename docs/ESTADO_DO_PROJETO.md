# Barreiro em Campo — Estado do projeto

**Referência:** 19/10/2026 · `main` em **v0.4.6-beta** · [aplicação publicada](https://spinolaigor.github.io/barreiro-em-campo/).  
**Natureza:** registro de engenharia e decisão para continuidade, **não** homologação definitiva da fiscalização.

## Objetivo operacional

Manter um aplicativo **simples para uso em celular**: o fiscal vê o mapa, registra uma ronda com pausas/retomadas, marca cada buraco com um toque, obtém um endereço aproximado e, ao finalizar, entrega **PDF executivo + CSV**. A interface já é funcional; o foco seguinte é **validar e aprimorar a entrega, não reconstruir a aplicação**.

## O que existe, o que foi testado e o que falta

| Frente | Disponível na v0.4.6-beta | Evidência / condição atual |
| --- | --- | --- |
| Mapa territorial | 10 micros, bairros/corredores, camadas e mapa móvel limpo | PRs #3, #5 e #6; cartografia pública de apoio, não delimitação administrativa homologada |
| Ronda GPS | Iniciar, pausar, retomar, finalizar, registrar distância e percurso por segmentos | Testes automatizados e GPS **virtual**; precisão física e uso com bloqueio de tela pendentes |
| Marcação de buracos | `+ Buraco`, códigos `B001...` **sequenciais por ronda**, GPS, bairro, horário | PR #7; **um registro por toque**, mesmo no mesmo endereço |
| Rua e número do buraco | Referência automática **aproximada** e correção manual | PR #9; bases PBH (via) + CTM (endereços); cruzamentos requerem validação |
| Relatório operacional | PDF A4 executivo com **mapa da micro, trajeto, km, tempo e buracos por bairro**; lista individual; CSV por ronda | PRs #8 e #10; leitura de PDF e compartilhamento simulados aprovados; falta conferir Android real |
| Dados da ronda | Histórico local; backup completo JSON; GPX/GeoJSON técnicos | Persistência compatível `barreiro.rondas.v1`; **não há importador** nem sincronização |
| “Onde estou?” | Posição GPS, micro/bairro e consulta visual de rua no mapa-base | **Ainda não mostra nome de rua calculado no texto do painel**; Issue #4 |

**Distinções essenciais:** código publicado ≠ homologação física; contagem de ocorrências ≠ localização exata; distância GPS ≠ malha viária efetivamente vistoriada; relatório operacional ≠ backup integral.

## Evidência da Micro 07 — 19/10/2026

- A equipe informou **91 buracos** no controle manual, em concordância com o total consolidado de registros da ronda.
- O levantamento consolidado reuniu **24 registros do GPX** e **67 do JSON**, totalizando 91 no exercício de conferência.
- O cruzamento preliminar da base PBH atribuiu **referências cadastrais próximas aos 91 registros**; **27** foram sinalizados para conferência prioritária por ambiguidades espaciais.
- **Isso valida uma concordância de contagem de campo**, não comprova a exatidão dos 91 números, nem a execução de uma única exportação PDF de ponta a ponta com todos esses registros.
- A suíte de teste de **91 IDs** presente no repositório é **sintética** e verifica principalmente **que registros coincidentes não são eliminados**.

Esses dados individuais não devem ser copiados para repositório público. Conferências detalhadas devem ocorrer com arquivos de campo em ambiente autorizado.

## Cadeia de versões / Pull Requests

| Etapa | PR | Resultado |
| --- | --- | --- |
| Correções iniciais de posicionamento | [#3](../pull/3) | Integrada |
| GPS ao vivo e interface limpa | [#5](../pull/5), [#6](../pull/6) | Consolidada pela #6 |
| Marcação rápida de buracos | [#7](../pull/7) | v0.4.3-beta |
| PDF e CSV com uma ação | [#8](../pull/8) | v0.4.4-beta |
| Rua/número aproximados via PBH | [#9](../pull/9) | v0.4.5-beta |
| Relatório com mapa e relação individual | [#10](../pull/10) | v0.4.6-beta |
| GPS antigo em rascunho | [#1](../pull/1) | Encerrado **sem merge**, superado pela #6 |

O histórico de commits, PRs e branches antigas permanece rastreável. **Não mesclar branches antigas por tentativa**, pois podem sobrescrever mudanças consolidadas.

## Backlog e decisão de produto

1. **[Issue #2](../issues/2)** — Homologar **PDF + CSV por ronda** em Android, conteúdo da capa, contagem por bairro, relação de IDs e muitos pontos.
2. **[Issue #4](../issues/4)** — Exibir nome de rua provável também na ferramenta **Onde estou?** (diferente de preencher endereços de buracos).
3. **[Issue #11](../issues/11)** — Confiabilidade de backup/restauração, armazenamento local e histórico entre aparelhos.

Ver [plano de evolução](PLANO_DE_EVOLUCAO.md). Nenhuma alteração do aplicativo é proposta neste documento; a próxima entrega deve decorrer de problema verificado no uso e ter testes/critério de aceite.

## Fontes e segurança

Cartografia e nomes oficiais: [Trecho Logradouro PBH](https://dados.pbh.gov.br/dataset/trecho-logradouro-2), cadastro de endereços CTM/PBH (corte de 04/05/2026), [CREDITOS.md](../CREDITOS.md). A base derivada estática de ruas/números é pública; **coordenadas reais de rondas, nomes de fiscais e histórico do aparelho não**.
