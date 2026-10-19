# Homologação em Android — Barreiro em Campo v0.4.2-beta

Esta é uma prévia em branch. O site público permanece na v0.4.1. Teste a versão desta branch por HTTPS em ambiente controlado; não use o site público para validar estas mudanças.

## Checklist em campo

- [ ] Chrome no Android: autorizar localização precisa, manter a página aberta, conferir nome das ruas e botões **Onde estou?**, **Ronda GPS**, **Painel** e zoom nas larguras de 360 a 430 px.
- [ ] Abrir Painel: busca de bairro/micro/avenida, dez micros, visão geral e camadas acessíveis. Fechar por botão, toque fora e Escape; escolher micro deve devolver o mapa sem bloqueio invisível.
- [ ] Iniciar ronda na micro real: ponto azul e círculo de precisão aparecem; o mapa acompanha inicialmente. Arrastar interrompe só o acompanhamento; **Centralizar** volta a segui-lo.
- [ ] Abrir Onde estou? durante a ronda: usa a localização da ronda e não inicia segundo rastreador. Abrir Painel ou Ronda fecha painéis concorrentes, sem interromper a ronda.
- [ ] Escolher deliberadamente outra micro: posição pode aparecer, mas o trajeto externo não deve ser salvo. Não interpretar rastro como rua vistoriada.
- [ ] Caminhar 100–200 m em segurança: novos pontos e distância aproximada crescem; a linha não salta nem atravessa pausas.
- [ ] Permanecer parado por mais de 30 s: distinguir **sem nova leitura** de erro informado pelo GPS. **Marcar vistoria** deve solicitar posição atualizada e só salvar se vier precisa e dentro da micro.
- [ ] Testar sinal ruim: acima de 75 m de precisão não grava rastro nem vistoria; uma posição aproximada até 250 m pode aparecer com círculo de alerta.
- [ ] Pausar e retomar; bloquear tela ou trocar de app; voltar e conferir pausa explícita. Finalizar, exportar GPX/GeoJSON/CSV e baixar backup JSON; verificar histórico após recarregar.

Anotar modelo do aparelho, versão do Android/Chrome, horário aproximado, texto do diagnóstico e comportamento. **Não anexar coordenadas, rastros ou identificação de fiscais a issues/PR públicos.** GPS em segundo plano não é garantido em navegador móvel; validar sempre com a tela em primeiro plano.

Pendências de campo: precisão real junto a divisas, estabilidade da leitura durante deslocamento e parada, legibilidade das ruas no mapa-base no aparelho, permissão de localização e downloads em Android. Repetir em iPhone/Safari se esse aparelho entrar no uso operacional.
