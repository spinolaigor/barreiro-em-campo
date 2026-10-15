# Barreiro em Campo — Histórico de versões

**Versão atual: v0.4.1 (piloto)** — 15 de outubro de 2026.

Aqui fica registrado **o que mudou no aplicativo**. As rondas são dados separados: continuam salvas localmente no navegador até que sejam exportadas, e não são recuperadas automaticamente ao voltar para um código anterior.

## v0.4.1 — Preservação das rondas
- Removidos cortes silenciosos de 15 rondas, 4.500 pontos por ronda e 300 eventos.
- Finalização e exclusão só são confirmadas após gravação bem-sucedida.
- Falha de armazenamento pausa a coleta, mantém os dados em memória e apresenta orientação de backup.
- Recuperação de página interrompida considera apenas o tempo confirmado até o último checkpoint; o intervalo desconhecido fica identificado.
- Backup JSON completo disponível no painel, incluindo dados em memória; não é enviado automaticamente para a nuvem.
- Dados ilegíveis ou de formato desconhecido não são sobrescritos. Alteração observável em outra aba interrompe a escrita; use somente uma aba para gravar.
- Chave e formato de armazenamento v1 preservados. Não há migração para IndexedDB nesta correção.
- Testes automáticos executados antes da publicação.
- Cartografia e composição das micros preservadas.

**Limites desta etapa:** o armazenamento do navegador continua finito. O backup JSON ainda não tem importador na interface (restauração assistida). Não recupera pontos/rondas já descartados pelas versões anteriores. GPS em segundo plano continua não garantido.

## v0.4.0 — Controle das mudanças e falhas no GPS
- Identificação da versão no painel de Ronda GPS, com acesso a este histórico.
- Registro de falhas e interrupções: pausa, falta de sinal, localização imprecisa, saída da micro e intervalos longos sem pontos válidos.
- Marcadores **laranja** indicam o **último ponto GPS válido antes do aviso**. Não significam a posição exata onde o sinal falhou.
- Contagem de interrupções na ronda e inclusão dos eventos nos arquivos GPX, GeoJSON e CSV quando há coordenadas disponíveis.
- Prevenção de marcação de vistoria quando o GPS não está válido.
- Compatibilidade preservada com rondas já salvas: a chave de armazenamento `barreiro.rondas.v1` não foi alterada.

## Marcos anteriores do projeto
- **Mapa territorial antes do modo Ronda GPS:** [revisão registrada](https://github.com/spinolaigor/barreiro-em-campo/tree/4cbf4ae11aec4b03a029b893d858cd4693bc6457).
- **Primeira integração do modo Ronda GPS:** [revisão registrada](https://github.com/spinolaigor/barreiro-em-campo/tree/2ec1ab563aa73f8b7dff81bd0cebfe31d33feb9d).
- **Todas as alterações, por data:** [commits do GitHub](https://github.com/spinolaigor/barreiro-em-campo/commits/main/).

Esses são snapshots identificados pelo commit do GitHub, não versões homologadas. Para recuperar uma função anterior, podemos comparar dois commits e reverter somente a mudança com problema.

## Onde o rastro pode faltar

| Situação | O que acontece |
|---|---|
| Sem sinal ou precisão inadequada | O ponto não é aceito; um aviso é registrado quando possível |
| Tela bloqueada / navegador em segundo plano | A ronda pode ser pausada e precisa ser retomada |
| Saída da micro selecionada | Pontos fora dela não entram na trilha daquela micro |
| Intervalo grande entre posições | A trilha inicia um novo segmento para não criar uma linha fictícia |

Pontos laranja indicam apenas a última posição válida **antes** da interrupção; não provam qual rua ficou sem vistoria. Passar por uma rua também não equivale a fiscalizá-la.

## Cuidado com dados e backups
- Os rastros são guardados **somente no navegador deste aparelho**, não no repositório público.
- Para manter uma cópia, exporte cada ronda concluída e armazene o arquivo em local autorizado.
- Trocar de aparelho, apagar dados do navegador ou desinstalar o aplicativo pode eliminar rastros não exportados.
- Os arquivos possuem localizações, horários e deslocamentos: trate-os como informações potencialmente pessoais.
- O registro em segundo plano com tela bloqueada **não é garantido** no navegador móvel.

**Elaboração cartográfica e estruturação de dados vetoriais:** Igor Spínola Mello (2026). Bases de referência: PBH e fontes do projeto.