# Marcação rápida de buracos — protótipo de trabalho

A função foi integrada como **piloto público v0.4.4-beta** após testes automatizados e simulação Chromium móvel com GPS virtual. A precisão e estabilidade do GPS físico ainda exigem teste prático em Android.

## Operação
- Iniciar uma Ronda GPS e aguardar localização válida; **+ Buraco** aparece na parte inferior do mapa.
- Cada toque salva um ponto individual com coordenadas, horário, precisão, micro e bairro. Não exige foto ou formulário.
- O ponto vermelho aparece sobre o mapa; a coordenada original do GPS é preservada.
- O nome da rua e o número **não são inferidos automaticamente**. O fiscal pode preencher opcionalmente uma referência aproximada na seção **Buracos (N)** do painel de ronda. Omitir endereço é melhor que inventá-lo.
- Abrir **Buracos (N)** e tocar em **Compartilhar relatório (PDF + planilha)**. O aplicativo gera os dois arquivos para a ronda selecionada (a ativa, ou a última finalizada), sem oferecer opções de formato. No Android compatível, o menu nativo solicita destinatário; sem suporte, ambos os arquivos vão para Downloads.
- O CSV contém uma linha por ocorrência de todas as rondas preservadas no navegador e coordenadas WGS84.
- Os pontos ficam dentro do mesmo backup JSON local das rondas; nenhuma coordenada é enviada ao GitHub ou ao Drive.

## Limites importantes
- A marcação só é admitida durante ronda ativa, com posição GPS recente, precisão até 75 m e dentro da micro selecionada.
- A precisão exibida é informada pelo aparelho e **não** a distância real comprovada até o buraco.
- Logradouro e número cadastrados manualmente são aproximações; nenhum número é fabricado a partir da posição.
- A identificação automática de logradouro exige uma malha de ruas local validada e análise de proximidade; não está incluída no protótipo.
- O PDF é gerado localmente em formato A4 multipágina, sem impressão. O menu de compartilhamento **não confirma o recebimento pelo destinatário**; se o aparelho não suportar os dois arquivos, o fiscal deve compartilhá-los a partir de Downloads.
- Sem sincronização automática com Drive e sem compartilhamento público de trajetos.

## Roteiro de validação no aparelho após publicação
- [x] Testes de lógica e simulação do fluxo em Chromium móvel 390×844 com GPS virtual, três ocorrências, geração e leitura de PDF/CSV, compartilhamento duplo simulado e capturas/vídeo.\n- [ ] Testar GPS físico e painel no Android com permissão precisa.
- [ ] Validar botão + Buraco em Android/Chrome, incluindo captura de coordenadas em deslocamento e parado.
- [ ] Testar GPS impreciso, fora da micro e após pausar a ronda; não criar ponto incorreto.
- [ ] Verificar visualmente os dois botões inferiores em telas de 360–430 px, inclusive com o painel aberto.
- [ ] Marcar múltiplos pontos e conferir códigos e marcadores sem duplicação.
- [ ] Editar referência opcional de rua e número e conferir exportações.
- [ ] Finalizar, recarregar, reabrir histórico e conferir CSV, impressão PDF e backup completo.
- [ ] Confirmar preservação de rondas antigas sem campo `potholes`.

**Versão publicada como piloto, não homologada fisicamente.** Fazer testes móveis e corrigir discrepâncias observadas; não interpretar pontos como laudo topográfico.
