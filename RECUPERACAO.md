# Preservação e recuperação — Barreiro em Campo

**Referência:** v0.4.6-beta · 19/10/2026. O código público do site e os dados de rondas dos celulares são **objetos distintos**.

## Salvar os dados do aparelho

**Backup completo JSON** no painel **Segurança e recuperação**: reúne **ronda atual e histórico** do navegador. Em falha de armazenamento, a opção de salvamento permanece em destaque. Confira o arquivo efetivamente baixado e guarde-o em local autorizado, fora do navegador.

**PDF + CSV da ronda**: relatórios de execução para compartilhamento; **não** possibilitam recuperar integralmente a sessão ou as rondas. GPX e GeoJSON também não substituem o backup completo.

**Importante:** não existe sincronização automática, importador de backup pela interface nem garantia de rastreamento com a tela bloqueada. Nunca limpe armazenamento, apague rondas ou troque de aparelho sem antes verificar os backups. Mantenha somente uma aba do aplicativo para gravar.

## Recuperar ou reverter código

- Código atual: [branch `main`](https://github.com/spinolaigor/barreiro-em-campo/tree/main), versão `v0.4.6-beta`.
- Snapshot anterior ao relatório executivo: commit [`47e265659c3c`](https://github.com/spinolaigor/barreiro-em-campo/commit/47e265659c3cb33d390094b046cbd7fc1661cd5a) (`v0.4.5-beta`).
- Snapshot anterior ao endereço automático: commit [`dd9aaacd4d9a`](https://github.com/spinolaigor/barreiro-em-campo/commit/dd9aaacd4d9a262c9e7c47e2d63c4975c4ff250a) (`v0.4.4-beta`).
- Snapshots anteriores: branches de backup históricas e [VERSOES.md](VERSOES.md).

Preferir **novo PR corretivo ou `git revert`** do commit problemático a reescrever o histórico/forçar push. Uma reversão deve ser validada com testes, publicada por GitHub Actions e testada antes de reutilizar rondas. **Não executar retorno a versões anteriores sem conferir compatibilidade dos dados**; a `v0.4.0` possuía limites capazes de descartar registros.

As alterações de **documentação e Issues** não modificam o armazenamento das rondas.

## Em caso de falha

1. **Não** apagar armazenamento local nem reinstalar o navegador.
2. Pausar a coleta se possível e baixar o **backup JSON completo**.
3. Confirmar tamanho e integridade do arquivo fora do navegador.
4. Registrar sintoma técnico sem subir histórico GPS ou identificação do fiscal ao GitHub público.
5. Planejar restauração assistida; **não declarar recuperação efetuada apenas por existir o JSON**.

Para futura evolução de importação/restauração, ver [Issue #11](https://github.com/spinolaigor/barreiro-em-campo/issues/11).
