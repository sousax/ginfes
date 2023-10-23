var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
import { program } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { download } from "./download";
const DEFAULT_OUTPUT_FOLDER = "./notas-fiscais";
const DEFAULT_BATCH_AMOUNT = 500;
program.name("ginfes").description("Um programa para facilitar o download de diversas notas fiscais dentro do sistema do Ginfes. Caso o programa n\xE3o funcione da maneira esperada, certifique-se que a sua m\xE1quina atende os requisitos m\xEDnimos descritos no arquivo README.md").version("1.0.0");
program.command("download").description("Baixa todas as notas fiscais dispon\xEDveis dentro da planilha.").requiredOption("-f, --file <file>", "O diret\xF3rio da planilha a ser usada como base.").requiredOption("-u, --user <user>", "O usu\xE1rio usado para fazer o login.").requiredOption("-p, --password <password>", "A senha usada para fazer o login.").option("-s, --sheet <sheet>", "O nome da planilha a ser usada como base.").option("-a, --amount <amount>", "A quantidade m\xE1xima de notas fiscais baixadas por requisi\xE7\xE3o.", String(DEFAULT_BATCH_AMOUNT)).option("-o, --output <output>", "A pasta que todas as notas fiscais ser\xE3o salvas.", DEFAULT_OUTPUT_FOLDER).option("--headless <headless>", "Se o navegador deve ser aberto em modo headless.", true).action((options) => __async(void 0, null, function* () {
  var _a, _b, _c;
  const baseDir = process.cwd();
  options.amount = Number(options.amount);
  options.file = path.resolve(baseDir, options.file);
  options.output = path.resolve(baseDir, options.output);
  options.headless = options.headless === "true";
  options.sheet = (_a = options.sheet) != null ? _a : void 0;
  options.user = (_b = options.user) != null ? _b : void 0;
  options.password = (_c = options.password) != null ? _c : void 0;
  yield fs.mkdir(options.output, { recursive: true });
  yield fs.access(options.file);
  yield download(options);
}));
program.parse();
//# sourceMappingURL=index.js.map