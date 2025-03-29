import express from "express"
import bodyParser from "body-parser"
import fs from "node:fs"
import { Buffer } from "node:buffer"
import gL from "./www/oss/oss/common/js/games.mjs";

const gamesList = gL;

import {W_01_Titles} from "./rec.mjs";
/**
 * 
 * @param {Array<string>} suffixes 
 * @param {string} str 
 * @returns 
 */
function endWithAny(suffixes, str) {
  if (!str || !suffixes || suffixes.length === 0) {
    return false; // Handle empty or invalid inputs
  }

  for (const suffix of suffixes) {
    if (str.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}
function searchLikeFuzzy(text, query) {
  if (!query) return true;
  if (!text) return false;

  const cleanText = text.toLowerCase().replace(/[^\w]/g, "");
  const cleanQuery = query.toLowerCase().replace(/[^\w]/g, "");

  return cleanText.includes(cleanQuery);
}
const blankTemplate = {
  id: "",
  title1: "",
  title2: "",
  console: "",
  controllers: "",
  region: "",
  language: "",
  attributes: "",
  date: "",
  added: "",
  publisher: "",
  genre: "",
  points: "",
  players: "",
  rating: "",
  ratingdetails: "",
  thumbnail: "",
  size: "",
  titleVersion: -1,
  page: -1
}
let doTrace = true
const app = express()
app.use(bodyParser.text())
app.get("/getTitle", bodyParser.text({ type: "*/*" }), async function(req, res) {
  let titleId
  console.log("Starting getTitle request for title id " + req.query.titleId)

  if (req.query["titleId"]) titleId = req.query["titleId"]
  if (titleId === undefined) {
    console.log("Sending 400 for no titleId provided")
    res.status(400).json(blankTemplate)
    return
  }

  let currentTitle
  for (var i = 1; i < gamesList.length; i++) {
    if (gamesList[i].id == titleId) {
        gamesList[i].titleVersion = 0
        currentTitle = gamesList[i]
        let tmdData
        //titleId = titleId.replace("00010002", "00010001");
        const tmdBuffer = await fetch(
          `http://198.62.122.200/ccs/download/${titleId.replace("00010002","00010001")}/tmd`
        )
          .then(response => response.arrayBuffer())
          .then(data => (tmdData = data))
        const buffer = Buffer.from(tmdData)
        //Get only the latest version from tmd
        //located at 0x1DC with length 0x02
        const titleVersion = buffer.slice(476, 478)
        currentTitle.titleVersion = titleVersion.readUInt16BE(0)
        break
     }
  }
  try {
    if (typeof currentTitle.id == "undefined") {
      console.log(
        "Sending 500: Unable to find title with the specified titleId"
      )
      res.status(500).json(blankTemplate)
      return
    }
  } catch (err) {
    console.log("Sending 500: Unable to find title with the specified titleId")
    res.status(500).json(blankTemplate)
    return
  }
  console.log("Sending 200 for titleId " + titleId)
  res.status(200).json(currentTitle)
})
app.get("/getTitlesWiiWare", bodyParser.text({ type: "*/*" }), function(req, res) {
  console.log("Getting WiiWare");

  const page = parseInt(req.query["p"] || "1", 10);
  const titlesPerPage = 10;
  const titleName = req.query["title"] ? decodeURIComponent(req.query["title"]).toLowerCase() : null;
  const searchForTitle = !!titleName;
  const startIndex = (page - 1) * titlesPerPage;
  const endIndex = startIndex + titlesPerPage;
  let publisher = decodeURIComponent(req.query["publisher"]).split(",")[0].toLowerCase();
  let genre = req.query["genre"] ? (req.query["genre"] === "TRIAL" ? "Demo" : req.query["genre"]).toLowerCase() : null;
  genre = genre ? genre.toLowerCase() : null;
  let region = "US"; // Default region
  let language = "en"; // Default language
  let regionCode = "45"; // Default region code

  const regionMap = {
    USA: ["41", "42", "45", "4E"],
    EUR: ["41", "44", "46", "49", "4C", "4D", "50", "53", "54"],
    JPN: ["41", "43", "4A"],
    KOR: ["41", "4B", "51", "54"],
  };

  const regionCountry = {
    USA: ["US", "MX", "CA"],
    EUR: ["GB", "FR", "DE", "ES", "IT", "NL"],
    JPN: ["JP"],
    KOR: ["KR"],
  }

  const region3Letter = req.query["region"];
  if (region3Letter && regionMap[region3Letter]) {
    regionCode = regionMap[region3Letter];
  }

  console.log(`region 3 letter: ${region3Letter}`);
  console.log(`Page: ${page}, WIIWARE Search, Publisher: ${publisher}, Genre: ${genre}, language: ${language}, region: ${region}`);

  const filteredGames = gamesList.filter((game) => {
    if (game.language.toLowerCase() !== language || game.id === "0000000000000000" || game.region !== regionCountry[region3Letter][0]) {
      return false;
    }

    if (searchForTitle && !searchLikeFuzzy(game.title1, titleName)) {
      return false;
    }

    if (publisher != "undefined" && game.publisher.toLowerCase() !== publisher.toLowerCase()) {
      return false;
    }

    if (genre && game.genre.toLowerCase() !== genre) {
      return false;
    }

    return game.console.toLowerCase() === "wiiware";
  });

  console.log(`Filtered games count: ${filteredGames.length}`);

  const paginatedGames = filteredGames.slice(startIndex, endIndex).map((game) => ({
    ...game,
    page: page.toString(),
  }));

  res.status(200).json(paginatedGames);
});
app.get("/getTitlesWiiChannels", bodyParser.text({ type: "*/*" }), function(req, res) {
  console.log("Getting Wii Channels!");

  const page = parseInt(req.query["p"] || "1", 10);
  const titlesPerPage = 10;
  const startIndex = (page - 1) * titlesPerPage;
  const endIndex = startIndex + titlesPerPage;
  let genre = req.query["genre"] ? (req.query["genre"] === "TRIAL" ? "Demo" : req.query["genre"]).toLowerCase() : null;
  let region = "US"; // Default region
  let language = "en"; // Default language
  let regionCode = "45"; // Default region code
  const isRec = req.query["rec"];
  const isTitleList1 = req.query["titlelist1"] === "true";
  const isTitleList2 = req.query["titlelist2"] === "true";
  const isTitleList3 = req.query["titlelist3"] === "true";
  const isTitleList4 = req.query["titlelist4"] === "true";

  const regionMap = {
    USA: ["41", "42", "45", "4E"],
    EUR: ["41", "44", "46", "49", "4C", "4D", "50", "53", "54"],
    JPN: ["41", "43", "4A"],
    KOR: ["41", "4B", "51", "54"],
  };

  const regionCountry = {
    USA: ["US", "MX", "CA"],
    EUR: ["GB", "FR", "DE", "ES", "IT", "NL"],
    JPN: ["JP"],
    KOR: ["KR"],
  }

  const region3Letter = req.query["region"];
  if (region3Letter && regionMap[region3Letter]) {
    regionCode = regionMap[region3Letter];
  }
  console.log(`rec: ${isRec}, titleList1: ${isTitleList1}, titleList2: ${isTitleList2}, titleList3: ${isTitleList3}, titleList4: ${isTitleList4}`)
  console.log(`Page: ${page}, Wii Channels / titleList / recommended, language: ${language}, region: ${region}`);
  const filteredGames = gamesList.filter((game) => {
    if (game.language.toLowerCase() !== language || game.id === "0000000000000000" || game.region !== regionCountry[region3Letter][0]) {
      return false;
    }

    if (genre && game.genre.toLowerCase() !== genre) {
      return false;
    }
    if (isRec || isTitleList1 || isTitleList2 || isTitleList3 || isTitleList4) {
      if (isRec) {
        return W_01_Titles[region3Letter].recommendedTitles.includes(game.id)
      }
      if (isTitleList1) {
        return W_01_Titles[region3Letter].titleList1.includes(game.id)
      }
      if (isTitleList2) {
        return W_01_Titles[region3Letter].titleList2.includes(game.id)
      }
      if (isTitleList3) {
        return W_01_Titles[region3Letter].titleList3.includes(game.id)
      }
      if (isTitleList4) {
        return W_01_Titles[region3Letter].titleList4.includes(game.id)
      }
    }
    return game.console.toLowerCase() === "wii";
  });

  console.log(`Filtered games count: ${filteredGames.length}`);

  const paginatedGames = filteredGames.slice(startIndex, endIndex).map((game) => ({
    ...game,
    page: page.toString(),
  }));

  res.status(200).json(paginatedGames);
});
app.get("/getTitlesVc", bodyParser.text({ type: "*/*" }), function(req, res) {
  console.log("Getting VC Channels!");

  const page = parseInt(req.query["p"] || "1", 10);
  const titlesPerPage = 10;
  const titleName = req.query["title"] ? decodeURIComponent(req.query["title"]).toLowerCase() : null;
  const searchForTitle = !!titleName;
  const startIndex = (page - 1) * titlesPerPage;
  const endIndex = startIndex + titlesPerPage;
  let region = "US"; // Default region
  let language = "en"; // Default language
  let regionCode = "45"; // Default region code

  let platform = decodeURIComponent(req.headers["platform"]).replaceAll("+", " ");
  console.log("platform: " + platform);

  let publisher = decodeURIComponent(req.query["publisher"]).split(",")[0].toLowerCase();
  if (publisher === "hal laboratory") {
    publisher = "hal laboratory, inc.";
  }
  console.log("Publisher: " + publisher);

  const platformMap = {
    "fc/nes": "NES",
    "sfc/snes": "Super Nintendo",
    "n64": "Nintendo 64",
    "pce/tg16": "TurboGrafx16",
    "md/gen": "Sega Genesis",
    "neogeo": "NEOGEO",
    "master": "MASTER SYSTEM",
    "virtual console arcade": "Virtual Console Arcade",
    "commodore 64": "Commodore 64",
  };

  if (platform && platform !== "WII") {
    platform = platformMap[platform.toLowerCase()] || platform;
  }

  const regionMap = {
    USA: ["41", "42", "45", "4E"],
    EUR: ["41", "44", "46", "49", "4C", "4D", "50", "53", "54"],
    JPN: ["4A"],
    KOR: ["41", "4B", "51", "54"],
  };

  const regionCountry = {
    USA: ["US", "MX", "CA"],
    EUR: ["GB", "FR", "DE", "ES", "IT", "NL"],
    JPN: ["JP"],
    KOR: ["KR"],
  }

  const region3Letter = req.query["region"];
  if (region3Letter && regionMap[region3Letter]) {
    regionCode = regionMap[region3Letter];
  }
  if (region3Letter == "JPN") language = "";

  console.log(`ending with ${regionCode}`);
  console.log(`Page: ${page}, VC, language: ${language}, region: ${region}, platform: ${platform}`);

  const filteredGames = gamesList.filter((game) => {
    if (game.language.toLowerCase() !== language || game.id === "0000000000000000" || game.region !== regionCountry[region3Letter][0]) {
      return false;
    }

    if (searchForTitle && !searchLikeFuzzy(game.title1, titleName)) {
      return false;
    }

    if (publisher != "undefined") {
      return game.publisher.toLowerCase() == publisher.toLowerCase();
    }

    if (platform && platform !== "WII") {
      if (platform === "Super Nintendo") {
        return game.console === "Super Nintendo" || game.console === "Super NES";
      }
      return game.console === platform;
    }
    
    const vcConsoles = ["Sega Genesis", "MASTER SYSTEM", "Nintendo 64", "Super Nintendo", "Super NES", "NES", "Virtual Console Arcade", "Commodore 64", "TurboGrafx16", "NEOGEO"];
    return vcConsoles.includes(game.console);
  });

  console.log(`Filtered games count: ${filteredGames.length}`);
  if (platform == "NES") {
    
  }
  const paginatedGames = filteredGames.slice(startIndex, endIndex).map((game) => ({
    ...game,
    page: page.toString(),
  }));

  res.status(200).json(paginatedGames);
});
app.get("/getTitles", bodyParser.text({ type: "*/*" }), function(req, res) {
  console.log("Getting titles");

  // Extract and sanitize query parameters
  const page = parseInt(req.query["p"] || "1", 10);
  const titlesPerPage = 10;
  const titleName = req.query["title"] ? decodeURIComponent(req.query["title"]).toLowerCase() : null;
  const searchForTitle = !!titleName;
  const isRec = req.query["rec"] === "true";
  let region = req.query["country"];
  let language = req.query["language"];
  const isTitleList1 = req.query["titlelist1"] === "true";
  const isTitleList2 = req.query["titlelist2"] === "true";
  const isTitleList3 = req.query["titlelist3"] === "true";
  const isTitleList4 = req.query["titlelist4"] === "true";
  let genre = req.query["genre"] ? (req.query["genre"] === "TRIAL" ? "Demo" : req.query["genre"]) : null;
  genre = genre ? genre.toLowerCase() : null;
  const platform = req.headers["platform"];
  const publisherFilter = req.query["publisher"] ? req.query["publisher"].toLowerCase() : null;
  const isVc = req.query["vc"] === "true";
  const titleIds = Array.isArray(req.query.titleId)
    ? req.query.titleId.map(id => id.trim().toLowerCase())
    : req.query.titleId
      ? [req.query.titleId.trim().toLowerCase()]
      : [];
  let regionCode = "45";
  const regionMap = {
    USA: ["41", "42", "45", "4E"],
    EUR: ["41", "44", "46", "49", "4C", "4D", "50", "53", "54"],
    JPN: ["41", "43", "4A"],
    KOR: ["41", "4B", "51", "54"],
  };

  const regionCountry = {
    USA: ["US", "MX", "CA"],
    EUR: ["GB", "FR", "DE", "ES", "IT", "NL"],
    JPN: ["JP"],
    KOR: ["KR"],
  }

  const region3Letter = req.query["region"];
  if (region3Letter && regionMap[region3Letter]) {
    regionCode = regionMap[region3Letter];
  }

  // Normalize region and language
  if (region === "GB" || region === "AU" || region === "CA") {
    region = "US";
    language = "en";
  }

  const startIndex = (page - 1) * titlesPerPage;
  const endIndex = startIndex + titlesPerPage;

  console.log(
    `Page: ${page}, Platform: ${platform}, VC: ${isVc}, Publisher: ${publisherFilter}, Recommended: ${isRec}, Genre: ${genre}, titleList1: ${isTitleList1}, titleList2: ${isTitleList2}, titleList3: ${isTitleList3}, titleList4: ${isTitleList4}, language: ${language}, region: ${region}`
  );

  // Map frontend platform names to corresponding VC platform names
  const vcPlatformsMap = {
    "fc/nes": "nes",
    "sfc/snes": "super nes",
    n64: "nintendo 64",
    "pce/tg16": "turbografx16",
    "md/gen": "sega genesis",
    neogeo: "neogeo",
    master: "master system",
    "commodore 64": "commodore 64",
    "virtual console arcade": "virtual console arcade",
  };

  // Filter games based on query parameters
  const filteredGames = gamesList.filter((game) => {
    if (game.language.toLowerCase() !== language || game.id === "0000000000000000" || game.region !== regionCountry[region3Letter][0]) {
      return false;
    }

    if (searchForTitle && !game.title1.toLowerCase().includes(titleName)) {
      return false;
    }

    if (genre && game.genre.toLowerCase() !== genre) {
      return false;
    }
    if (isRec && !W_01_Titles[region3Letter].recommendedTitles.includes(game.id)) {
      return false;
    }

    if (isTitleList1 && !W_01_Titles[region3Letter].titleList1.includes(game.id)) {
      return false;
    }

    if (isTitleList2 && !W_01_Titles[region3Letter].titleList2.includes(game.id)) {
      return false;
    }

    if (isTitleList3 && !W_01_Titles[region3Letter].titleList3.includes(game.id)) {
      return false;
    }

    if (isTitleList4 && !W_01_Titles[region3Letter].titleList4.includes(game.id)) {
      return false;
    }

    if (titleIds.length > 0 && !titleIds.includes(game.id.toLowerCase())) {
      return false;
    }

    if (publisherFilter && game.publisher.toLowerCase() !== publisherFilter) {
      return false;
    }

    if (platform && (platform.includes("wiiware") || platform.includes("wii channels")) && !game.console.toLowerCase().includes("wii")) {
      return false;
    }

    if (isVc) {
      const mappedPlatform = vcPlatformsMap[platform];
      if (mappedPlatform && game.console.toLowerCase() !== mappedPlatform && !Object.values(vcPlatformsMap).includes(game.console.toLowerCase())) {
        return false;
      }
    } else if (platform && game.console.toLowerCase() !== platform) {
      return false;
    }

    return true;
  });

  console.log(`Filtered games count: ${filteredGames.length}`);

  // Paginate results
  const paginatedGames = filteredGames.slice(startIndex, endIndex).map((game) => ({
    ...game,
    page: page.toString(),
  }));

  res.status(200).json(paginatedGames);
});
//-----------Start publishers code-----------
app.get("/publishers", (req, res) => {
  // Define non-VC platforms
  const normalPlatforms = ["WII", "WIIWARE"]

  // Object to store publisher name and count
  const publisherCounts = {}

  gamesList.forEach(game => {
    if (
      game.region == "US" &&
      game.language == "EN" &&
      game.publisher &&
      normalPlatforms.includes(game.console.toUpperCase())
    ) {
      // Count how many times each publisher appears
      publisherCounts[game.publisher] =
        (publisherCounts[game.publisher] || 0) + 1
    }
  })

  // Convert the object into an array of { publisher, count } and sort alphabetically
  const sortedPublishers = Object.entries(publisherCounts)
    .map(([publisher, count]) => ({ publisher, count }))
    .sort((a, b) => a.publisher.localeCompare(b.publisher)) // Alphabetical sorting

  res.json(sortedPublishers)
})
app.get("/publishers/vc", (req, res) => {
  // Define Virtual Console platforms
  const vcPlatforms = [
    "nintendo 64",
    "nes",
    "super nes",
    "master system",
    "sega genesis",
    "neogeo",
    "virtual console arcade"
  ]

  // Object to store publisher name and count
  const publisherCounts = {}

  gamesList.forEach(game => {
    if (
      game.region == "US" &&
      game.language == "EN" &&
      game.publisher &&
      vcPlatforms.includes(game.console.toLowerCase())
    ) {
      // Count how many times each publisher appears
      publisherCounts[game.publisher] =
        (publisherCounts[game.publisher] || 0) + 1
    }
  })

  // Convert the object into an array of { publisher, count } and sort alphabetically
  const sortedPublishers = Object.entries(publisherCounts)
    .map(([publisher, count]) => ({ publisher, count }))
    .sort((a, b) => a.publisher.localeCompare(b.publisher)) // Alphabetical sorting
  res.status(200).json(sortedPublishers)
})
//-----------End publishers code-----------
app.post("/ecs/log", bodyParser.text({ type: "*/*" }), function(req, res) {
  console.log("Got log file!\nWriting to file...")
  var bodyCopy = req.body
  const buffer = Buffer.from(bodyCopy)
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x0b) {
      buffer[i] = 0x0a
    }
  }
  let fileName = `${new Date().toString()}.txt`
  // If you are on Windows, use .\ or C:\ when putting a directory. Ex. (C:\Users\<your username>\Downloads\ or whatever folder you want to store the logs in)
  // If you are on macOS / Linux / Unix-based system, use ./ or / when putting a directory. Ex. (/home/<your username>/ or /Users/<your name>/ and / or whatever the folder you want to store the logs in)
  // I do not recommend sharing these logs with anyone, as they contain your DeviceId, AccountId, Serial No., and much more about your Wii console.
  fs.writeFileSync(`/home/ocarina/www/EC Logs/${fileName}`, buffer)
  console.log("\nDone! Log should be where you put the directory")
  res.redirect("https://oss-auth.shop.wii.com/oss/serv/debug")
})
app.get("/ecs/log", function(req, res) {
  res
    .status(200)
    .send(
      'hi<br><a href="https://oss-auth.shop.wii.com/oss/serv/index.jsp">go back to shop</a>'
    )
})
app.get("/trace", function(req, res) {
  if (!doTrace) {
    res.status(200).send("No trace because doTrace is false")
  } else {
    //Don't allow empty trace messages to be sent
    if (String(req.headers.msg) == "") return
    console.log("Trace message: " + String(req.headers.msg))
    res.status(200).send("Got trace!")
  }
});
//--------------- W_01 titles
app.get("/W_01titles", bodyParser.text({ type: "*/*" }), function(req, res) {
  console.log("Getting W_01 titles!");

  const language = req.query['language']
  /**@type {'USA' | 'EUR' | 'JPN' | 'KOR'} */
  const region3Letter = req.query["region"];
  let regionCode = "45";
  const regionMap = {
    USA: ["41", "42", "45", "4E"],
    EUR: ["41", "44", "46", "49", "4C", "4D", "50", "53", "54"],
    JPN: ["41", "43", "4A"],
    KOR: ["41", "4B", "51", "54"],
  };
  const regionCountry = {
    USA: ["US", "MX", "CA"],
    EUR: ["GB", "FR", "DE", "ES", "IT", "NL"],
    JPN: ["JP"],
    KOR: ["KR"],
  }
  if (region3Letter && regionMap[region3Letter]) {
    regionCode = regionMap[region3Letter];
  }
  const filteredTitles = gamesList.filter((game) => {
    if (game.language.toLowerCase() !== language || game.id === "0000000000000000" || game.region !== regionCountry[region3Letter][0]) {
      return false;
    }
    if (W_01_Titles[region3Letter].recommendedTitles.includes(game.id) ||
        W_01_Titles[region3Letter].titleList1.includes(game.id) ||
        W_01_Titles[region3Letter].titleList2.includes(game.id) ||
        W_01_Titles[region3Letter].titleList3.includes(game.id) ||
        W_01_Titles[region3Letter].titleList4.includes(game.id)) {
      return true;
    }
    return false;
  });
  console.log(`Filtered titles count: ${filteredTitles.length}`);
  res.status(200).send(filteredTitles);
});

app.listen(8082, "127.0.0.1", function() {
  console.log("Server listening on port 8082")
})


