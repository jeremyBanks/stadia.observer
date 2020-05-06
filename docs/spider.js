export const spider = async () => {
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
};
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
      setTimeout(resolve, Math.random() * 3000 + 2000)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BpZGVyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJzcGlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQy9CLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RCxJQUFJO1FBQ0YsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM1QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7S0FDbkI7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQy9CO0FBQ0gsQ0FBQyxDQUFDO0FBS0YsTUFBTSxNQUFNO0lBR1YsWUFDbUIsT0FBZ0MsRUFBRSxFQUNsQyxXQUFxQyxFQUFFO1FBRHZDLFNBQUksR0FBSixJQUFJLENBQThCO1FBQ2xDLGFBQVEsR0FBUixRQUFRLENBQStCO1FBRXhELElBQUksS0FBaUIsQ0FBQztRQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU87YUFDaEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN6QixJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNwQjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFJO1FBQ2YsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQU07UUFDbEIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0IsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFFOUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFO1lBQ3hFLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO29CQUNuQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNyRCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7aUJBQy9CO2FBQ0Y7U0FDRjtJQUNILENBQUM7SUFFTSxRQUFRO1FBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDekIsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUN4RCxFQUNELElBQUksRUFDSixDQUFDLENBQ0YsQ0FBQztRQUNGLDJCQUEyQjtRQUMzQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsZUFBZSxDQUM5QixJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2YsSUFBSSxFQUFFLGtCQUFrQjtTQUN6QixDQUFDLENBQ0gsQ0FBQztRQUNGLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwRCxRQUFRLEVBQUUsV0FBVztZQUNyQixJQUFJO1NBQ0wsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1gsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBYztRQUN0QyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBVztRQUN0QyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRU8sV0FBVyxDQUFDLElBQWUsRUFBRSxPQUFrQjtRQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFekIsSUFBSSxHQUFHLENBQUM7UUFDUixJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDaEIsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25EO2FBQU0sSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3ZCLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRDthQUFNLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN2QixHQUFHLEdBQUcsSUFBSSxNQUFNLENBQ2QsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxRQUFRLEVBQ1IsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM3QixDQUFDO1NBQ0g7YUFBTSxJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDdkIsR0FBRyxHQUFHLElBQUksWUFBWSxDQUNwQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLGNBQWMsRUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQzdCLENBQUM7U0FDSDthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FDYiwwQkFBMEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQzVELENBQUM7U0FDSDtRQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRU8sT0FBTyxDQUFDLEdBQVE7UUFDdEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxRQUFRLEVBQUU7WUFDWixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDcEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQztnQkFDbEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDdEMsTUFBTSxLQUFLLENBQUM7YUFDYjtZQUNELE9BQU8sUUFBUSxDQUFDO1NBQ2pCO2FBQU07WUFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDekIsT0FBTyxHQUFHLENBQUM7U0FDWjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBWTtRQUNqQyxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDNUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSyxHQUFHLElBQUssQ0FBQyxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFMUUsTUFBTSwwQkFBMEIsR0FBRyw0RUFBNEUsQ0FBQztRQUVoSCxNQUFNLG1CQUFtQixHQUFHLFFBQVE7YUFDakMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7YUFDL0MsTUFBTSxDQUFDLE9BQU8sQ0FBQzthQUNmLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ2YsSUFBSSxDQUFDLEtBQUssQ0FDUixPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ1AsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7YUFDMUIsT0FBTyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7YUFDcEMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FDdEIsQ0FDRjthQUNBLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQ2hCLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQ2xFLENBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVQLE1BQU0sbUJBQW1CLEdBQUcsNkhBQTZILENBQUM7UUFDMUosTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRO2FBQzNCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZEO1FBRUQsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUNuRSxDQUFDLENBQU0sRUFBRSxFQUFFO1lBQ1QsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNuQixPQUFPLENBQUMsSUFBSSxDQUNWLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUN4RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUNsQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQ3pCLENBQUM7WUFDRixPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDZDtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUVsQixNQUFNLE9BQU8sR0FBRztZQUNkLE1BQU0sRUFBRSxDQUFDLElBQWUsRUFBRSxFQUFFO2dCQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNsQixDQUFDO1lBRUQsU0FBUyxFQUFFLENBQUMsSUFBZSxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sSUFBSSxHQUFHLFFBQVEsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNwRCxNQUFNLE1BQU0sR0FBSSxJQUFJLENBQUMsRUFBRSxDQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUMvQixDQUFDO1lBRUQsTUFBTSxFQUFFLENBQUMsSUFBZSxFQUFFLEVBQUU7Z0JBQzFCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMxRCxNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEUsSUFBSSxhQUFhLEVBQUUsTUFBTTtvQkFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUM7O29CQUMvQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixDQUFDO1lBRUQsS0FBSyxFQUFFLENBQUMsSUFBZSxFQUFFLEVBQUU7Z0JBQ3pCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLENBQUM7U0FDRixDQUFDO1FBRUYsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDL0MsS0FBSyxNQUFNLE1BQU0sSUFBSSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDOUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLEVBQUU7b0JBQy9ELEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUM1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO29CQUN4QyxJQUFJLE1BQU0sRUFBRTt3QkFDVixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDckM7aUJBQ0Y7YUFDRjtTQUNGO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNaLE9BQU87WUFDUCxHQUFHO1NBQ0osQ0FBQyxFQUNGLE1BQU0sQ0FDUCxDQUFDO1FBRUYsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRW5DLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBRUQsTUFBTSxTQUFTO0lBQ2IsWUFDVyxHQUFXLEVBQ1gsR0FBVyxFQUNYLElBQWtELEVBQ2xELElBQVk7UUFIWixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFNBQUksR0FBSixJQUFJLENBQThDO1FBQ2xELFNBQUksR0FBSixJQUFJLENBQVE7SUFDcEIsQ0FBQztJQUVHLEdBQUc7UUFDUixPQUFPLEdBQ0wsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNwRSxJQUFJLENBQUMsSUFDUCxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQzlELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDOUMsRUFBRSxDQUNILEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDcEIsV0FBVyxFQUFFO2FBQ2IsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7YUFDMUIsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUFFRCxNQUFNLElBQUssU0FBUSxTQUFTO0lBQzFCLFlBQ0UsR0FBVyxFQUNYLEdBQVcsRUFDRixPQUFPLE1BQWUsRUFDL0IsSUFBWTtRQUVaLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUhuQixTQUFJLEdBQUosSUFBSSxDQUFrQjtJQUlqQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLEtBQU0sU0FBUSxTQUFTO0lBQzNCLFlBQ0UsR0FBVyxFQUNYLEdBQVcsRUFDRixPQUFPLE9BQWdCLEVBQ2hDLElBQVk7UUFFWixLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFIbkIsU0FBSSxHQUFKLElBQUksQ0FBbUI7SUFJbEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxNQUFPLFNBQVEsU0FBUztJQUM1QixZQUNFLEdBQVcsRUFDWCxHQUFXLEVBQ0YsT0FBTyxRQUFpQixFQUNqQyxJQUFZLEVBQ0gsSUFBbUI7UUFFNUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBSm5CLFNBQUksR0FBSixJQUFJLENBQW9CO1FBRXhCLFNBQUksR0FBSixJQUFJLENBQWU7SUFHOUIsQ0FBQztDQUNGO0FBRUQsTUFBTSxZQUFhLFNBQVEsU0FBUztJQUNsQyxZQUNFLEdBQVcsRUFDWCxHQUFXLEVBQ0YsT0FBTyxjQUF1QixFQUN2QyxJQUFZLEVBQ0gsSUFBbUI7UUFFNUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBSm5CLFNBQUksR0FBSixJQUFJLENBQTBCO1FBRTlCLFNBQUksR0FBSixJQUFJLENBQWU7SUFHOUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IHNwaWRlciA9IGFzeW5jICgpID0+IHtcbiAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTApKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBzcGlkZXIgPSBuZXcgU3BpZGVyKCk7XG4gICAgd2luZG93W1wic3BpZGVyXCJdID0gc3BpZGVyO1xuICAgIGNvbnNvbGUuZGVidWcoXCLwn5W377iP8J+RgFwiLCBcInN0YXJ0aW5nIHNwaWRlclwiLCBzcGlkZXIpO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBzcGlkZXIubG9hZCgpO1xuICAgIGNvbnNvbGUuZGVidWcoXCLwn5W377iP8J+RgFwiLCBcImNvbXBsZXRlZCBzcGlkZXJcIiwgc3BpZGVyLCBkYXRhKTtcbiAgICBzcGlkZXIuZG93bmxvYWQoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwi8J+Vt++4j/CfkYBcIiwgZXJyb3IpO1xuICB9XG59O1xuXG50eXBlIFByb3RvRGF0YSA9IGFueSAmIEFycmF5PFByb3RvRGF0YSB8IG51bWJlciB8IHN0cmluZyB8IGJvb2xlYW4gfCBudWxsPjtcbnR5cGUgU2t1ID0gR2FtZSB8IEFkZE9uIHwgQnVuZGxlIHwgU3Vic2NyaXB0aW9uO1xuXG5jbGFzcyBTcGlkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHN0YXJ0OiAoKSA9PiB2b2lkO1xuICBwcml2YXRlIHJlYWRvbmx5IGRvbmU6IFByb21pc2U8dW5rbm93bj47XG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNrdXM6IFJlY29yZDxTa3VbXCJza3VcIl0sIFNrdT4gPSB7fSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNwaWRlcmVkOiBSZWNvcmQ8U2t1W1wic2t1XCJdLCB0cnVlPiA9IHt9XG4gICkge1xuICAgIGxldCBzdGFydDogKCkgPT4gdm9pZDtcbiAgICBjb25zdCBzdGFydGVkID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IChzdGFydCA9IHJlc29sdmUpKTtcbiAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgdGhpcy5kb25lID0gc3RhcnRlZFxuICAgICAgLnRoZW4oKCkgPT4gdGhpcy5zcGlkZXIoKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzLnNrdXMpO1xuICAgICAgICBmb3IgKGNvbnN0IHNrdSBvZiBPYmplY3QudmFsdWVzKHRoaXMuc2t1cykpIHtcbiAgICAgICAgICBPYmplY3QuZnJlZXplKHNrdSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGxvYWQoKSB7XG4gICAgdGhpcy5zdGFydCgpO1xuICAgIGF3YWl0IHRoaXMuZG9uZTtcbiAgICByZXR1cm4gdGhpcy5za3VzO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzcGlkZXIoKSB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2t1TGlzdCgzKTtcbiAgICBhd2FpdCB0aGlzLmxvYWRTa3VMaXN0KDIwMDEpO1xuICAgIGF3YWl0IHRoaXMubG9hZFNrdUxpc3QoNDUpO1xuICAgIGF3YWl0IHRoaXMubG9hZFNrdURldGFpbHMoXCJiZTk1MjYxMjZkMzk0MDYxYjBlZWY5YjE2MzUyMzU3ZVwiKTtcblxuICAgIHdoaWxlIChPYmplY3Qua2V5cyh0aGlzLnNrdXMpLmxlbmd0aCA+IE9iamVjdC5rZXlzKHRoaXMuc3BpZGVyZWQpLmxlbmd0aCkge1xuICAgICAgZm9yIChjb25zdCBza3Ugb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnNrdXMpKSB7XG4gICAgICAgIGlmICh0aGlzLnNwaWRlcmVkW3NrdS5za3VdICE9PSB0cnVlKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIvCflbfvuI/wn5GAXCIsIFwic3BpZGVyaW5nIFwiLCBza3Uua2V5KCksIHNrdSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1RGV0YWlscyhza3Uuc2t1KTtcbiAgICAgICAgICB0aGlzLnNwaWRlcmVkW3NrdS5za3VdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBkb3dubG9hZCgpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5zdHJpbmdpZnkoXG4gICAgICBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgIE9iamVjdC52YWx1ZXModGhpcy5za3VzKS5tYXAoKHNrdSkgPT4gW3NrdS5rZXkoKSwgc2t1XSlcbiAgICAgICksXG4gICAgICBudWxsLFxuICAgICAgMlxuICAgICk7XG4gICAgLy8gWFhYOiB0aGlzIGJsb2IgaXMgbGVha2VkXG4gICAgY29uc3QgaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoXG4gICAgICBuZXcgQmxvYihbanNvbl0sIHtcbiAgICAgICAgdHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9KVxuICAgICk7XG4gICAgY29uc3QgZWwgPSBPYmplY3QuYXNzaWduKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpLCB7XG4gICAgICBkb3dubG9hZDogXCJza3VzLmpzb25cIixcbiAgICAgIGhyZWYsXG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWwuY2xpY2soKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGVsKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNrdUxpc3QobnVtYmVyOiBudW1iZXIpIHtcbiAgICBhd2FpdCB0aGlzLmZldGNoUHJlbG9hZERhdGEoYHN0b3JlL2xpc3QvJHtudW1iZXJ9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTa3VEZXRhaWxzKHNrdTogc3RyaW5nKSB7XG4gICAgYXdhaXQgdGhpcy5mZXRjaFByZWxvYWREYXRhKGBzdG9yZS9kZXRhaWxzL18vc2t1LyR7c2t1fWApO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkU2t1RGF0YShkYXRhOiBQcm90b0RhdGEsIHByaWNpbmc6IFByb3RvRGF0YSk6IFNrdSB7XG4gICAgY29uc3QgdHlwZUlkID0gZGF0YVs2XTtcblxuICAgIGNvbnNvbGUubG9nKHsgcHJpY2luZyB9KTtcblxuICAgIGxldCBza3U7XG4gICAgaWYgKHR5cGVJZCA9PT0gMSkge1xuICAgICAgc2t1ID0gbmV3IEdhbWUoZGF0YVs0XSwgZGF0YVswXSwgXCJnYW1lXCIsIGRhdGFbMV0pO1xuICAgIH0gZWxzZSBpZiAodHlwZUlkID09PSAyKSB7XG4gICAgICBza3UgPSBuZXcgQWRkT24oZGF0YVs0XSwgZGF0YVswXSwgXCJhZGRvblwiLCBkYXRhWzFdKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVJZCA9PT0gMykge1xuICAgICAgc2t1ID0gbmV3IEJ1bmRsZShcbiAgICAgICAgZGF0YVs0XSxcbiAgICAgICAgZGF0YVswXSxcbiAgICAgICAgXCJidW5kbGVcIixcbiAgICAgICAgZGF0YVsxXSxcbiAgICAgICAgZGF0YVsxNF1bMF0ubWFwKCh4KSA9PiB4WzBdKVxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVJZCA9PT0gNSkge1xuICAgICAgc2t1ID0gbmV3IFN1YnNjcmlwdGlvbihcbiAgICAgICAgZGF0YVs0XSxcbiAgICAgICAgZGF0YVswXSxcbiAgICAgICAgXCJzdWJzY3JpcHRpb25cIixcbiAgICAgICAgZGF0YVsxXSxcbiAgICAgICAgZGF0YVsxNF1bMF0ubWFwKCh4KSA9PiB4WzBdKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgdW5leHBlY3RlZCBza3UgdHlwZSBpZCAke0pTT04uc3RyaW5naWZ5KHR5cGVJZCwgbnVsbCwgNCl9YFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5sb2FkU2t1KHNrdSk7XG4gIH1cblxuICBwcml2YXRlIGxvYWRTa3Uoc2t1OiBTa3UpOiBTa3Uge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5za3VzW3NrdS5za3VdO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nKSAhPT0gSlNPTi5zdHJpbmdpZnkoc2t1KSkge1xuICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihgc2t1cyBoYWQgc2FtZSBza3UgYnV0IGRpZmZlcmVudCB2YWx1ZXNgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIvCflbfvuI/wn5GAXCIsIGVycm9yKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIvCflbfvuI/wn5GAXCIsIGV4aXN0aW5nLCBza3UpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBleGlzdGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5za3VzW3NrdS5za3VdID0gc2t1O1xuICAgICAgcmV0dXJuIHNrdTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBmZXRjaFByZWxvYWREYXRhKHBhdGg6IHN0cmluZykge1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PlxuICAgICAgc2V0VGltZW91dChyZXNvbHZlLCBNYXRoLnJhbmRvbSgpICogM18wMDAgKyAyXzAwMClcbiAgICApO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXCJodHRwczovL3N0YWRpYS5nb29nbGUuY29tL1wiICsgcGF0aCk7XG4gICAgY29uc3QgaHRtbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICBjb25zdCBkb2N1bWVudCA9IG5ldyBET01QYXJzZXIoKS5wYXJzZUZyb21TdHJpbmcoaHRtbCwgXCJ0ZXh0L2h0bWxcIik7XG4gICAgY29uc3Qgc2NyaXB0cyA9IEFycmF5LmZyb20oZG9jdW1lbnQuc2NyaXB0cyk7XG4gICAgY29uc3QgY29udGVudHMgPSBzY3JpcHRzLm1hcCgocykgPT4gcy50ZXh0Q29udGVudC50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcblxuICAgIGNvbnN0IGRhdGFTZXJ2aWNlUmVxdWVzdHNQYXR0ZXJuID0gL152YXIgKkFGX2luaXREYXRhS2V5c1teXSo/dmFyICpBRl9kYXRhU2VydmljZVJlcXVlc3RzICo9ICooe1teXSp9KTsgKj92YXIgLztcblxuICAgIGNvbnN0IGRhdGFTZXJ2aWNlUmVxdWVzdHMgPSBjb250ZW50c1xuICAgICAgLm1hcCgocykgPT4gcy5tYXRjaChkYXRhU2VydmljZVJlcXVlc3RzUGF0dGVybikpXG4gICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAubWFwKChtYXRjaGVzKSA9PlxuICAgICAgICBKU09OLnBhcnNlKFxuICAgICAgICAgIG1hdGNoZXNbMV1cbiAgICAgICAgICAgIC5yZXBsYWNlKC97aWQ6L2csICd7XCJpZFwiOicpXG4gICAgICAgICAgICAucmVwbGFjZSgvLHJlcXVlc3Q6L2csICcsXCJyZXF1ZXN0XCI6JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICdcIicpXG4gICAgICAgIClcbiAgICAgIClcbiAgICAgIC5tYXAoKHJlcXVlc3RzKSA9PlxuICAgICAgICBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgICAgT2JqZWN0LmVudHJpZXMocmVxdWVzdHMpLm1hcCgoW2tleSwgdmFsdWVdOiBhbnkpID0+IFtrZXksIHZhbHVlXSlcbiAgICAgICAgKVxuICAgICAgKVswXTtcblxuICAgIGNvbnN0IGRhdGFDYWxsYmFja1BhdHRlcm4gPSAvXiAqQUZfaW5pdERhdGFDYWxsYmFjayAqXFwoICp7ICprZXkgKjogKidkczooWzAtOV0rPyknICosW15dKj9kYXRhOiAqZnVuY3Rpb24gKlxcKCAqXFwpeyAqcmV0dXJuICooW15dKilcXHMqfVxccyp9XFxzKlxcKVxccyo7P1xccyokLztcbiAgICBjb25zdCBkYXRhU2VydmljZUxvYWRzID0gW107XG4gICAgZm9yIChjb25zdCBtYXRjaGVzIG9mIGNvbnRlbnRzXG4gICAgICAubWFwKChzKSA9PiBzLm1hdGNoKGRhdGFDYWxsYmFja1BhdHRlcm4pKVxuICAgICAgLmZpbHRlcihCb29sZWFuKSkge1xuICAgICAgZGF0YVNlcnZpY2VMb2Fkc1ttYXRjaGVzWzFdXSA9IEpTT04ucGFyc2UobWF0Y2hlc1syXSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YVNlcnZpY2VScGNQcmVmaXhlcyA9IE9iamVjdC52YWx1ZXMoZGF0YVNlcnZpY2VSZXF1ZXN0cykubWFwKFxuICAgICAgKHg6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBwaWVjZXMgPSBbeC5pZCwgLi4ueC5yZXF1ZXN0XTtcbiAgICAgICAgY29uc3QgYWxpYXNlcyA9IFtdO1xuICAgICAgICBhbGlhc2VzLnB1c2goXG4gICAgICAgICAgYCR7cGllY2VzWzBdfV8ke3BpZWNlcy5maWx0ZXIoKHgpID0+IHggIT0gbnVsbCkubGVuZ3RoIC0gMX1zJHtcbiAgICAgICAgICAgIHBpZWNlcy5maWx0ZXIoQm9vbGVhbikubGVuZ3RoIC0gMVxuICAgICAgICAgIH10JHtwaWVjZXMubGVuZ3RoIC0gMX1hYFxuICAgICAgICApO1xuICAgICAgICB3aGlsZSAocGllY2VzLmxlbmd0aCkge1xuICAgICAgICAgIGFsaWFzZXMucHVzaChwaWVjZXMuam9pbihcIl9cIikpO1xuICAgICAgICAgIHBpZWNlcy5wb3AoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWxpYXNlcztcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgcHJlbG9hZCA9IE9iamVjdC52YWx1ZXMoZGF0YVNlcnZpY2VMb2Fkcyk7XG4gICAgY29uc3QgcnBjID0ge307XG4gICAgY29uc3QgbG9hZGVkID0ge307XG5cbiAgICBjb25zdCBsb2FkZXJzID0ge1xuICAgICAgV3dEM3JiOiAoZGF0YTogUHJvdG9EYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHNrdXMgPSBkYXRhWzJdLm1hcCgocCkgPT4gdGhpcy5sb2FkU2t1RGF0YShwWzldKSk7XG4gICAgICAgIHJldHVybiB7IHNrdXMgfTtcbiAgICAgIH0sXG5cbiAgICAgIEZXaFFWXzI0cjogKGRhdGE6IFByb3RvRGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBnYW1lRGF0YSA9IGRhdGFbMThdPy5bMF0/Lls5XTtcbiAgICAgICAgY29uc3QgZ2FtZSA9IGdhbWVEYXRhICYmIHRoaXMubG9hZFNrdURhdGEoZ2FtZURhdGEpO1xuICAgICAgICBjb25zdCBhZGRvbnMgPSAoZGF0YVsxOV0gYXMgYW55KT8ubWFwKCh4KSA9PiB0aGlzLmxvYWRTa3VEYXRhKHhbOV0pKTtcbiAgICAgICAgY29uc3Qgc2t1ID0gZGF0YVsxNl0gJiYgdGhpcy5sb2FkU2t1RGF0YShkYXRhWzE2XSk7XG4gICAgICAgIHJldHVybiB7IHNrdSwgZ2FtZSwgYWRkb25zIH07XG4gICAgICB9LFxuXG4gICAgICBTWWNzVGQ6IChkYXRhOiBQcm90b0RhdGEpID0+IHtcbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uRGF0YXMgPSBkYXRhWzJdPy5tYXAoKHgpID0+IHhbOV0pID8/IFtdO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb25zID0gc3Vic2NyaXB0aW9uRGF0YXMubWFwKChzKSA9PiB0aGlzLmxvYWRTa3VEYXRhKHMpKTtcbiAgICAgICAgaWYgKHN1YnNjcmlwdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIHsgc3Vic2NyaXB0aW9ucyB9O1xuICAgICAgICBlbHNlIHJldHVybiB7fTtcbiAgICAgIH0sXG5cbiAgICAgIFpBbTdXOiAoZGF0YTogUHJvdG9EYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IGJ1bmRsZXMgPSBkYXRhWzFdLm1hcCgoeCkgPT4gdGhpcy5sb2FkU2t1RGF0YSh4WzldKSk7XG4gICAgICAgIHJldHVybiB7IGJ1bmRsZXMgfTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgW2ksIGRhdGFdIG9mIE9iamVjdC5lbnRyaWVzKHByZWxvYWQpKSB7XG4gICAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBkYXRhU2VydmljZVJwY1ByZWZpeGVzW2ldKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIFtcIlwiLCBcIl9cIiArIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCArIFwiclwiXSkge1xuICAgICAgICAgIHJwY1twcmVmaXggKyBzdWZmaXhdID0gZGF0YTtcbiAgICAgICAgICBjb25zdCBsb2FkZXIgPSBsb2FkZXJzW3ByZWZpeCArIHN1ZmZpeF07XG4gICAgICAgICAgaWYgKGxvYWRlcikge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihsb2FkZWQsIGxvYWRlcihkYXRhKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IE9iamVjdC5hc3NpZ24oXG4gICAgICBPYmplY3QuY3JlYXRlKHtcbiAgICAgICAgcHJlbG9hZCxcbiAgICAgICAgcnBjLFxuICAgICAgfSksXG4gICAgICBsb2FkZWRcbiAgICApO1xuXG4gICAgY29uc29sZS5kZWJ1ZyhcIvCflbfvuI/wn5GAXCIsIHBhdGgsIGRhdGEpO1xuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cbn1cblxuY2xhc3MgQ29tbW9uU2t1IHtcbiAgY29uc3RydWN0b3IoXG4gICAgcmVhZG9ubHkgYXBwOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgc2t1OiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgdHlwZTogXCJnYW1lXCIgfCBcImFkZG9uXCIgfCBcImJ1bmRsZVwiIHwgXCJzdWJzY3JpcHRpb25cIixcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmdcbiAgKSB7fVxuXG4gIHB1YmxpYyBrZXkoKSB7XG4gICAgcmV0dXJuIGAke1xuICAgICAgeyBnYW1lOiBcImdcIiwgYWRkb246IFwib1wiLCBidW5kbGU6IFwieFwiLCBzdWJzY3JpcHRpb246IFwiYVwiIH1bdGhpcy50eXBlXSA/P1xuICAgICAgdGhpcy50eXBlXG4gICAgfSR7dGhpcy5hcHAuc2xpY2UoMCwgNil9JHt0aGlzLnNrdS5zbGljZSgwLCA0KX0ke3RoaXMubmFtZS5zbGljZShcbiAgICAgIE1hdGgubWF4KDAsIDAgfCAoKHRoaXMubmFtZS5sZW5ndGggLSAyMCkgLyAyKSksXG4gICAgICAyMFxuICAgICl9JHt0aGlzLnNrdS5zbGljZSg0KX1gXG4gICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgLnJlcGxhY2UoL1teYS16MC05XSsvZywgXCJcIilcbiAgICAgIC5zbGljZSgwLCAzMik7XG4gIH1cbn1cblxuY2xhc3MgR2FtZSBleHRlbmRzIENvbW1vblNrdSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogc3RyaW5nLFxuICAgIHNrdTogc3RyaW5nLFxuICAgIHJlYWRvbmx5IHR5cGUgPSBcImdhbWVcIiBhcyBjb25zdCxcbiAgICBuYW1lOiBzdHJpbmdcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBza3UsIHR5cGUsIG5hbWUpO1xuICB9XG59XG5cbmNsYXNzIEFkZE9uIGV4dGVuZHMgQ29tbW9uU2t1IHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBzdHJpbmcsXG4gICAgc2t1OiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgdHlwZSA9IFwiYWRkb25cIiBhcyBjb25zdCxcbiAgICBuYW1lOiBzdHJpbmdcbiAgKSB7XG4gICAgc3VwZXIoYXBwLCBza3UsIHR5cGUsIG5hbWUpO1xuICB9XG59XG5cbmNsYXNzIEJ1bmRsZSBleHRlbmRzIENvbW1vblNrdSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogc3RyaW5nLFxuICAgIHNrdTogc3RyaW5nLFxuICAgIHJlYWRvbmx5IHR5cGUgPSBcImJ1bmRsZVwiIGFzIGNvbnN0LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICByZWFkb25seSBza3VzOiBBcnJheTxzdHJpbmc+XG4gICkge1xuICAgIHN1cGVyKGFwcCwgc2t1LCB0eXBlLCBuYW1lKTtcbiAgfVxufVxuXG5jbGFzcyBTdWJzY3JpcHRpb24gZXh0ZW5kcyBDb21tb25Ta3Uge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IHN0cmluZyxcbiAgICBza3U6IHN0cmluZyxcbiAgICByZWFkb25seSB0eXBlID0gXCJzdWJzY3JpcHRpb25cIiBhcyBjb25zdCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcmVhZG9ubHkgc2t1czogQXJyYXk8c3RyaW5nPlxuICApIHtcbiAgICBzdXBlcihhcHAsIHNrdSwgdHlwZSwgbmFtZSk7XG4gIH1cbn1cbiJdfQ==
