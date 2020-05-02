const spider = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  const scripts = Array.from(document.scripts);
  const contents = scripts.map((s) => s.textContent.trim()).filter(Boolean);
  console.log(contents);

  const dataCallbackPattern = /^ *AF_initDataCallback *\( *{ *key *: *'([^]*?)' *,[^]*?data: *function *\( *\){ *return *([^]*)\s*}\s*}\s*\)\s*;?\s*$/;
  const dataServiceLoads = contents
    .map((s) => s.match(dataCallbackPattern))
    .filter(Boolean)
    .map((matches) => JSON.parse(matches[2]));

  const me = new Player(
    dataServiceLoads?.[1]?.[5]?.[5],
    dataServiceLoads?.[2]?.[5]?.[0]?.[0],
    dataServiceLoads?.[2]?.[5]?.[0]?.[1],
    dataServiceLoads?.[2]?.[5]?.[3],
    dataServiceLoads?.[2]?.[5]?.[1]?.[0],
    dataServiceLoads?.[2]?.[5]?.[1]?.[1]
  );

  const myGames = dataServiceLoads?.[8]?.[0]?.map(
    (gameData) =>
      new Game(
        gameData?.[1]?.[4],
        gameData?.[1]?.[0],
        "game",
        gameData?.[1]?.[1],
        gameData?.[1]?.[5],
        gameData?.[1]?.[9]
      )
  );

  console.log({ dataServiceLoads, me, myGames });

  return dataServiceLoads;
};
console.clear();
spider("/home").then(
  (x) => console.log(x),
  (e) => console.error(e)
);

// spider("/store/list/3").then(
//   (x) => console.log(x),
//   (e) => console.error(e)
// );

const players = new Map<Player["playerId"], Player>();
const product = new Map<Product["sku"], Game | Bundle | AddOn>();

class Player {
  constructor(
    readonly playerId = "956082794034380385",
    readonly gamertagName = "Jeremy",
    readonly gamertagNumber = "0000",
    readonly unknown = "JEREMY",
    readonly avatarId = "s00056",
    readonly avatarUrl = "https://www.gstatic.com/stadia/gamers/avatars/mdpi/avatar_56.png"
  ) {}
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
    readonly unknown = "PUBGBATTLEGROUNDS01",
    readonly description = ""
  ) {}
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
