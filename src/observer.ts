Promise.resolve()
  .then(() => main())
  .catch((error) => console.error(error));

const players = new Map<Player["playerId"], Player>();
const products = new Map<Product["sku"], Game | Bundle | AddOn>();

const main = async () => {
  const homePage = await fetchPreloadData("/home");
  const me = Player.fromProto(homePage[5][5]);

  const storePage = await fetchPreloadData("/store/list/3");

  const playerActivityPage = await fetchPreloadData(
    "/profile/956082794034380385/gameactivities/all"
  );

  const gameProfilePage = await fetchPreloadData(
    "/profile/956082794034380385/detail/a4c5eb3f4e614b7fadbba64cba68f849rcp1"
  );

  const pages = { homePage, storePage, playerActivityPage, gameProfilePage };
  console.log(pages);

  const data = { me };
  console.log(data);

  const a = Object.assign(document.createElement("a"), {
    download: "data.json",
    href: URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], {
        type: "application/octet-stream",
      })
    ),
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

class Player {
  constructor(
    readonly playerId = "956082794034380385",
    readonly gamertagName = "Jeremy",
    readonly gamertagNumber = "0000",
    readonly somename = "JEREMY",
    readonly avatarId = "s00056",
    readonly avatarUrl = "https://www.gstatic.com/stadia/gamers/avatars/mdpi/avatar_56.png"
  ) {}

  static fromProto(data: Array<any>): Player {
    return new Player(
      data[5],
      data[0][0],
      data[0][1],
      data[3],
      data[1][0],
      data[1][1]
    );
  }
}

class ProductCommon {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType: "game" | "addon" | "bundle" = "game",
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS"
  ) {}
}

class Game implements ProductCommon {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType = "game" as const,
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS",
    readonly somename = "PUBGBATTLEGROUNDS01",
    readonly description = ""
  ) {}

  static fromProto(data: Array<any>): Game {
    return new Game(data[4], data[0], "game", data[1], data[5], data[9]);
  }
}

class Bundle implements ProductCommon {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType = "bundle" as const,
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS",
    readonly contentSkus = new Set<string>()
  ) {}
}

class AddOn implements ProductCommon {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType = "addon" as const,
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS"
  ) {}
}

type Product = Game | Bundle | AddOn;

const fetchPreloadData = async (
  url: string = "https://stadia.google.com/"
): Promise<Array<Array<any>>> => {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 3500 + 1500)
  );
  const response = await fetch(url);
  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  const scripts = Array.from(document.scripts);
  const contents = scripts.map((s) => s.textContent.trim()).filter(Boolean);
  const dataCallbackPattern = /^ *AF_initDataCallback *\( *{ *key *: *'([^]*?)' *,[^]*?data: *function *\( *\){ *return *([^]*)\s*}\s*}\s*\)\s*;?\s*$/;
  const dataServiceLoads = contents
    .map((s) => s.match(dataCallbackPattern))
    .filter(Boolean)
    .map((matches) => JSON.parse(matches[2]));
  console.debug(url, dataServiceLoads);
  return dataServiceLoads;
};
