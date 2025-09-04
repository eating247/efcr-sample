const https = require("https");

/**
 * Service for interacting with the eCFR API
 */
class ECFRService {
  constructor() {
    this.baseURL = "https://www.ecfr.gov";
  }

  /**
   * Fetch titles data from eCFR API
   */
  async fetchTitlesData() {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}/api/versioner/v1/titles`;

      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (error) {
              reject(
                new Error(`Failed to parse JSON response: ${error.message}`)
              );
            }
          });
        })
        .on("error", (error) => {
          reject(new Error(`Failed to fetch titles data: ${error.message}`));
        });
    });
  }

  /**
   * Fetch specific title information
   */
  async fetchTitleInfo(titleNumber) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}/api/versioner/v1/titles`;

      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const jsonData = JSON.parse(data);
              const title = jsonData.titles?.find(
                (t) => t.number === titleNumber
              );

              if (!title) {
                reject(new Error(`Title ${titleNumber} not found`));
                return;
              }

              resolve(title);
            } catch (error) {
              reject(
                new Error(`Failed to parse JSON response: ${error.message}`)
              );
            }
          });
        })
        .on("error", (error) => {
          reject(new Error(`Failed to fetch title info: ${error.message}`));
        });
    });
  }
}

const ecfrService = new ECFRService();
module.exports = ecfrService;
