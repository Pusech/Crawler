const fs = require("fs");
const url = require("url");
const data = require("./data.json");
const { response } = require("express");

const ROOT = "https://test.com";
const NOT_FOUND_PAGE =
  "<!DOCTYPE html><html><head/><body>Not found</body></html>";
const RETRY_PATH = "/v/e";

let totalRequests = 0;

async function fetcher(resource) {
  let response;

  totalRequests += 1;
  if (totalRequests > 24) {
    fs.writeFileSync(
      "./output.txt",
      JSON.stringify({ message: "Too many requests" }, null, 2)
    );
    process.exit(0);
  }
  var q = url.parse(resource, false);
  if (`${q.protocol}//${q.host}` !== ROOT) {
    throw new Error("getaddrinfo ENOTFOUND");
  }
  const pathname = q.pathname;

  if (!(pathname in data)) {
    response = {
      status: 404,
      text: async () => NOT_FOUND_PAGE,
    };
  } else {
    response = {
      status: data[pathname].status,
      text: async () => data[pathname].content,
    };
  }

  if (pathname === RETRY_PATH) {
    data[pathname].status = 200;
    data[pathname].content =
      '<!DOCTYPE html><html><head /><body>test<a href="https://test.com/v/e/a">deep</a><a href="https://test.com/v/e/v">back</a></body></html>';
  }

  return response;
}

module.exports = { fetcher };
