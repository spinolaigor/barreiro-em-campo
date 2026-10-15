# Piloto controlado — GPS v0.4.2-beta

**Situação:** somente branch `fix/gps-diagnostico-v0.4.2`, não liberada no site público até revisão. Este roteiro é para validar em HTTPS em uma versão de teste separada. Não solicite a um fiscal que teste a versão de produção como se ela já contivesse a correção.

## Cenários de teste

1. **Android / Chrome:** abra a versão de teste em HTTPS, autorize localização precisa, escolha a micro real e inicie a ronda. Confira se aparece o marcador azul e o círculo de precisão. O mapa deve acompanhar a posição inicialmente.
2. **Fora da micro:** no teste, selecione deliberadamente uma micro diferente da posição atual. O marcador deve mostrar onde o celular está e o aviso deve explicar que o rastro não será gravado fora da micro.
3. **Caminhada curta:** com o telefone aberto, mova-se por aproximadamente 100–200 m em uma área segura. Confira a linha azul da rota e se o painel aumenta a distância e a contagem de pontos.
4. **Parado:** aguarde 40 s sem caminhar. O painel deve diferenciar ausência de novas leituras de falha comprovada. Toque **Marcar vistoria**: o sistema deve solicitar GPS atualizado e registrar somente após localização válida na micro.
5. **Acompanhamento opcional:** desligue **Seguindo GPS**, arraste o mapa e observe se ele permanece onde foi deixado. Ligue novamente para acompanhar a posição.
6. **Leitura imprecisa:** teste em local coberto ou com sinal ruim; o marcador pode aparecer como aproximado, mas leituras acima de 75 m de precisão **não** podem ser gravadas como trajeto.
7. **Pausa / retomada:** pause a ronda e retome; o mapa não deve unir artificialmente os dois segmentos. Finalize e faça backup JSON e GPX.
8. **iPhone / Safari:** repita os testes 1–7, observando em especial permissões de localização, diálogos do navegador e download/compartilhamento de arquivos.

## Dados para anotar no teste

- Sistema e versão do navegador: Android/Chrome ou iPhone/Safari.
- Se o ponto azul acompanhou o deslocamento e se o rastro ficou dentro da micro.
- Texto exato do aviso quando algo não atualizou.
- Se **Seguir GPS** e **Marcar vistoria** funcionaram.
- O comportamento ao bloquear a tela/alternar de aplicativo (a versão web não garante gravação em segundo plano).

**Privacidade:** não anexe coordenadas ou rastros reais a issues, PRs, comentários públicos ou ao repositório. Descreva apenas o comportamento, e mantenha arquivos de GPS privados.

## Critérios antes de publicar

- Testes automatizados completos e aprovados no GitHub.
- Código revisado no PR, sem modificar a cartografia nem perder dados locais existentes.
- Teste real em pelo menos um Android e um iPhone, incluindo pausa/retomada.
- Confirmação de que relatórios PDF e envio automático ao Drive **ainda não existem** nesta etapa.
- Aprovação explícita para publicar a nova versão no site principal.
