import inquirer from 'inquirer'
import readXlsxFile, { readSheetNames } from 'read-excel-file/node'

import { AutomatedBrowser } from './browser'

export interface DownloadOptions {
  amount: number
  file: string
  headless: boolean
  output: string
  password: string
  sheet: string | undefined
  user: string
}

export async function download (options: DownloadOptions): Promise<void> {
  const browser = new AutomatedBrowser(options.headless, options.output)

  const invoices = await getInvoices(options.file, options.sheet)

  await browser.launch()
  await browser.login(options.user, options.password)
  await browser.navigateToConsult()

  let currentIndex = invoices[0]
  const total = invoices[invoices.length - 1]

  while (currentIndex < total) {
    const endAt = currentIndex + options.amount
    const range = [currentIndex, endAt]

    console.log('Enviando', {
      range,
      total: endAt - currentIndex
    })

    await browser.downloadInvoices(range)
    currentIndex = endAt + 1
  }

  await browser.close()
  console.log('Download finalizado.')
}

export async function getInvoices (directory: string, sheetName?: string): Promise<number[]> {
  const sheetNames = await readSheetNames(directory)

  // Se o arquivo não possuir nenhuma planilha.
  if (sheetNames.length === 0) {
    throw new Error('O arquivo não possui nenhuma planilha.')
  }

  // Se o usuário especificar uma planilha através das opções.
  if (sheetName !== undefined && !sheetNames.includes(sheetName)) {
    throw new Error(`A planilha "${sheetName}" não existe.`)
  }

  // Se o usuário não especificar uma planilha através das opções no comando.
  if (sheetName === undefined) {
    const { sheet } = await inquirer.prompt<{ sheet: string }>([
      {
        choices: sheetNames,
        message: 'Qual planilha você deseja usar?',
        name: 'sheet',
        type: 'list'
      }
    ])

    sheetName = sheet
  }

  const rows = await readXlsxFile(directory, { sheet: sheetName })
  const invoices = rows
    .slice(1) // Remove the header.
    .map(row => parseInt(row[0] as string)) // Transform each row into an invoice number.

  return invoices
}

function chunk<T = number> (array: T[], size: number): T[][] {
  const chunks = []

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }

  return chunks
}
