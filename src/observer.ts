(async () => {})()
  .then(() => main())
  .catch((error) => console.error(error));

const players: Record<Player["playerId"], Player> = {};
const products: Record<Product["sku"], Product> = {};

const main = async () => {
  console.clear();
  const homePage = await fetchPreloadData("/home");
  // const me = Player.fromProto(
  //   homePage[2]?.[5] ?? homePage[5]?.[5] ?? homePage[4]?.[5]
  // );
  // const myGames = homePage[8]?.[0].map((x) => x[1]).map(Game.fromProto);

  const storeGamesPage = await fetchPreloadData("/store/list/3");
  const storeProDealsPage = await fetchPreloadData("/store/list/45");

  // const allGames = storeGamesPage[1][2].map((x) => x[9]).map(Game.fromProto);
  // const proDeals = storeProDealsPage[1][2]
  //   .map((x) => x[9])
  //   .map(ProductBase.fromProto);

  const playerActivityPage = await fetchPreloadData(
    "/profile/956082794034380385/gameactivities/all"
  );

  const gameProfilePage = await fetchPreloadData(
    "/profile/956082794034380385/detail/a4c5eb3f4e614b7fadbba64cba68f849rcp1"
  );

  const gameProductPage = await fetchPreloadData(
    "/store/details/a4c5eb3f4e614b7fadbba64cba68f849rcp1/sku/71e7c4fc5ca24f0f8301da6d042bf18e"
  );
  // const gameBundles = gameProductPage[5][1]
  //   .map((x) => x[6])
  //   .map(ProductBase.fromProto);
  // const gameAddons = gameProductPage[6][0]
  //   .map((x) => x[9])
  //   .map(ProductBase.fromProto);

  const pages = {
    homePage,
    storeGamesPage,
    playerActivityPage,
    gameProfilePage,
    gameProductPage,
  };

  console.log({ pages, players, products });

  const a = Object.assign(document.createElement("a"), {
    download: "data.json",
    href: URL.createObjectURL(
      new Blob([JSON.stringify(products, null, 2)], {
        type: "application/octet-stream",
      })
    ),
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const requestLabels = {
  "PtnQCd[]": "activeSubscriptions",
  "Qc7K6[]": "ownedGames",
  "LV6ate[]": "currentPlayer",
  "CmnEcf[[3]]": "alsoCurrentPlayer",
  "WwD3rb": "productList",
  "WwD3rb[3]": "allGames",
  "WwD3rb[45]": "stadiaProDeals",
  "T9Kmu[]": "recentCaptures",
  Q6jt8c: "thisPlayer",
  GRn9Gb: "myGames",
  FLCvtc: "bundles",
  Qc7K6: "addons",
  ZAm7We: "product",
};

class Player {
  constructor(
    readonly playerId = "956082794034380385",
    readonly gamertagName = "Jeremy",
    readonly gamertagNumber = "0000",
    readonly somename = "JEREMY",
    readonly avatarId = "s00056",
    readonly avatarUrl = "https://www.gstatic.com/stadia/gamers/avatars/mdpi/avatar_56.png"
  ) {
    players[`${this.somename}_${this.playerId}`] = this;
  }

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

class ProductBase {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType: "game" | "addon" | "bundle" = "game",
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS"
  ) {
    products[`${this.sku}`] = this as Product;
  }

  static fromProto(data: Array<any>): Product {
    if (data[6] === 1) {
      return new Game(data[4], data[0], "game", data[1], data[5], data[9]);
    } else if (data[6] === 2) {
      return new AddOn(data[4], data[0], "addon", data[1]);
    } else if (data[6] === 3) {
      return new Bundle(
        data[4],
        data[0],
        "bundle",
        data[1],
        data[14][0].map((x) => x[0])
      );
    } else {
      throw new Error(
        `unexpected product type id ${JSON.stringify(data, null, 4)}`
      );
    }
  }
}

class Game extends ProductBase {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType = "game" as const,
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS",
    readonly somename = "PUBGBATTLEGROUNDS01",
    readonly description = ""
  ) {
    super(appId, sku, productType, name);
  }
}

class Bundle extends ProductBase {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType = "bundle" as const,
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS",
    readonly bundleSkus = new Array<string>()
  ) {
    super(appId, sku, productType, name);
  }
}

class AddOn extends ProductBase {
  constructor(
    readonly appId = "a4c5eb3f4e614b7fadbba64cba68f849rcp1",
    readonly sku = "71e7c4fc5ca24f0f8301da6d042bf18e",
    readonly productType = "addon" as const,
    readonly name = "PLAYERUNKNOWN'S BATTLEGROUNDS"
  ) {
    super(appId, sku, productType, name);
  }
}

type Product = Game | Bundle | AddOn;

const fetchPreloadData = async (
  url: string = "https://stadia.google.com/"
): Promise<Record<string, Array<any>>> => {
  // TODO: index by AF_dataServiceRequests
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 3500 + 1500)
  );
  const response = await fetch(url);
  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  const scripts = Array.from(document.scripts);
  const contents = scripts.map((s) => s.textContent.trim()).filter(Boolean);

  const dataServiceRequestsPattern = /^var *AF_initDataKeys[^]*?var *AF_dataServiceRequests *= *({[^]*}); *?var /;

  const dataServiceRequests = contents
    .map((s) => s.match(dataServiceRequestsPattern))
    .filter(Boolean)
    .map((matches) =>
      JSON.parse(
        matches[1]
          .replace(/{id:/g, '{"id":')
          .replace(/,request:/g, ',"request":')
          .replace(/'/g, '"')
      )
    )
    .map((requests) =>
      Object.fromEntries(
        Object.entries(requests).map(([key, value]) => [
          key,
          value.id + JSON.stringify(value.request),
        ])
      )
    )[0];

  const dataCallbackPattern = /^ *AF_initDataCallback *\( *{ *key *: *'([^]*?)' *,[^]*?data: *function *\( *\){ *return *([^]*)\s*}\s*}\s*\)\s*;?\s*$/;
  const dataServiceLoads = contents
    .map((s) => s.match(dataCallbackPattern))
    .filter(Boolean)
    .map((matches) => JSON.parse(matches[2]));

  const preloadedData = Object.fromEntries(
    Object.entries(dataServiceLoads)
      .map(([key, value]) => [
        ["_" + key, value],
        [dataServiceRequests["ds:" + key], value],
      ])
      .flat()
      .map(([key, value]) => [
        [key, value],
        [key.split("[")[0], value],
      ])
      .flat()
      .map(([key, value]) => [
        [key, value],
        [requestLabels[key] || key, value],
      ])
      .flat()
  );

  console.debug(url, preloadedData);

  return preloadedData;
};
