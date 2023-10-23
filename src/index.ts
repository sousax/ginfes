import { program } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'

import { download } from './download'

const DEFAULT_OUTPUT_FOLDER = './notas-fiscais'
const DEFAULT_BATCH_AMOUNT = 500

program
  .name('ginfes')
  .description('Um programa para facilitar o download de diversas notas fiscais dentro do sistema do Ginfes. Caso o programa não funcione da maneira esperada, certifique-se que a sua máquina atende os requisitos mínimos descritos no arquivo README.md')
  .version('1.0.0')

program.command('download')
  .description('Baixa todas as notas fiscais disponíveis dentro da planilha.')
  .requiredOption('-f, --file <file>', 'O diretório da planilha a ser usada como base.')
  .requiredOption('-u, --user <user>', 'O usuário usado para fazer o login.')
  .requiredOption('-p, --password <password>', 'A senha usada para fazer o login.')
  .option('-s, --sheet <sheet>', 'O nome da planilha a ser usada como base.')
  .option('-a, --amount <amount>', 'A quantidade máxima de notas fiscais baixadas por requisição.', String(DEFAULT_BATCH_AMOUNT))
  .option('-o, --output <output>', 'A pasta que todas as notas fiscais serão salvas.', DEFAULT_OUTPUT_FOLDER)
  .option('--headless <headless>', 'Se o navegador deve ser aberto em modo headless.', true)
  .action(async (options) => {
    const baseDir = process.cwd()

    // Transforma os caminhos relativos em absolutos e converte a quantidade de notas fiscais para um número.
    options.amount = Number(options.amount)
    options.file = path.resolve(baseDir, options.file)
    options.output = path.resolve(baseDir, options.output)
    options.headless = options.headless === 'true'
    options.sheet = options.sheet ?? undefined
    options.user = options.user ?? undefined
    options.password = options.password ?? undefined

    // Certifica que a pasta de output existe.
    await fs.mkdir(options.output, { recursive: true })

    // Certifica que a planilha existe.
    await fs.access(options.file)

    // Inicia o processo de download.
    await download(options)
  })

program.parse()
