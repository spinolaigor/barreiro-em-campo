# Recuperação de versão — Barreiro em Campo

## Código do site

- Versão anterior: v0.4.0, commit `2bd8cc6ce565d05b5038acdcf1659bcfa7a07f57`.
- Ponto de retorno: branch `backup/v0.4.0-2bd8cc6`.
- Cópia no Drive: `Publicacao GitHub Pages/Barreiro_em_Campo_v0.4.0_2bd8cc6.zip`.
- SHA-256 do ZIP: `52aa9bec94800fe124be7de538e91b42bca4edda867e8f1015386727c34f88b1`.

Para desfazer esta atualização, reverta o commit da v0.4.1 com `git revert <commit-da-v0.4.1>` e publique o novo commit em main. Evite apagar ou reescrever o histórico. Confira o resultado do GitHub Actions e a versão exibida no site.

Antes do retorno, finalize ou pause as rondas e baixe os backups dos aparelhos. A versão 0.4.0 possui limites que podem descartar registros quando volta a gravar: mantenha os backups completos fora do navegador. Prefira corrigir a falha em nova versão quando possível.

## Dados das rondas

Os backups de código não contêm as rondas dos aparelhos. Use **Baixar backup completo** em cada aparelho. O arquivo tem coordenadas e horários: guarde em local privado, nunca neste repositório nem na pasta de publicação.

A versão 0.4.1 preserva `barreiro.rondas.v1`, não apaga registros existentes e não migra o banco. O backup JSON possui `format`, `version` e `data` com o estado integral. O importador ainda não está disponível na interface; conserve o arquivo para restauração assistida. A atualização não recupera dados que versões antigas já tenham descartado.
