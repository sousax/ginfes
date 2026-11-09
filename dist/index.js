#!/usr/bin/env node

// src/index.ts
import { program } from "commander";
import fs2 from "node:fs/promises";
import path2 from "node:path";

// src/download.ts
import inquirer from "inquirer";
import readXlsxFile, { readSheetNames } from "read-excel-file/node";

// src/browser.ts
import axios from "axios";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { chromium } from "playwright";
var AutomatedBrowser = class {
  constructor(headless, outputFolder) {
    this.headless = headless;
    this.outputFolder = outputFolder;
  }
  browser;
  page;
  async close() {
    if (this.browser === void 0) {
      throw new Error("O navegador precisa ser primeiro iniciado para que possa ser finalizado.");
    }
    await this.browser.close();
  }
  async closePopups() {
    if (this.page === void 0) {
      throw new Error("O navegador precisa ser primeiro iniciado para que os popups possam ser fechados.");
    }
    let hasPopup = await this.page.waitForSelector(".x-window-draggable", { state: "visible", timeout: 2e3 }).then(() => true).catch(() => false);
    while (hasPopup) {
      await this.page.click(".x-btn-text");
      await this.page.waitForTimeout(100);
      hasPopup = await this.page.waitForSelector(".x-window-draggable", { state: "visible", timeout: 2e3 }).then(() => true).catch(() => false);
    }
  }
  async downloadFile(url, outputDir) {
    const { data } = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
      })
    });
    await fs.writeFile(outputDir, data);
  }
  async downloadInvoices(invoiceList) {
    if (this.page === void 0) {
      throw new Error("O navegador precisa ser primeiro iniciado para que o login possa ser realizado.");
    }
    const firstInvoice = invoiceList[0];
    const lastInvoice = invoiceList[invoiceList.length - 1];
    console.log({
      difference: lastInvoice - firstInvoice,
      firstInvoice,
      lastInvoice
    });
    const downloadOptions = await this.page.$$('input[name="opcConsulta"]');
    const [, fromField, toField] = await this.page.$$(".x-form-num-field");
    const submitButton = await this.page.$(".x-btn-center");
    await downloadOptions[2].click();
    await fromField.fill(firstInvoice.toString());
    await toField.fill(lastInvoice.toString());
    await submitButton?.click();
    console.log("Formul\xE1rio enviado, aguardando retorno...");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(1e3);
    await this.page.click('img[src="imgs/download.png"]');
    console.log("O servidor enviou as informa\xE7\xF5es das notas dentro do intervalo. Iniciando download...");
    const res = await this.page.waitForResponse(async (response) => {
      const url2 = response.url();
      const body = await response.text();
      if (!url2.includes("ginfes"))
        return false;
      return body.includes('//OK[1,["');
    }).catch(() => null);
    const fileName = `${firstInvoice}-${lastInvoice}.xml`;
    if (res === null) {
      throw new Error(`A resposta do arquivo ${fileName} demorou demais para chegar.`);
    }
    const data = await res.text();
    const fileId = /\["(.*?)"\]/.exec(data)?.[1];
    if (fileId === void 0) {
      throw new Error("N\xE3o foi poss\xEDvel encontrar a URL do arquivo.");
    }
    const url = `https://santos.ginfes.com.br/nfseweb/download/${fileId}.xml`;
    const outputDir = path.resolve(this.outputFolder, fileName);
    console.log("Servidor retornou a URL do arquivo", {
      fileName,
      outputDir,
      url
    });
    console.log("Baixando...");
    await this.downloadFile(url, outputDir);
    console.log("Arquivo", fileName, "baixado.");
  }
  async launch() {
    if (this.browser !== void 0) {
      throw new Error("J\xE1 existe uma inst\xE2ncia do navegador aberta.");
    }
    this.browser = await chromium.launch({ headless: this.headless });
    this.page = await this.browser.newPage();
  }
  async login(user, password) {
    if (this.page === void 0) {
      throw new Error("O navegador precisa ser primeiro iniciado para que o login possa ser realizado.");
    }
    await this.page.goto("https://santos.ginfes.com.br", { waitUntil: "networkidle" });
    await this.closePopups();
    await this.page.click('img[src="imgs/001.gif"]');
    await this.page.waitForLoadState("networkidle");
    const [, , municipalRegistration] = await this.page.$$('input[name="cpf_cnpj"]');
    const userField = await this.page.$$(".x-form-text").then((fields) => fields[2]);
    const passwordField = await this.page.$(".loginPass:visible");
    if (municipalRegistration === null) {
      throw new Error("O campo de inscri\xE7\xE3o municipal n\xE3o foi encontrado.");
    }
    if (userField === null) {
      throw new Error("O campo de usu\xE1rio n\xE3o foi encontrado.");
    }
    if (passwordField === null) {
      throw new Error("O campo de senha n\xE3o foi encontrado.");
    }
    await municipalRegistration.click({ delay: 1e3 });
    await userField.fill(user);
    await passwordField.fill(password);
    await this.page.locator('button:text("Entrar")').click();
    await this.page.waitForLoadState("networkidle");
    const loggedIn = await this.page.waitForSelector(".identificacao", { timeout: 5e3 }).then(() => true).catch(() => false);
    if (!loggedIn) {
      throw new Error("N\xE3o foi poss\xEDvel fazer o login.");
    }
  }
  async navigateToConsult() {
    if (this.page === void 0) {
      throw new Error("O navegador precisa ser primeiro iniciado para que o login possa ser realizado.");
    }
    const consultButton = await this.page.waitForSelector('img[src="imgs/icon_nfse5.gif"]', { state: "visible" });
    if (consultButton === null) {
      throw new Error("O bot\xE3o de consulta n\xE3o foi encontrado.");
    }
    await consultButton.click();
    await this.page.waitForLoadState("networkidle");
  }
};

