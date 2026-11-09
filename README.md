# ginfes

CLI em Node.js que automatiza o download em lote de notas fiscais de serviço (NFS-e) do Ginfes da Prefeitura de Santos (`santos.ginfes.com.br`), usando Playwright para fazer login e consultar as notas.

## Como funciona

1. Lê uma planilha Excel (`.xlsx`). A primeira coluna deve ter os números das notas, com cabeçalho na primeira linha.
2. Abre o Chromium, faz login como prestador de serviços com usuário e senha e vai até a consulta de NFS-e.
3. Do primeiro ao último número da planilha, pede os XMLs em faixas de `--amount` notas por vez.
4. Salva cada faixa como `<inicio>-<fim>.xml` na pasta de saída.

Se a planilha tiver mais de uma aba e `--sheet` não for informado, o programa pergunta qual usar.

## Tecnologias

- TypeScript, Node.js 18
- Playwright (Chromium)
- commander, inquirer, axios, read-excel-file
- tsx, tsup, ESLint

## Requisitos

- Node.js 18 (versão em `.tool-versions`: 18.17.1)
- pnpm
- Credenciais de prestador no Ginfes de Santos

## Como rodar

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev download -f planilha.xlsx -u USUARIO -p SENHA
```

Opções do comando `download`:

| Opção | Descrição | Padrão |
| --- | --- | --- |
| `-f, --file <file>` | Planilha com os números das notas (obrigatório) | |
| `-u, --user <user>` | Usuário do Ginfes (obrigatório) | |
| `-p, --password <password>` | Senha do Ginfes (obrigatório) | |
| `-s, --sheet <sheet>` | Nome da aba da planilha | pergunta |
| `-a, --amount <amount>` | Quantidade máxima de notas por requisição | `500` |
| `-o, --output <output>` | Pasta onde os XMLs são salvos | `./notas-fiscais` |
| `--headless <headless>` | `false` abre o navegador com janela | `true` (sem janela) |

Para usar sem `tsx`: `pnpm build` e depois `pnpm start download ...` (ou `node dist/index.js download ...`).
