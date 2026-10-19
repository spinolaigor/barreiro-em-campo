# Homologação de campo — Barreiro em Campo v0.4.6-beta

**Objetivo:** validar operação de ponta a ponta **em aparelho real**, priorizando a entrega do relatório, sem ampliar as funções do aplicativo.  
**Situação:** testes de lógica e Chromium 390×844 com GPS **virtual** aprovados (50 testes). **Teste físico Android e envio nativo real não estão documentados como concluídos.**

## Antes de começar

- [ ] Registrar modelo do **Android**, versão do Chrome, data e micro (sem dados pessoais no GitHub).
- [ ] Abrir https://spinolaigor.github.io/barreiro-em-campo/ em HTTPS e permitir localização **precisa**.
- [ ] Preservar rondas anteriores com **backup JSON completo** em local autorizado; não limpar os dados do navegador.
- [ ] Conferir versão exibida `v0.4.6-beta` e carregamento de mapa, camadas, 10 micros e controles móveis sem sobreposição.

## Ronda e marcação

- [ ] Iniciar na micro correta, conferir marcador GPS e precisão; caminhar/deslocar-se com segurança, **sem manusear o celular ao dirigir**.
- [ ] Verificar que mapa e quilometragem progridem de forma razoável, sem linhas falsas, saltos irreais ou gravação fora da micro.
- [ ] Permanecer parado, registrar um buraco com GPS recente; conferir código `B001`, horário e marcação no mapa.
- [ ] Marcar **dois ou três buracos no mesmo endereço** e confirmar que `B001`, `B002` etc. são registros separados.
- [ ] Conferir rua e **“próximo ao nº”**; testar uma esquina e corrigir a referência se necessário. A posição GPS original deve permanecer.
- [ ] Pausar, bloquear a tela/sair da página, voltar e **retomar manualmente**; confirmar preservação de buracos, trajeto e IDs.
- [ ] Finalizar e reabrir a ronda concluída em **Rondas salvas** após atualizar a página.

## Relatório — critério central

- [ ] Em **Rondas salvas → Gerar relatório (PDF + CSV)**, conferir que os dois arquivos pertencem à **mesma ronda**.
- [ ] Conferir a **primeira página** do PDF: micro, início e fim (horário local), **km GPS**, tempo ativo, total de buracos, totais por bairro e **mapa com toda a micro, percurso e buracos**.
- [ ] Conferir soma dos bairros = total de ocorrências. Pausas não devem ligar segmentos de trajeto.
- [ ] Conferir as páginas seguintes: por bairro e rua, **um ID para cada buraco**, inclusive quando número e GPS coincidem; rua e número aproximados, horário e leitura nítida.
- [ ] Validar cenário com **volume de pontos próximo a 91** para avaliar mapa, páginas, tamanho dos arquivos, legibilidade e ausência de registros perdidos.
- [ ] Comparar CSV com PDF (IDs, quantidade, endereços, coordenadas); testar os links Google Maps a partir do CSV.
- [ ] Testar **compartilhamento nativo real** no Android; sem suporte, verificar **dois downloads** e envio manual.
- [ ] Verificar que falha no PDF ou no compartilhamento **não exclui ou modifica** a ronda; distinguir backup JSON dos arquivos do relatório.
- [ ] Se iPhone fizer parte da operação, testar também Safari com as mesmas verificações.

## Resultado a registrar

Para cada problema: **modelo/aparelho, versão, etapa, esperado, ocorrido e print sem dados sensíveis**. Se necessário, comparar a contagem com anotação manual da equipe. Não publicar GPX, JSON real, endereços pessoais ou trajetória completa no repositório.

**Referências:** [Issue #2](https://github.com/spinolaigor/barreiro-em-campo/issues/2), [Issue #4](https://github.com/spinolaigor/barreiro-em-campo/issues/4), [estado do projeto](ESTADO_DO_PROJETO.md). **O teste de 91 IDs automatizado é sintético**; os 91 buracos levantados na Micro 07 são evidência de contagem em campo, não homologação de todos os campos do PDF.