// src/download.ts
async function download(options) {
  const browser = new AutomatedBrowser(options.headless, options.output);
  const invoices = await getInvoices(options.file, options.sheet);
  await browser.launch();
  await browser.login(options.user, options.password);
  await browser.navigateToConsult();
  let currentIndex = invoices[0];
  const total = invoices[invoices.length - 1];
  while (currentIndex < total) {
    const endAt = currentIndex + options.amount;
    const range = [currentIndex, endAt];
    console.log("Enviando", {
      range,
      total: endAt - currentIndex
    });
    await browser.downloadInvoices(range);
    currentIndex = endAt + 1;
  }
  await browser.close();
  console.log("Download finalizado.");
}
async function getInvoices(directory, sheetName) {
  const sheetNames = await readSheetNames(directory);
  if (sheetNames.length === 0) {
    throw new Error("O arquivo n\xE3o possui nenhuma planilha.");
  }
  if (sheetName !== void 0 && !sheetNames.includes(sheetName)) {
    throw new Error(`A planilha "${sheetName}" n\xE3o existe.`);
  }
  if (sheetName === void 0) {
    const { sheet } = await inquirer.prompt([
      {
        choices: sheetNames,
        message: "Qual planilha voc\xEA deseja usar?",
        name: "sheet",
        type: "list"
      }
    ]);
    sheetName = sheet;
  }
  const rows = await readXlsxFile(directory, { sheet: sheetName });
  const invoices = rows.slice(1).map((row) => parseInt(row[0]));
  return invoices;
}

// src/index.ts
var DEFAULT_OUTPUT_FOLDER = "./notas-fiscais";
var DEFAULT_BATCH_AMOUNT = 500;
program.name("ginfes").description("Um programa para facilitar o download de diversas notas fiscais dentro do sistema do Ginfes. Caso o programa n\xE3o funcione da maneira esperada, certifique-se que a sua m\xE1quina atende os requisitos m\xEDnimos descritos no arquivo README.md").version("1.0.0");
program.command("download").description("Baixa todas as notas fiscais dispon\xEDveis dentro da planilha.").requiredOption("-f, --file <file>", "O diret\xF3rio da planilha a ser usada como base.").requiredOption("-u, --user <user>", "O usu\xE1rio usado para fazer o login.").requiredOption("-p, --password <password>", "A senha usada para fazer o login.").option("-s, --sheet <sheet>", "O nome da planilha a ser usada como base.").option("-a, --amount <amount>", "A quantidade m\xE1xima de notas fiscais baixadas por requisi\xE7\xE3o.", String(DEFAULT_BATCH_AMOUNT)).option("-o, --output <output>", "A pasta que todas as notas fiscais ser\xE3o salvas.", DEFAULT_OUTPUT_FOLDER).option("--headless <headless>", "Se o navegador deve ser aberto em modo headless.", true).action(async (options) => {
  const baseDir = process.cwd();
  options.amount = Number(options.amount);
  options.file = path2.resolve(baseDir, options.file);
  options.output = path2.resolve(baseDir, options.output);
  options.headless = String(options.headless) !== "false";
  options.sheet = options.sheet ?? void 0;
  options.user = options.user ?? void 0;
  options.password = options.password ?? void 0;
  await fs2.mkdir(options.output, { recursive: true });
  await fs2.access(options.file);
  await download(options);
});
program.parse();
//# sourceMappingURL=index.js.map