# Marcação rápida de buracos — protótipo de trabalho

Este protótipo, isolado na branch `feat/marcacao-rapida-buracos`, **não integra a versão pública v0.4.2-beta**. Usar somente após validação da coleta GPS da ronda no Android.

## Operação
- Iniciar uma Ronda GPS e aguardar localização válida; **+ Buraco** aparece na parte inferior do mapa.
- Cada toque salva um ponto individual com coordenadas, horário, precisão, micro e bairro. Não exige foto ou formulário.
- O ponto vermelho aparece sobre o mapa; a coordenada original do GPS é preservada.
- O nome da rua e o número **não são inferidos automaticamente**. O fiscal pode preencher opcionalmente uma referência aproximada na seção **Buracos (N)** do painel de ronda. Omitir endereço é melhor que inventá-lo.
- Abrir **Buracos (N)** para consultar as últimas marcações, exportar CSV consolidado ou abrir relatório de impressão/salvamento em PDF pelo navegador.
- O CSV contém uma linha por ocorrência de todas as rondas preservadas no navegador e coordenadas WGS84.
- Os pontos ficam dentro do mesmo backup JSON local das rondas; nenhuma coordenada é enviada ao GitHub ou ao Drive.

## Limites importantes
- A marcação só é admitida durante ronda ativa, com posição GPS recente, precisão até 75 m e dentro da micro selecionada.
- A precisão exibida é informada pelo aparelho e **não** a distância real comprovada até o buraco.
- Logradouro e número cadastrados manualmente são aproximações; nenhum número é fabricado a partir da posição.
- A identificação automática de logradouro exige uma malha de ruas local validada e análise de proximidade; não está incluída no protótipo.
- A função PDF utiliza impressão nativa do navegador e depende das opções disponíveis no Android; **não gera PDF diretamente em segundo plano**.
- Sem sincronização automática com Drive e sem compartilhamento público de trajetos.

## Testes antes de eventual publicação
- [ ] Testar mapa, GPS e painel de v0.4.2-beta em produção.
- [ ] Validar botão + Buraco em Android/Chrome, incluindo captura de coordenadas em deslocamento e parado.
- [ ] Testar GPS impreciso, fora da micro e após pausar a ronda; não criar ponto incorreto.
- [ ] Verificar visualmente os dois botões inferiores em telas de 360–430 px, inclusive com o painel aberto.
- [ ] Marcar múltiplos pontos e conferir códigos e marcadores sem duplicação.
- [ ] Editar referência opcional de rua e número e conferir exportações.
- [ ] Finalizar, recarregar, reabrir histórico e conferir CSV, impressão PDF e backup completo.
- [ ] Confirmar preservação de rondas antigas sem campo `potholes`.

**Não mesclar este PR nem publicar sem aprovação após teste móvel.**
