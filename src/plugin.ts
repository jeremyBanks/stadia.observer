(async () => "plugin entry point")().then(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  try {
    console.clear();
    const spider = new Spider();
    window["spider"] = spider;
    console.debug("🕷️👀", "starting spider", spider);
    const data = await spider.load();
    console.debug("🕷️👀", "completed spider", spider, data);
    spider.download();
  } catch (error) {
    console.error("🕷️👀", error);
  }
});

type ProtoData = any & Array<ProtoData | number | string | boolean | null>;
type Sku = Game | AddOn | Bundle | Subscription;

class Spider {
  private readonly start: () => void;
  private readonly done: Promise<unknown>;
  public constructor(
    private readonly skus: Record<Sku["sku"], Sku> = {},
    private readonly spidered: Record<Sku["sku"], true> = {}
  ) {
    let start: () => void;
    const started = new Promise((resolve) => (start = resolve));
    this.start = start;
    this.done = started
      .then(() => this.spider())
      .then(() => {
        Object.freeze(this.skus);
        for (const sku of Object.values(this.skus)) {
          Object.freeze(sku);
        }
      });
  }

  public async load() {
    this.start();
    await this.done;
    return this.skus;
  }

  private async spider() {
    await this.loadSkuList(3);
    await this.loadSkuList(2001);
    await this.loadSkuList(45);
    await this.loadSkuDetails("be9526126d394061b0eef9b16352357e");

    while (Object.keys(this.skus).length > Object.keys(this.spidered).length) {
      for (const sku of Object.values(this.skus)) {
        if (this.spidered[sku.sku] !== true) {
          console.debug("🕷️👀", "spidering ", sku);
          await this.loadSkuDetails(sku.sku);
          this.spidered[sku.sku] = true;
        }
      }
    }
  }

  public download() {
    const json = JSON.stringify(this.skus, null, 2);
    // XXX: this blob is leaked
    const href = URL.createObjectURL(
      new Blob([json], {
        type: "application/json",
      })
    );
    const el = Object.assign(document.createElement("a"), {
      download: "skus.json",
      href,
    });
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  }

  private async loadSkuList(number: number): Promise<Array<Sku>> {
    const page = await this.fetchPreloadData(`/store/list/${number}`);
    return page.skus;
  }

  private async loadSkuDetails(sku: string) {
    const page = await this.fetchPreloadData(`/store/details/sku/sku/${sku}`);
    if (page.subscriptions?.length) {
    }
    return page;
  }

  private loadSkuData(data: ProtoData): Sku {
    let sku;
    if (data[6] === 1) {
      sku = new Game(data[4], data[0], "game", data[1], data[5], data[9]);
    } else if (data[6] === 2) {
      sku = new AddOn(data[4], data[0], "addon", data[1], data[5], data[9]);
    } else if (data[6] === 3) {
      sku = new Bundle(
        data[4],
        data[0],
        "bundle",
        data[1],
        data[5],
        data[9],
        data[14][0].map((x) => x[0])
      );
    } else if (data[6] === 5) {
      sku = new Subscription(
        data[4],
        data[0],
        "subscription",
        data[1],
        data[5],
        data[9],
        data[14][0].map((x) => x[0])
      );
    } else {
      throw new Error(
        `unexpected sku type id ${JSON.stringify(data[6], null, 4)}`
      );
    }

    return this.loadSku(sku);
  }

  private loadSku(sku: Sku): Sku {
    const existing = this.skus[sku.sku];
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(sku)) {
        const error = new Error(`skus had same sku but different values`);
        console.error("🕷️👀", error);
        console.error("🕷️👀", existing, sku);
        throw error;
      }
      return existing;
    } else {
      this.skus[sku.sku] = sku;
      return sku;
    }
  }

  async fetchPreloadData(url: string) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 16384 + 1536)
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
          Object.entries(requests).map(([key, value]: any) => [key, value])
        )
      )[0];

    const dataCallbackPattern = /^ *AF_initDataCallback *\( *{ *key *: *'([^]*?)' *,[^]*?data: *function *\( *\){ *return *([^]*)\s*}\s*}\s*\)\s*;?\s*$/;
    const dataServiceLoads = contents
      .map((s) => s.match(dataCallbackPattern))
      .filter(Boolean)
      .map((matches) => JSON.parse(matches[2]));

    const dataServiceRpcPrefixes = Object.values(dataServiceRequests).map(
      (x: any) => {
        const pieces = [x.id, ...x.request];
        const aliases = [];
        aliases.push(
          `${pieces[0]}_${pieces.filter((x) => x != null).length - 1}s${
            pieces.filter(Boolean).length - 1
          }t${pieces.length - 1}a`
        );
        while (pieces.length) {
          aliases.push(pieces.join("_"));
          pieces.pop();
        }
        return aliases;
      }
    );

    const preload = Object.values(dataServiceLoads);
    const rpc = {};
    const loaded = {};

    const loaders = {
      WwD3rb: (data: ProtoData) => {
        const skus = data[2].map((p) => this.loadSkuData(p[9]));
        return { skus };
      },
      Qc7K6_24r: (data: ProtoData) => {
        const gameData = data[18]?.[0]?.[9];
        const game = gameData && this.loadSkuData(gameData);
        const addons = (data[19] as any)?.map((x) => this.loadSkuData(x[9]));
        const sku = data[16] && this.loadSkuData(data[16]);

        return { sku, game, addons };
      },
      FLCvtc: (data: ProtoData) => {
        const subscriptionDatas = data[2]?.map((x) => x[9]) ?? [];
        const subscriptions = subscriptionDatas.map((s) => this.loadSkuData(s));
        return { subscriptions };
      },
    };

    for (const [i, data] of Object.entries(preload)) {
      for (const prefix of dataServiceRpcPrefixes[i]) {
        for (const suffix of ["", "_" + Object.keys(data).length + "r"]) {
          rpc[prefix + suffix] = data;
          const loader = loaders[prefix + suffix];
          if (loader) {
            Object.assign(loaded, loader(data));
          }
        }
      }
    }

    const data = Object.assign(
      Object.create({
        preload,
        rpc,
      }),
      loaded
    );

    console.debug("🕷️👀", url, data);

    return data;
  }
}

class CommonSku {
  constructor(
    readonly appId: string,
    readonly sku: string,
    readonly skuType: "game" | "addon" | "bundle" | "subscription",
    readonly name: string,
    readonly somename: string,
    readonly description: string
  ) {}
}

class Game extends CommonSku {
  readonly skuType = "game" as const;
}

class Bundle extends CommonSku {
  constructor(
    appId: string,
    sku: string,
    skuType = "bundle" as const,
    name: string,
    somename: string,
    description: string,
    readonly skus: Array<string>
  ) {
    super(appId, sku, skuType, name, somename, description);
  }
}

class AddOn extends CommonSku {
  readonly skuType = "game" as const;
}

class Subscription extends CommonSku {
  constructor(
    appId: string,
    sku: string,
    skuType = "subscription" as const,
    name: string,
    somename: string,
    description: string,
    readonly skus: Array<string>
  ) {
    super(appId, sku, skuType, name, somename, description);
  }
}
