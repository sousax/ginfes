import axios from 'axios'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import { type Browser, type Page, chromium } from 'playwright'

export class AutomatedBrowser {
  private browser?: Browser
  private page?: Page

  constructor (private readonly headless: boolean, private readonly outputFolder: string) {}

  public async close (): Promise<void> {
    if (this.browser === undefined) {
      throw new Error('O navegador precisa ser primeiro iniciado para que possa ser finalizado.')
    }

    await this.browser.close()
  }

  public async closePopups (): Promise<void> {
    if (this.page === undefined) {
      throw new Error('O navegador precisa ser primeiro iniciado para que os popups possam ser fechados.')
    }

    let hasPopup = await this.page.waitForSelector('.x-window-draggable', { state: 'visible', timeout: 2000 })
      .then(() => true)
      .catch(() => false)

    while (hasPopup) {
      await this.page.click('.x-btn-text')
      await this.page.waitForTimeout(100)

      hasPopup = await this.page.waitForSelector('.x-window-draggable', { state: 'visible', timeout: 2000 })
        .then(() => true)
        .catch(() => false)
    }
  }

  public async downloadFile (url: string, outputDir: string): Promise<void> {
    const { data } = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
      })
    })

    await fs.writeFile(outputDir, data)
  }

  public async downloadInvoices (invoiceList: number[]) {
    if (this.page === undefined) {
      throw new Error('O navegador precisa ser primeiro iniciado para que o login possa ser realizado.')
    }

    const firstInvoice = invoiceList[0]
    const lastInvoice = invoiceList[invoiceList.length - 1]

    console.log({
      difference: lastInvoice - firstInvoice,
      firstInvoice,
      lastInvoice
    })

    const downloadOptions = await this.page.$$('input[name="opcConsulta"]')
    const [, fromField, toField] = await this.page.$$('.x-form-num-field')
    const submitButton = await this.page.$('.x-btn-center')

    await downloadOptions[2].click()
    await fromField.fill(firstInvoice.toString())
    await toField.fill(lastInvoice.toString())
    await submitButton?.click()

    console.log('Formulário enviado, aguardando retorno...')

    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)
    await this.page.click('img[src="imgs/download.png"]')

    console.log('O servidor enviou as informações das notas dentro do intervalo. Iniciando download...')

    const res = await this.page.waitForResponse(async (response) => {
      const url = response.url()
      const body = await response.text()

      if (!url.includes('ginfes')) return false

      return body.includes('//OK[1,["')
    }).catch(() => null)

    const fileName = `${firstInvoice}-${lastInvoice}.xml`

    if (res === null) {
      throw new Error(`A resposta do arquivo ${fileName} demorou demais para chegar.`)
    }

    const data = await res.text()
    const fileId = /\["(.*?)"\]/.exec(data)?.[1]

    if (fileId === undefined) {
      throw new Error('Não foi possível encontrar a URL do arquivo.')
    }

    const url = `https://santos.ginfes.com.br/nfseweb/download/${fileId}.xml`
    const outputDir = path.resolve(this.outputFolder, fileName)

    console.log('Servidor retornou a URL do arquivo', {
      fileName,
      outputDir,
      url
    })

    console.log('Baixando...')

    await this.downloadFile(url, outputDir)

    console.log('Arquivo', fileName, 'baixado.')
  }

  public async launch (): Promise<void> {
    if (this.browser !== undefined) {
      throw new Error('Já existe uma instância do navegador aberta.')
    }

    this.browser = await chromium.launch({ headless: this.headless })
    this.page = await this.browser.newPage()
  }

  public async login (user: string, password: string): Promise<void> {
    if (this.page === undefined) {
      throw new Error('O navegador precisa ser primeiro iniciado para que o login possa ser realizado.')
    }

    await this.page.goto('https://santos.ginfes.com.br', { waitUntil: 'networkidle' })

    // Fecha os popups com as notificações na primeira tela.
    await this.closePopups()

    // Entra na área de prestador de serviços.
    await this.page.click('img[src="imgs/001.gif"]')
    await this.page.waitForLoadState('networkidle')

    // Preenche o formulário com as informações de login
    const [, , municipalRegistration] = await this.page.$$('input[name="cpf_cnpj"]')

    const userField = await this.page.$$('.x-form-text')
      .then(fields => fields[2])

    const passwordField = await this.page.$('.loginPass:visible')

    if (municipalRegistration === null) {
      throw new Error('O campo de inscrição municipal não foi encontrado.')
    }

    if (userField === null) {
      throw new Error('O campo de usuário não foi encontrado.')
    }

    if (passwordField === null) {
      throw new Error('O campo de senha não foi encontrado.')
    }

    await municipalRegistration.click({ delay: 1000 })
    await userField.fill(user)
    await passwordField.fill(password)

    await this.page.locator('button:text("Entrar")').click()
    await this.page.waitForLoadState('networkidle')

    const loggedIn = await this.page.waitForSelector('.identificacao', { timeout: 5000 })
      .then(() => true)
      .catch(() => false)

    if (!loggedIn) {
      throw new Error('Não foi possível fazer o login.')
    }
  }

  public async navigateToConsult (): Promise<void> {
    if (this.page === undefined) {
      throw new Error('O navegador precisa ser primeiro iniciado para que o login possa ser realizado.')
    }

    const consultButton = await this.page.waitForSelector('img[src="imgs/icon_nfse5.gif"]', { state: 'visible' })

    if (consultButton === null) {
      throw new Error('O botão de consulta não foi encontrado.')
    }

    await consultButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}
