import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scannerPath = path.join(__dirname, "../../scanner/url_scanner.py");

export function scanUrl(url) {

  return new Promise((resolve, reject) => {

    execFile(
      "python",
      [scannerPath, url],
      (error, stdout, stderr) => {

        if (error) {
          return reject(error);
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          reject(err);
        }

      }
    );

  });

}