"use strict";
(async () => `
  https://stadia.google.com/profile/6237980933414544774/gameactivities/all
  fetch("https://stadia.observer/dist/plugin.js")
    .then(_ => _.text())
    .then(textContent => document.head.appendChild(Object.assign(
      document.createElement('script'), {
        nonce: document.querySelector('[nonce]').nonce,
        type: module,
        textContent
      })));
`)().then(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  try {
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
class Spider {
  constructor(skus = {}, spidered = {}) {
    this.skus = skus;
    this.spidered = spidered;
    let start;
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
  async load() {
    this.start();
    await this.done;
    return this.skus;
  }
  async spider() {
    await this.loadSkuList(3);
    await this.loadSkuList(2001);
    await this.loadSkuList(45);
    await this.loadSkuDetails("be9526126d394061b0eef9b16352357e");
    while (Object.keys(this.skus).length > Object.keys(this.spidered).length) {
      for (const sku of Object.values(this.skus)) {
        if (this.spidered[sku.sku] !== true) {
          console.debug("🕷️👀", "spidering ", sku.key(), sku);
          await this.loadSkuDetails(sku.sku);
          this.spidered[sku.sku] = true;
        }
      }
    }
  }
  download() {
    const json = JSON.stringify(
      Object.fromEntries(
        Object.values(this.skus).map((sku) => [sku.key(), sku])
      ),
      null,
      2
    );
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
  async loadSkuList(number) {
    await this.fetchPreloadData(`store/list/${number}`);
  }
  async loadSkuDetails(sku) {
    await this.fetchPreloadData(`store/details/_/sku/${sku}`);
  }
  loadSkuData(data, pricing) {
    const typeId = data[6];
    console.log({ pricing });
    let sku;
    if (typeId === 1) {
      sku = new Game(data[4], data[0], "game", data[1]);
    } else if (typeId === 2) {
      sku = new AddOn(data[4], data[0], "addon", data[1]);
    } else if (typeId === 3) {
      sku = new Bundle(
        data[4],
        data[0],
        "bundle",
        data[1],
        data[14][0].map((x) => x[0])
      );
    } else if (typeId === 5) {
      sku = new Subscription(
        data[4],
        data[0],
        "subscription",
        data[1],
        data[14][0].map((x) => x[0])
      );
    } else {
      throw new Error(
        `unexpected sku type id ${JSON.stringify(typeId, null, 4)}`
      );
    }
    return this.loadSku(sku);
  }
  loadSku(sku) {
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
  async fetchPreloadData(path) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 30000 + 2000)
    );
    const response = await fetch("https://stadia.google.com/" + path);
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
          Object.entries(requests).map(([key, value]) => [key, value])
        )
      )[0];
    const dataCallbackPattern = /^ *AF_initDataCallback *\( *{ *key *: *'ds:([0-9]+?)' *,[^]*?data: *function *\( *\){ *return *([^]*)\s*}\s*}\s*\)\s*;?\s*$/;
    const dataServiceLoads = [];
    for (const matches of contents
      .map((s) => s.match(dataCallbackPattern))
      .filter(Boolean)) {
      dataServiceLoads[matches[1]] = JSON.parse(matches[2]);
    }
    const dataServiceRpcPrefixes = Object.values(dataServiceRequests).map(
      (x) => {
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
      WwD3rb: (data) => {
        const skus = data[2].map((p) => this.loadSkuData(p[9]));
        return { skus };
      },
      FWhQV_24r: (data) => {
        const gameData = data[18]?.[0]?.[9];
        const game = gameData && this.loadSkuData(gameData);
        const addons = data[19]?.map((x) => this.loadSkuData(x[9]));
        const sku = data[16] && this.loadSkuData(data[16]);
        return { sku, game, addons };
      },
      SYcsTd: (data) => {
        const subscriptionDatas = data[2]?.map((x) => x[9]) ?? [];
        const subscriptions = subscriptionDatas.map((s) => this.loadSkuData(s));
        if (subscriptions?.length) return { subscriptions };
        else return {};
      },
      ZAm7W: (data) => {
        const bundles = data[1].map((x) => this.loadSkuData(x[9]));
        return { bundles };
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
    console.debug("🕷️👀", path, data);
    return data;
  }
}
class CommonSku {
  constructor(app, sku, type, name) {
    this.app = app;
    this.sku = sku;
    this.type = type;
    this.name = name;
  }
  key() {
    return `${
      { game: "g", addon: "o", bundle: "x", subscription: "a" }[this.type] ??
      this.type
    }${this.app.slice(0, 6)}${this.sku.slice(0, 4)}${this.name.slice(
      Math.max(0, 0 | ((this.name.length - 20) / 2)),
      20
    )}${this.sku.slice(4)}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 32);
  }
}
class Game extends CommonSku {
  constructor(app, sku, type = "game", name) {
    super(app, sku, type, name);
    this.type = type;
  }
}
class AddOn extends CommonSku {
  constructor(app, sku, type = "addon", name) {
    super(app, sku, type, name);
    this.type = type;
  }
}
class Bundle extends CommonSku {
  constructor(app, sku, type = "bundle", name, skus) {
    super(app, sku, type, name);
    this.type = type;
    this.skus = skus;
  }
}
class Subscription extends CommonSku {
  constructor(app, sku, type = "subscription", name, skus) {
    super(app, sku, type, name);
    this.type = type;
    this.skus = skus;
  }
}
//# sourceMappingURL=spider.js.map
