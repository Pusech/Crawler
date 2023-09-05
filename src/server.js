const express = require("express");
const { fetcher } = require("../fetcher.js");

const app = express();
const port = 3000;

app.use(express.json());

const maxRetries = 1;

async function fetchHTML(url, retries) {
  const response = await fetcher(url)
    .then((res) => {
      if (res.status === 200) {
        // console.log(url + " ЗАШЛО");
        return res.text();
      } else {
        throw Error(res.status);
      }
    })
    .catch((error) => {
      if (retries > 0) {
        console.error(`Ошибка ${error} при фетче ${url}. Повторная попытка...`);
        return fetchHTML(url, retries - 1);
      } else {
        // console.error(`${url} НЕ ЗАШЛО`);
        return;
      }
    });
  return response;
}

function getLinks(html, domain) {
  //здесь вроде ничего больше не трогать
  try {
    const links = [];
    //"красивый" regex для проверки на то что строка это ссылка
    const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;

    let match;
    while ((match = regex.exec(html)) !== null) {
      let link = match[2];

      if (link.startsWith("/")) {
        link = domain + link;
      }
      const fileExclude = [
        ".pdf",
        ".doc",
        ".jpg",
        ".png",
        ".docx",
        ".JPEG",
        ".JPG",
        ".txt",
      ];
      const shouldExclude = fileExclude.some((extension) =>
        link.endsWith(extension)
      );

      if (
        link &&
        !link.startsWith("#") &&
        link.includes(domain) &&
        !shouldExclude
      ) {
        links.push(link);
      }
    }

    return links;
  } catch (error) {
    console.error("Ошибка", error.message);
    res.status(500).send("Ошибка сервера 500");
  }
}

app.post("/parse", async (req, res) => {
  const { domainName } = req.body;

  const visited = new Set(); // Какие странички были посещены

  const queue = [domainName]; // Первая ссылка в очереди

  while (queue.length > 0) {
    const currentUrl = queue.shift();
    if (!visited.has(currentUrl)) {
      visited.add(currentUrl);
      try {
        const html = await fetchHTML(currentUrl, maxRetries);
        // console.log(html);
        if (!html) {
          console.log(html);
          // console.log(currentUrl + " НЕ ПРОШЛО");
          visited.delete(currentUrl);
        } else {
          // console.log(currentUrl + " ПРОШЛО");
          const links = getLinks(html, domainName);

          // Добавляет найденные ссылки в очередь
          queue.push(...links);
        }
      } catch (error) {
        console.error("Ошибка", error.message);
        res.status(500).send("Ошибка сервера 500");
      }
    }
  }
  const result = [...visited];
  res.json(result);
});

app.listen(port, function () {
  console.log("Server started on port " + port);
});
