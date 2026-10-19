# Plano de evolução — Barreiro em Campo

**Base:** v0.4.6-beta, 19/10/2026. **Diretriz:** preservar interface e coleta já existentes; priorizar qualidade da entrega de campo. **Este é um plano**, não uma autorização para novas alterações funcionais.

## 1. Homologar o relatório atual — prioridade imediata

**Issue [#2](../issues/2)**

- Testar em **Android físico** uma ronda com iniciar → marcar → pausar → retomar → finalizar → gerar relatório novamente pelo histórico.
- Conferir **capa do PDF**: micro, início/fim, km do GPS, tempo ativo, total, quantidade por bairro e **mapa completo com contorno, trajeto e buracos**.
- Conferir **detalhamento por bairro e rua**: `B001`, `B002` etc. Uma marcação = um registro, inclusive vários no mesmo número. Número sempre rotulado como **aproximado**.
- Conferir **PDF e CSV da mesma ronda**, sem duplicar, omitir ou misturar registros; validar compartilhamento real ou dois downloads. Testar volume elevado, usando 91 ocorrências como referência **de escala e legibilidade**.
- Comparar valores com registros originais e, quando necessário, anotações de campo; corrigir apenas divergências comprovadas. **Não incluir indicadores extras sem finalidade operacional.**

**Aceite:** um fiscal gera um arquivo legível e uma equipe localiza cada buraco usando ID + rua + nº de referência + bairro, sem perder registros.

## 2. Qualidade da localização por endereço

**Issue [#4](../issues/4)**

- Validar rua/número em esquinas, vias paralelas, divisas, bairros vizinhos e pontos com GPS impreciso, distinguindo **referência operacional** de endereço exato.
- Mostrar **via provável também na consulta “Onde estou?”**, reutilizando base PBH local e evitando consultas remotas contínuas.
- Se houver ambiguidade, **permitir conferência/correção sem fabricar número** ou alterar o ponto GPS.
- Medir custo de carregamento do cadastro e disponibilidade após interrupção de rede.

**Aceite:** apresentação útil, rápida e prudente em campo; erros cartográficos rastreáveis.

## 3. Preservar a informação coletada

**Issue [#11](../issues/11)**

- Não confundir **PDF/CSV de uma ronda** com **backup JSON de todo o histórico**.
- Testar perda de foco, recuperação da sessão, falha de armazenamento, troca de aparelho e restauração assistida antes de propor importador.
- Evitar sobrescrita de ronda ou troca de IDs, mantendo `barreiro.rondas.v1` e trilhas históricas.

**Aceite:** falhas na entrega ou na conexão não apagam registros e existe procedimento de recuperação testado.

## Fora de escopo por enquanto

- Redesenhar do zero a aplicação ou aumentar a quantidade de botões.
- Transformar simples passagem de GPS por uma rua em **comprovação automática de fiscalização**.
- Gerar índice de cobertura contratual sem regras de fiscalização verificadas.
- Sincronizar automaticamente dados de rondas com GitHub/Drive ou publicar coordenadas pessoais.
- Fotos obrigatórias, cadastros extensos, pontuações, gráficos decorativos ou excesso de métricas no PDF.

## Processo de evolução

1. Reproduzir um problema real com teste/foto **sem dados sensíveis** e registrar em Issue.
2. Definir critério de aceite e escopo mínimo.
3. Implementar em branch/PR **separada**, sem alterar a coleta e o armazenamento silenciosamente.
4. Rodar testes automatizados, conferir **PDF verdadeiro e CSV**, e realizar teste físico quando afetar operação móvel.
5. Publicar apenas após revisão, manter histórico e plano de reversão.

**Próxima versão:** não definida. A `v0.4.6-beta` permanece como referência até haver um motivo técnico e aceite para nova versão.
