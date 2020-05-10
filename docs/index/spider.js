import * as records from "./records.js";
import {
  AddOn,
  Bundle,
  DataStore,
  Game,
  Prices,
  Subscription,
} from "./data.js";
export const spider = async () => {
  const storage = await DataStore.open();
  const spider = new Spider();
  console.debug("starting spider", spider);
  const data = await spider.load();
  console.debug("completed spider", spider, data);
  await storage.save();
  spider.download();
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
    return this.output();
  }
  async spider() {
    if (false) {
      await this.loadSkuDetails("59c8314ac82a456ba61d08988b15b550");
      await this.loadSkuDetails("b171fc78d4e1496d9536d585257a771e");
      await this.loadSkuDetails("4950959380034dcda0aecf98f675e11f");
      await this.loadSkuDetails("2e07db5d338d40cb9eac9deae4154f11");
      await this.loadSkuList(3);
      await this.loadSkuList(2001);
      await this.loadSkuList(45);
      await this.loadSkuList(6);
      throw "TODO: remove me";
    }
    await this.loadSkuList(3);
    while (Object.keys(this.skus).length > Object.keys(this.spidered).length) {
      for (const sku of Object.values(this.skus)) {
        if (this.spidered[sku.sku] !== true) {
          console.debug("spidering ", sku);
          await this.loadSkuDetails(sku.sku);
          this.spidered[sku.sku] = true;
        }
      }
    }
  }
  output() {
    return records.sorted(
      Object.fromEntries(
        Object.values(this.skus)
          .map((sku) => records.sorted(sku))
          .map((sku) => [sku.localKey, sku])
      )
    );
  }
  download() {
    const output = this.output();
    const json = JSON.stringify(output, null, 2);
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
  loadSkuData(data, priceData) {
    const app = data[4];
    const skuId = data[0];
    const name = data[1];
    const internalSlug = data[5];
    const description = data[9];
    const prices = priceData && Prices.fromProto(priceData);
    const typeId = data[6];
    console.log({ name, data, priceData, prices });
    let sku;
    if (typeId === 1) {
      sku = new Game(
        app,
        skuId,
        "game",
        name,
        internalSlug,
        description,
        prices
      );
    } else if (typeId === 2) {
      sku = new AddOn(
        app,
        skuId,
        "addon",
        name,
        internalSlug,
        description,
        prices
      );
    } else if (typeId === 3) {
      sku = new Bundle(
        app,
        skuId,
        "bundle",
        name,
        internalSlug,
        description,
        prices,
        data[14][0].map((x) => x[0])
      );
    } else if (typeId === 5) {
      sku = new Subscription(
        app,
        skuId,
        "subscription",
        name,
        internalSlug,
        description,
        prices,
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
      const existingJson = JSON.stringify(existing);
      const newJson = JSON.stringify(sku);
      if (existingJson !== newJson) {
        console.warn(`skus had same ids but different properties.`);
        Object.assign(existing, sku);
      }
      return existing;
    } else {
      this.skus[sku.sku] = sku;
      return sku;
    }
  }
  async fetchPreloadData(path) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 2000)
    );
    const response = await fetch("https://stadia.google.com/" + path, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
      },
    });
    const html = await response.text();
    const document = new DOMParser().parseFromString(html, "text/html");
    const scripts = Array.from(document.scripts);
    const contents = scripts.map((s) => s.textContent?.trim()).filter(Boolean);
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
    6;
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
        const skus = data[2].map((p) => this.loadSkuData(p[9], p[9][15]));
        return { skus };
      },
      FWhQV_24r: (data) => {
        const gameData = data[18]?.[0]?.[9];
        const gamePricingData = data[18]?.[0]?.[15]?.[0];
        const game = gameData && this.loadSkuData(gameData, gamePricingData);
        const addons = data[19]?.map((x) => this.loadSkuData(x[9]));
        const skuData = data[16];
        const skuPricingData = data[21]?.[0];
        const sku = skuData && this.loadSkuData(skuData, skuPricingData);
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
    console.debug(path, data);
    return data;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BpZGVyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJpbmRleC9zcGlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUM7QUFFeEMsT0FBTyxFQUNMLEtBQUssRUFDTCxNQUFNLEVBQ04sU0FBUyxFQUNULElBQUksRUFDSixNQUFNLEVBRU4sWUFBWSxHQUNiLE1BQU0sV0FBVyxDQUFDO0FBSW5CLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxLQUFLLElBQUksRUFBRTtJQUMvQixNQUFNLE9BQU8sR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekMsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDakMsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEQsTUFBTSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDckIsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVGLE1BQU0sTUFBTTtJQUdWLFlBQ21CLE9BQWdDLEVBQUUsRUFDbEMsV0FBcUMsRUFBRTtRQUR2QyxTQUFJLEdBQUosSUFBSSxDQUE4QjtRQUNsQyxhQUFRLEdBQVIsUUFBUSxDQUErQjtRQUV4RCxJQUFJLEtBQWlCLENBQUM7UUFDdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPO2FBQ2hCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDekIsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNULE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDcEI7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTSxLQUFLLENBQUMsSUFBSTtRQUNmLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNiLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQztRQUNoQixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQU07UUFDbEIsSUFBSSxLQUFLLEVBQUU7WUFDVCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUM5RCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUM5RCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUM5RCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUM5RCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxpQkFBaUIsQ0FBQztTQUN6QjtRQUVELE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7b0JBQ25DLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNqQyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7aUJBQy9CO2FBQ0Y7U0FDRjtJQUNILENBQUM7SUFFTSxNQUFNO1FBQ1gsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUNuQixNQUFNLENBQUMsV0FBVyxDQUNoQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7YUFDckIsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2pDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQ3JDLENBQ0YsQ0FBQztJQUNKLENBQUM7SUFFTSxRQUFRO1FBQ2IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QywyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FDOUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNmLElBQUksRUFBRSxrQkFBa0I7U0FDekIsQ0FBQyxDQUNILENBQUM7UUFDRixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEQsUUFBUSxFQUFFLFdBQVc7WUFDckIsSUFBSTtTQUNMLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNYLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQWM7UUFDdEMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQVc7UUFDdEMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFlLEVBQUUsU0FBb0I7UUFDdkQsTUFBTSxHQUFHLEdBQVcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sS0FBSyxHQUFXLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLElBQUksR0FBVyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsTUFBTSxZQUFZLEdBQVcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sV0FBVyxHQUFXLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwQyxNQUFNLE1BQU0sR0FBRyxTQUFTLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV4RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFL0MsSUFBSSxHQUFHLENBQUM7UUFDUixJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDaEIsR0FBRyxHQUFHLElBQUksSUFBSSxDQUNaLEdBQUcsRUFDSCxLQUFLLEVBQ0wsTUFBTSxFQUNOLElBQUksRUFDSixZQUFZLEVBQ1osV0FBVyxFQUNYLE1BQU0sQ0FDUCxDQUFDO1NBQ0g7YUFBTSxJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDdkIsR0FBRyxHQUFHLElBQUksS0FBSyxDQUNiLEdBQUcsRUFDSCxLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksRUFDSixZQUFZLEVBQ1osV0FBVyxFQUNYLE1BQU0sQ0FDUCxDQUFDO1NBQ0g7YUFBTSxJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDdkIsR0FBRyxHQUFHLElBQUksTUFBTSxDQUNkLEdBQUcsRUFDSCxLQUFLLEVBQ0wsUUFBUSxFQUNSLElBQUksRUFDSixZQUFZLEVBQ1osV0FBVyxFQUNYLE1BQU0sRUFDTixJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbEMsQ0FBQztTQUNIO2FBQU0sSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3ZCLEdBQUcsR0FBRyxJQUFJLFlBQVksQ0FDcEIsR0FBRyxFQUNILEtBQUssRUFDTCxjQUFjLEVBQ2QsSUFBSSxFQUNKLFlBQVksRUFDWixXQUFXLEVBQ1gsTUFBTSxFQUNOLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNsQyxDQUFDO1NBQ0g7YUFBTTtZQUNMLE1BQU0sSUFBSSxLQUFLLENBQ2IsMEJBQTBCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUM1RCxDQUFDO1NBQ0g7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVPLE9BQU8sQ0FBQyxHQUFRO1FBQ3RCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksUUFBUSxFQUFFO1lBQ1osTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLElBQUksWUFBWSxLQUFLLE9BQU8sRUFBRTtnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUM5QjtZQUNELE9BQU8sUUFBUSxDQUFDO1NBQ2pCO2FBQU07WUFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDekIsT0FBTyxHQUFHLENBQUM7U0FDWjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBWTtRQUNqQyxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDNUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSyxHQUFHLElBQUssQ0FBQyxDQUNuRCxDQUFDO1FBQ0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxFQUFFO1lBQ2hFLE9BQU8sRUFBRTtnQkFDUCxZQUFZLEVBQ1YscUhBQXFIO2FBQ3hIO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFM0UsTUFBTSwwQkFBMEIsR0FBRyw0RUFBNEUsQ0FBQztRQUVoSCxNQUFNLG1CQUFtQixHQUFHLFFBQVE7YUFDakMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7YUFDL0MsTUFBTSxDQUFDLE9BQU8sQ0FBQzthQUNmLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ2YsSUFBSSxDQUFDLEtBQUssQ0FDUixPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ1AsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7YUFDMUIsT0FBTyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7YUFDcEMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FDdEIsQ0FDRjthQUNBLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQ2hCLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQ2xFLENBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVQLE1BQU0sbUJBQW1CLEdBQUcsNkhBQTZILENBQUM7UUFDMUosTUFBTSxnQkFBZ0IsR0FBZSxFQUFFLENBQUM7UUFDeEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRO2FBQzNCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNsQixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUNuRSxDQUFDLENBQU0sRUFBRSxFQUFFO1lBQ1QsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNuQixPQUFPLENBQUMsSUFBSSxDQUNWLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUM3RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUNsQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQ3pCLENBQUM7WUFDRixPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDZDtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQztRQUNwQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFFbEIsTUFBTSxPQUFPLEdBQVE7WUFDbkIsTUFBTSxFQUFFLENBQUMsSUFBZSxFQUFFLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNsQixDQUFDO1lBRUQsU0FBUyxFQUFFLENBQUMsSUFBZSxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQsTUFBTSxJQUFJLEdBQUcsUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUVyRSxNQUFNLE1BQU0sR0FBSSxJQUFJLENBQUMsRUFBRSxDQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDdkIsQ0FBQztnQkFFRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLEdBQUcsR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBRWpFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQy9CLENBQUM7WUFFRCxNQUFNLEVBQUUsQ0FBQyxJQUFlLEVBQUUsRUFBRTtnQkFDMUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9ELE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4RSxJQUFJLGFBQWEsRUFBRSxNQUFNO29CQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQzs7b0JBQy9DLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLENBQUM7WUFFRCxLQUFLLEVBQUUsQ0FBQyxJQUFlLEVBQUUsRUFBRTtnQkFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDckIsQ0FBQztTQUNGLENBQUM7UUFFRixLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMvQyxLQUFLLE1BQU0sTUFBTSxJQUFJLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM5QyxLQUFLLE1BQU0sTUFBTSxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsRUFBRTtvQkFDL0QsR0FBRyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7b0JBQzVCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7b0JBQ3hDLElBQUksTUFBTSxFQUFFO3dCQUNWLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUNyQztpQkFDRjthQUNGO1NBQ0Y7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUN4QixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ1osT0FBTztZQUNQLEdBQUc7U0FDSixDQUFDLEVBQ0YsTUFBTSxDQUNQLENBQUM7UUFFRixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUUxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJlY29yZHMgZnJvbSBcIi4vcmVjb3Jkcy5qc1wiO1xuXG5pbXBvcnQge1xuICBBZGRPbixcbiAgQnVuZGxlLFxuICBEYXRhU3RvcmUsXG4gIEdhbWUsXG4gIFByaWNlcyxcbiAgU2t1LFxuICBTdWJzY3JpcHRpb24sXG59IGZyb20gXCIuL2RhdGEuanNcIjtcblxuaW1wb3J0IHsgUHJvdG9EYXRhIH0gZnJvbSBcIi4vc3RhZGlhLmpzXCI7XG5cbmV4cG9ydCBjb25zdCBzcGlkZXIgPSBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHN0b3JhZ2UgPSBhd2FpdCBEYXRhU3RvcmUub3BlbigpO1xuICBjb25zdCBzcGlkZXIgPSBuZXcgU3BpZGVyKCk7XG4gIGNvbnNvbGUuZGVidWcoXCJzdGFydGluZyBzcGlkZXJcIiwgc3BpZGVyKTtcbiAgY29uc3QgZGF0YSA9IGF3YWl0IHNwaWRlci5sb2FkKCk7XG4gIGNvbnNvbGUuZGVidWcoXCJjb21wbGV0ZWQgc3BpZGVyXCIsIHNwaWRlciwgZGF0YSk7XG4gIGF3YWl0IHN0b3JhZ2Uuc2F2ZSgpO1xuICBzcGlkZXIuZG93bmxvYWQoKTtcbn07XG5cbmNsYXNzIFNwaWRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhcnQ6ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgZG9uZTogUHJvbWlzZTx1bmtub3duPjtcbiAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2t1czogUmVjb3JkPFNrdVtcInNrdVwiXSwgU2t1PiA9IHt9LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3BpZGVyZWQ6IFJlY29yZDxTa3VbXCJza3VcIl0sIHRydWU+ID0ge31cbiAgKSB7XG4gICAgbGV0IHN0YXJ0OiAoKSA9PiB2b2lkO1xuICAgIGNvbnN0IHN0YXJ0ZWQgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gKHN0YXJ0ID0gcmVzb2x2ZSkpO1xuICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICB0aGlzLmRvbmUgPSBzdGFydGVkXG4gICAgICAudGhlbigoKSA9PiB0aGlzLnNwaWRlcigpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMuc2t1cyk7XG4gICAgICAgIGZvciAoY29uc3Qgc2t1IG9mIE9iamVjdC52YWx1ZXModGhpcy5za3VzKSkge1xuICAgICAgICAgIE9iamVjdC5mcmVlemUoc2t1KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgbG9hZCgpIHtcbiAgICB0aGlzLnN0YXJ0KCk7XG4gICAgYXdhaXQgdGhpcy5kb25lO1xuICAgIHJldHVybiB0aGlzLm91dHB1dCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzcGlkZXIoKSB7XG4gICAgaWYgKGZhbHNlKSB7XG4gICAgICBhd2FpdCB0aGlzLmxvYWRTa3VEZXRhaWxzKFwiNTljODMxNGFjODJhNDU2YmE2MWQwODk4OGIxNWI1NTBcIik7XG4gICAgICBhd2FpdCB0aGlzLmxvYWRTa3VEZXRhaWxzKFwiYjE3MWZjNzhkNGUxNDk2ZDk1MzZkNTg1MjU3YTc3MWVcIik7XG4gICAgICBhd2FpdCB0aGlzLmxvYWRTa3VEZXRhaWxzKFwiNDk1MDk1OTM4MDAzNGRjZGEwYWVjZjk4ZjY3NWUxMWZcIik7XG4gICAgICBhd2FpdCB0aGlzLmxvYWRTa3VEZXRhaWxzKFwiMmUwN2RiNWQzMzhkNDBjYjllYWM5ZGVhZTQxNTRmMTFcIik7XG4gICAgICBhd2FpdCB0aGlzLmxvYWRTa3VMaXN0KDMpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1TGlzdCgyMDAxKTtcbiAgICAgIGF3YWl0IHRoaXMubG9hZFNrdUxpc3QoNDUpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1TGlzdCg2KTtcbiAgICAgIHRocm93IFwiVE9ETzogcmVtb3ZlIG1lXCI7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2t1TGlzdCgzKTtcblxuICAgIHdoaWxlIChPYmplY3Qua2V5cyh0aGlzLnNrdXMpLmxlbmd0aCA+IE9iamVjdC5rZXlzKHRoaXMuc3BpZGVyZWQpLmxlbmd0aCkge1xuICAgICAgZm9yIChjb25zdCBza3Ugb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnNrdXMpKSB7XG4gICAgICAgIGlmICh0aGlzLnNwaWRlcmVkW3NrdS5za3VdICE9PSB0cnVlKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcInNwaWRlcmluZyBcIiwgc2t1KTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRTa3VEZXRhaWxzKHNrdS5za3UpO1xuICAgICAgICAgIHRoaXMuc3BpZGVyZWRbc2t1LnNrdV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG91dHB1dCgpIHtcbiAgICByZXR1cm4gcmVjb3Jkcy5zb3J0ZWQoXG4gICAgICBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgIE9iamVjdC52YWx1ZXModGhpcy5za3VzKVxuICAgICAgICAgIC5tYXAoKHNrdSkgPT4gcmVjb3Jkcy5zb3J0ZWQoc2t1KSlcbiAgICAgICAgICAubWFwKChza3UpID0+IFtza3UubG9jYWxLZXksIHNrdV0pXG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBkb3dubG9hZCgpIHtcbiAgICBjb25zdCBvdXRwdXQgPSB0aGlzLm91dHB1dCgpO1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeShvdXRwdXQsIG51bGwsIDIpO1xuICAgIC8vIFhYWDogdGhpcyBibG9iIGlzIGxlYWtlZFxuICAgIGNvbnN0IGhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKFxuICAgICAgbmV3IEJsb2IoW2pzb25dLCB7XG4gICAgICAgIHR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSlcbiAgICApO1xuICAgIGNvbnN0IGVsID0gT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKSwge1xuICAgICAgZG93bmxvYWQ6IFwic2t1cy5qc29uXCIsXG4gICAgICBocmVmLFxuICAgIH0pO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsLmNsaWNrKCk7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTa3VMaXN0KG51bWJlcjogbnVtYmVyKSB7XG4gICAgYXdhaXQgdGhpcy5mZXRjaFByZWxvYWREYXRhKGBzdG9yZS9saXN0LyR7bnVtYmVyfWApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsb2FkU2t1RGV0YWlscyhza3U6IHN0cmluZykge1xuICAgIGF3YWl0IHRoaXMuZmV0Y2hQcmVsb2FkRGF0YShgc3RvcmUvZGV0YWlscy9fL3NrdS8ke3NrdX1gKTtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZFNrdURhdGEoZGF0YTogUHJvdG9EYXRhLCBwcmljZURhdGE6IFByb3RvRGF0YSk6IFNrdSB7XG4gICAgY29uc3QgYXBwOiBzdHJpbmcgPSBkYXRhWzRdO1xuICAgIGNvbnN0IHNrdUlkOiBzdHJpbmcgPSBkYXRhWzBdO1xuICAgIGNvbnN0IG5hbWU6IHN0cmluZyA9IGRhdGFbMV07XG4gICAgY29uc3QgaW50ZXJuYWxTbHVnOiBzdHJpbmcgPSBkYXRhWzVdO1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uOiBzdHJpbmcgPSBkYXRhWzldO1xuXG4gICAgY29uc3QgcHJpY2VzID0gcHJpY2VEYXRhICYmIFByaWNlcy5mcm9tUHJvdG8ocHJpY2VEYXRhKTtcblxuICAgIGNvbnN0IHR5cGVJZCA9IGRhdGFbNl07XG5cbiAgICBjb25zb2xlLmxvZyh7IG5hbWUsIGRhdGEsIHByaWNlRGF0YSwgcHJpY2VzIH0pO1xuXG4gICAgbGV0IHNrdTtcbiAgICBpZiAodHlwZUlkID09PSAxKSB7XG4gICAgICBza3UgPSBuZXcgR2FtZShcbiAgICAgICAgYXBwLFxuICAgICAgICBza3VJZCxcbiAgICAgICAgXCJnYW1lXCIsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGludGVybmFsU2x1ZyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIHByaWNlc1xuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVJZCA9PT0gMikge1xuICAgICAgc2t1ID0gbmV3IEFkZE9uKFxuICAgICAgICBhcHAsXG4gICAgICAgIHNrdUlkLFxuICAgICAgICBcImFkZG9uXCIsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGludGVybmFsU2x1ZyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIHByaWNlc1xuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVJZCA9PT0gMykge1xuICAgICAgc2t1ID0gbmV3IEJ1bmRsZShcbiAgICAgICAgYXBwLFxuICAgICAgICBza3VJZCxcbiAgICAgICAgXCJidW5kbGVcIixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgaW50ZXJuYWxTbHVnLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgcHJpY2VzLFxuICAgICAgICBkYXRhWzE0XVswXS5tYXAoKHg6IGFueSkgPT4geFswXSlcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmICh0eXBlSWQgPT09IDUpIHtcbiAgICAgIHNrdSA9IG5ldyBTdWJzY3JpcHRpb24oXG4gICAgICAgIGFwcCxcbiAgICAgICAgc2t1SWQsXG4gICAgICAgIFwic3Vic2NyaXB0aW9uXCIsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGludGVybmFsU2x1ZyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIHByaWNlcyxcbiAgICAgICAgZGF0YVsxNF1bMF0ubWFwKCh4OiBhbnkpID0+IHhbMF0pXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGB1bmV4cGVjdGVkIHNrdSB0eXBlIGlkICR7SlNPTi5zdHJpbmdpZnkodHlwZUlkLCBudWxsLCA0KX1gXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmxvYWRTa3Uoc2t1KTtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZFNrdShza3U6IFNrdSk6IFNrdSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLnNrdXNbc2t1LnNrdV07XG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICBjb25zdCBleGlzdGluZ0pzb24gPSBKU09OLnN0cmluZ2lmeShleGlzdGluZyk7XG4gICAgICBjb25zdCBuZXdKc29uID0gSlNPTi5zdHJpbmdpZnkoc2t1KTtcbiAgICAgIGlmIChleGlzdGluZ0pzb24gIT09IG5ld0pzb24pIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBza3VzIGhhZCBzYW1lIGlkcyBidXQgZGlmZmVyZW50IHByb3BlcnRpZXMuYCk7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHNrdSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXhpc3Rpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2t1c1tza3Uuc2t1XSA9IHNrdTtcbiAgICAgIHJldHVybiBza3U7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmV0Y2hQcmVsb2FkRGF0YShwYXRoOiBzdHJpbmcpIHtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT5cbiAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgTWF0aC5yYW5kb20oKSAqIDFfMDAwICsgMl8wMDApXG4gICAgKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFwiaHR0cHM6Ly9zdGFkaWEuZ29vZ2xlLmNvbS9cIiArIHBhdGgsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJVc2VyLUFnZW50XCI6XG4gICAgICAgICAgXCJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvODEuMC40MDQ0LjEzOCBTYWZhcmkvNTM3LjM2XCIsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgY29uc3QgZG9jdW1lbnQgPSBuZXcgRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKGh0bWwsIFwidGV4dC9odG1sXCIpO1xuICAgIGNvbnN0IHNjcmlwdHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnNjcmlwdHMpO1xuICAgIGNvbnN0IGNvbnRlbnRzID0gc2NyaXB0cy5tYXAoKHMpID0+IHMudGV4dENvbnRlbnQ/LnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pO1xuXG4gICAgY29uc3QgZGF0YVNlcnZpY2VSZXF1ZXN0c1BhdHRlcm4gPSAvXnZhciAqQUZfaW5pdERhdGFLZXlzW15dKj92YXIgKkFGX2RhdGFTZXJ2aWNlUmVxdWVzdHMgKj0gKih7W15dKn0pOyAqP3ZhciAvO1xuXG4gICAgY29uc3QgZGF0YVNlcnZpY2VSZXF1ZXN0cyA9IGNvbnRlbnRzXG4gICAgICAubWFwKChzKSA9PiBzLm1hdGNoKGRhdGFTZXJ2aWNlUmVxdWVzdHNQYXR0ZXJuKSlcbiAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgIC5tYXAoKG1hdGNoZXMpID0+XG4gICAgICAgIEpTT04ucGFyc2UoXG4gICAgICAgICAgbWF0Y2hlc1sxXVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tpZDovZywgJ3tcImlkXCI6JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8scmVxdWVzdDovZywgJyxcInJlcXVlc3RcIjonKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJ1wiJylcbiAgICAgICAgKVxuICAgICAgKVxuICAgICAgLm1hcCgocmVxdWVzdHMpID0+XG4gICAgICAgIE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgICAgICBPYmplY3QuZW50cmllcyhyZXF1ZXN0cykubWFwKChba2V5LCB2YWx1ZV06IGFueSkgPT4gW2tleSwgdmFsdWVdKVxuICAgICAgICApXG4gICAgICApWzBdO1xuXG4gICAgY29uc3QgZGF0YUNhbGxiYWNrUGF0dGVybiA9IC9eICpBRl9pbml0RGF0YUNhbGxiYWNrICpcXCggKnsgKmtleSAqOiAqJ2RzOihbMC05XSs/KScgKixbXl0qP2RhdGE6ICpmdW5jdGlvbiAqXFwoICpcXCl7ICpyZXR1cm4gKihbXl0qKVxccyp9XFxzKn1cXHMqXFwpXFxzKjs/XFxzKiQvO1xuICAgIGNvbnN0IGRhdGFTZXJ2aWNlTG9hZHM6IEFycmF5PGFueT4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoZXMgb2YgY29udGVudHNcbiAgICAgIC5tYXAoKHMpID0+IHMubWF0Y2goZGF0YUNhbGxiYWNrUGF0dGVybikpXG4gICAgICAuZmlsdGVyKEJvb2xlYW4pKSB7XG4gICAgICBkYXRhU2VydmljZUxvYWRzW21hdGNoZXNbMV1dID0gSlNPTi5wYXJzZShtYXRjaGVzWzJdKTtcbiAgICB9XG4gICAgNjtcbiAgICBjb25zdCBkYXRhU2VydmljZVJwY1ByZWZpeGVzID0gT2JqZWN0LnZhbHVlcyhkYXRhU2VydmljZVJlcXVlc3RzKS5tYXAoXG4gICAgICAoeDogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IHBpZWNlcyA9IFt4LmlkLCAuLi54LnJlcXVlc3RdO1xuICAgICAgICBjb25zdCBhbGlhc2VzID0gW107XG4gICAgICAgIGFsaWFzZXMucHVzaChcbiAgICAgICAgICBgJHtwaWVjZXNbMF19XyR7cGllY2VzLmZpbHRlcigoeDogYW55KSA9PiB4ICE9IG51bGwpLmxlbmd0aCAtIDF9cyR7XG4gICAgICAgICAgICBwaWVjZXMuZmlsdGVyKEJvb2xlYW4pLmxlbmd0aCAtIDFcbiAgICAgICAgICB9dCR7cGllY2VzLmxlbmd0aCAtIDF9YWBcbiAgICAgICAgKTtcbiAgICAgICAgd2hpbGUgKHBpZWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICBhbGlhc2VzLnB1c2gocGllY2VzLmpvaW4oXCJfXCIpKTtcbiAgICAgICAgICBwaWVjZXMucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFsaWFzZXM7XG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IHByZWxvYWQgPSBPYmplY3QudmFsdWVzKGRhdGFTZXJ2aWNlTG9hZHMpO1xuICAgIGNvbnN0IHJwYzogYW55ID0ge307XG4gICAgY29uc3QgbG9hZGVkID0ge307XG5cbiAgICBjb25zdCBsb2FkZXJzOiBhbnkgPSB7XG4gICAgICBXd0QzcmI6IChkYXRhOiBQcm90b0RhdGEpID0+IHtcbiAgICAgICAgY29uc3Qgc2t1cyA9IGRhdGFbMl0ubWFwKChwOiBhbnkpID0+IHRoaXMubG9hZFNrdURhdGEocFs5XSwgcFs5XVsxNV0pKTtcbiAgICAgICAgcmV0dXJuIHsgc2t1cyB9O1xuICAgICAgfSxcblxuICAgICAgRldoUVZfMjRyOiAoZGF0YTogUHJvdG9EYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IGdhbWVEYXRhID0gZGF0YVsxOF0/LlswXT8uWzldO1xuICAgICAgICBjb25zdCBnYW1lUHJpY2luZ0RhdGEgPSBkYXRhWzE4XT8uWzBdPy5bMTVdPy5bMF07XG4gICAgICAgIGNvbnN0IGdhbWUgPSBnYW1lRGF0YSAmJiB0aGlzLmxvYWRTa3VEYXRhKGdhbWVEYXRhLCBnYW1lUHJpY2luZ0RhdGEpO1xuXG4gICAgICAgIGNvbnN0IGFkZG9ucyA9IChkYXRhWzE5XSBhcyBhbnkpPy5tYXAoKHg6IGFueSkgPT5cbiAgICAgICAgICB0aGlzLmxvYWRTa3VEYXRhKHhbOV0pXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3Qgc2t1RGF0YSA9IGRhdGFbMTZdO1xuICAgICAgICBjb25zdCBza3VQcmljaW5nRGF0YSA9IGRhdGFbMjFdPy5bMF07XG4gICAgICAgIGNvbnN0IHNrdSA9IHNrdURhdGEgJiYgdGhpcy5sb2FkU2t1RGF0YShza3VEYXRhLCBza3VQcmljaW5nRGF0YSk7XG5cbiAgICAgICAgcmV0dXJuIHsgc2t1LCBnYW1lLCBhZGRvbnMgfTtcbiAgICAgIH0sXG5cbiAgICAgIFNZY3NUZDogKGRhdGE6IFByb3RvRGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb25EYXRhcyA9IGRhdGFbMl0/Lm1hcCgoeDogYW55KSA9PiB4WzldKSA/PyBbXTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9ucyA9IHN1YnNjcmlwdGlvbkRhdGFzLm1hcCgocykgPT4gdGhpcy5sb2FkU2t1RGF0YShzKSk7XG4gICAgICAgIGlmIChzdWJzY3JpcHRpb25zPy5sZW5ndGgpIHJldHVybiB7IHN1YnNjcmlwdGlvbnMgfTtcbiAgICAgICAgZWxzZSByZXR1cm4ge307XG4gICAgICB9LFxuXG4gICAgICBaQW03VzogKGRhdGE6IFByb3RvRGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBidW5kbGVzID0gZGF0YVsxXS5tYXAoKHg6IGFueSkgPT4gdGhpcy5sb2FkU2t1RGF0YSh4WzldKSk7XG4gICAgICAgIHJldHVybiB7IGJ1bmRsZXMgfTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgW2ksIGRhdGFdIG9mIE9iamVjdC5lbnRyaWVzKHByZWxvYWQpKSB7XG4gICAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBkYXRhU2VydmljZVJwY1ByZWZpeGVzW2ldKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIFtcIlwiLCBcIl9cIiArIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCArIFwiclwiXSkge1xuICAgICAgICAgIHJwY1twcmVmaXggKyBzdWZmaXhdID0gZGF0YTtcbiAgICAgICAgICBjb25zdCBsb2FkZXIgPSBsb2FkZXJzW3ByZWZpeCArIHN1ZmZpeF07XG4gICAgICAgICAgaWYgKGxvYWRlcikge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihsb2FkZWQsIGxvYWRlcihkYXRhKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IE9iamVjdC5hc3NpZ24oXG4gICAgICBPYmplY3QuY3JlYXRlKHtcbiAgICAgICAgcHJlbG9hZCxcbiAgICAgICAgcnBjLFxuICAgICAgfSksXG4gICAgICBsb2FkZWRcbiAgICApO1xuXG4gICAgY29uc29sZS5kZWJ1ZyhwYXRoLCBkYXRhKTtcblxuICAgIHJldHVybiBkYXRhO1xuICB9XG59XG4iXX0=
