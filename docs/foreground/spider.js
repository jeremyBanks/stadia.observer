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
    const started = new Promise(resolve => (start = resolve));
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
    if (true) {
      await this.loadSkuDetails("59c8314ac82a456ba61d08988b15b550");
      await this.loadSkuDetails("b171fc78d4e1496d9536d585257a771e");
      await this.loadSkuDetails("4950959380034dcda0aecf98f675e11f");
      await this.loadSkuDetails("2e07db5d338d40cb9eac9deae4154f11");
      await this.loadSkuList(3);
      await this.loadSkuList(2001);
      await this.loadSkuList(45);
      await this.loadSkuList(6);
      // throw new Error("TODO: remove me");
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
          .map(sku => records.sorted(sku))
          .map(sku => [sku.localKey, sku]),
      ),
    );
  }
  download() {
    const output = this.output();
    const json = JSON.stringify(output, null, 2);
    // XXX: this blob is leaked
    const href = URL.createObjectURL(
      new Blob([json], {
        type: "application/json",
      }),
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
        prices,
      );
    } else if (typeId === 2) {
      sku = new AddOn(
        app,
        skuId,
        "addon",
        name,
        internalSlug,
        description,
        prices,
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
        data[14][0].map(x => x[0]),
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
        data[14][0].map(x => x[0]),
      );
    } else {
      throw new Error(
        `unexpected sku type id ${JSON.stringify(typeId, null, 4)}`,
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
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 1000 + 2000),
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
    const contents = scripts.map(s => s.textContent?.trim()).filter(Boolean);
    const dataServiceRequestsPattern = /^var *AF_initDataKeys[^]*?var *AF_dataServiceRequests *= *({[^]*}); *?var /;
    const dataServiceRequests = contents
      .map(s => s.match(dataServiceRequestsPattern))
      .filter(Boolean)
      .map(matches =>
        JSON.parse(
          matches[1]
            .replace(/{id:/g, '{"id":')
            .replace(/,request:/g, ',"request":')
            .replace(/'/g, '"'),
        ),
      )
      .map(requests =>
        Object.fromEntries(
          Object.entries(requests).map(([key, value]) => [key, value]),
        ),
      )[0];
    const dataCallbackPattern = /^ *AF_initDataCallback *\( *{ *key *: *'ds:([0-9]+?)' *,[^]*?data: *([^]*)\s*}\s*\)\s*;?\s*$/;
    const dataServiceLoads = [];
    for (const matches of contents
      .map(s => s.match(dataCallbackPattern))
      .filter(Boolean)) {
      dataServiceLoads[matches[1]] = JSON.parse(matches[2]);
    }
    6;
    const dataServiceRpcPrefixes = Object.values(dataServiceRequests).map(x => {
      const pieces = [x.id, ...x.request];
      const aliases = [];
      aliases.push(
        `${pieces[0]}_${pieces.filter(x => x != null).length - 1}s${
          pieces.filter(Boolean).length - 1
        }t${pieces.length - 1}a`,
      );
      while (pieces.length) {
        aliases.push(pieces.join("_"));
        pieces.pop();
      }
      return aliases;
    });
    const preload = Object.values(dataServiceLoads);
    const rpc = {};
    const loaded = {};
    const loaders = {
      WwD3rb: data => {
        const skus = data[2].map(p => this.loadSkuData(p[9], p[9][15]));
        return { skus };
      },
      FWhQV_24r: data => {
        const gameData = data[18]?.[0]?.[9];
        const gamePricingData = data[18]?.[0]?.[15]?.[0];
        const game = gameData && this.loadSkuData(gameData, gamePricingData);
        const addons = data[19]?.map(x => this.loadSkuData(x[9]));
        const skuData = data[16];
        const skuPricingData = data[21]?.[0];
        const sku = skuData && this.loadSkuData(skuData, skuPricingData);
        return { sku, game, addons };
      },
      SYcsTd: data => {
        const subscriptionDatas = data[2]?.map(x => x[9]) ?? [];
        const subscriptions = subscriptionDatas.map(s => this.loadSkuData(s));
        if (subscriptions?.length) return { subscriptions };
        else return {};
      },
      ZAm7W: data => {
        const bundles = data[1].map(x => this.loadSkuData(x[9]));
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
    console.log({ dataServiceRequests, preload, loaders, rpc });
    const data = Object.assign(
      Object.create({
        preload,
        rpc,
      }),
      loaded,
    );
    console.debug(path, data);
    return data;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BpZGVyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJmb3JlZ3JvdW5kL3NwaWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUV4QyxPQUFPLEVBQ0wsS0FBSyxFQUNMLE1BQU0sRUFDTixTQUFTLEVBQ1QsSUFBSSxFQUNKLE1BQU0sRUFFTixZQUFZLEdBQ2IsTUFBTSxXQUFXLENBQUM7QUFJbkIsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQy9CLE1BQU0sT0FBTyxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7SUFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN6QyxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNqQyxPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRCxNQUFNLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNyQixNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxNQUFNO0lBR1YsWUFDbUIsT0FBZ0MsRUFBRSxFQUNsQyxXQUFxQyxFQUFFO1FBRHZDLFNBQUksR0FBSixJQUFJLENBQThCO1FBQ2xDLGFBQVEsR0FBUixRQUFRLENBQStCO1FBRXhELElBQUksS0FBaUIsQ0FBQztRQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUks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S0FBSyxNQUFNLE1BQU0sSUFBSSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDOUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLEVBQUU7b0JBQy9ELEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUM1QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO29CQUN4QyxJQUFJLE1BQU0sRUFBRTt3QkFDVixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDckM7aUJBQ0Y7YUFDRjtTQUNGO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUU1RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUN4QixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ1osT0FBTztZQUNQLEdBQUc7U0FDSixDQUFDLEVBQ0YsTUFBTSxDQUNQLENBQUM7UUFFRixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUUxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJlY29yZHMgZnJvbSBcIi4vcmVjb3Jkcy5qc1wiO1xuXG5pbXBvcnQge1xuICBBZGRPbixcbiAgQnVuZGxlLFxuICBEYXRhU3RvcmUsXG4gIEdhbWUsXG4gIFByaWNlcyxcbiAgU2t1LFxuICBTdWJzY3JpcHRpb24sXG59IGZyb20gXCIuL2RhdGEuanNcIjtcblxuaW1wb3J0IHsgUHJvdG9EYXRhIH0gZnJvbSBcIi4vc3RhZGlhLmpzXCI7XG5cbmV4cG9ydCBjb25zdCBzcGlkZXIgPSBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHN0b3JhZ2UgPSBhd2FpdCBEYXRhU3RvcmUub3BlbigpO1xuICBjb25zdCBzcGlkZXIgPSBuZXcgU3BpZGVyKCk7XG4gIGNvbnNvbGUuZGVidWcoXCJzdGFydGluZyBzcGlkZXJcIiwgc3BpZGVyKTtcbiAgY29uc3QgZGF0YSA9IGF3YWl0IHNwaWRlci5sb2FkKCk7XG4gIGNvbnNvbGUuZGVidWcoXCJjb21wbGV0ZWQgc3BpZGVyXCIsIHNwaWRlciwgZGF0YSk7XG4gIGF3YWl0IHN0b3JhZ2Uuc2F2ZSgpO1xuICBzcGlkZXIuZG93bmxvYWQoKTtcbn07XG5cbmNsYXNzIFNwaWRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhcnQ6ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgZG9uZTogUHJvbWlzZTx1bmtub3duPjtcbiAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc2t1czogUmVjb3JkPFNrdVtcInNrdVwiXSwgU2t1PiA9IHt9LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc3BpZGVyZWQ6IFJlY29yZDxTa3VbXCJza3VcIl0sIHRydWU+ID0ge30sXG4gICkge1xuICAgIGxldCBzdGFydDogKCkgPT4gdm9pZDtcbiAgICBjb25zdCBzdGFydGVkID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiAoc3RhcnQgPSByZXNvbHZlKSk7XG4gICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgIHRoaXMuZG9uZSA9IHN0YXJ0ZWRcbiAgICAgIC50aGVuKCgpID0+IHRoaXMuc3BpZGVyKCkpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIE9iamVjdC5mcmVlemUodGhpcy5za3VzKTtcbiAgICAgICAgZm9yIChjb25zdCBza3Ugb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnNrdXMpKSB7XG4gICAgICAgICAgT2JqZWN0LmZyZWV6ZShza3UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBsb2FkKCkge1xuICAgIHRoaXMuc3RhcnQoKTtcbiAgICBhd2FpdCB0aGlzLmRvbmU7XG4gICAgcmV0dXJuIHRoaXMub3V0cHV0KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNwaWRlcigpIHtcbiAgICBpZiAodHJ1ZSkge1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1RGV0YWlscyhcIjU5YzgzMTRhYzgyYTQ1NmJhNjFkMDg5ODhiMTViNTUwXCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1RGV0YWlscyhcImIxNzFmYzc4ZDRlMTQ5NmQ5NTM2ZDU4NTI1N2E3NzFlXCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1RGV0YWlscyhcIjQ5NTA5NTkzODAwMzRkY2RhMGFlY2Y5OGY2NzVlMTFmXCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1RGV0YWlscyhcIjJlMDdkYjVkMzM4ZDQwY2I5ZWFjOWRlYWU0MTU0ZjExXCIpO1xuICAgICAgYXdhaXQgdGhpcy5sb2FkU2t1TGlzdCgzKTtcbiAgICAgIGF3YWl0IHRoaXMubG9hZFNrdUxpc3QoMjAwMSk7XG4gICAgICBhd2FpdCB0aGlzLmxvYWRTa3VMaXN0KDQ1KTtcbiAgICAgIGF3YWl0IHRoaXMubG9hZFNrdUxpc3QoNik7XG4gICAgICAvLyB0aHJvdyBuZXcgRXJyb3IoXCJUT0RPOiByZW1vdmUgbWVcIik7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5sb2FkU2t1TGlzdCgzKTtcblxuICAgIHdoaWxlIChPYmplY3Qua2V5cyh0aGlzLnNrdXMpLmxlbmd0aCA+IE9iamVjdC5rZXlzKHRoaXMuc3BpZGVyZWQpLmxlbmd0aCkge1xuICAgICAgZm9yIChjb25zdCBza3Ugb2YgT2JqZWN0LnZhbHVlcyh0aGlzLnNrdXMpKSB7XG4gICAgICAgIGlmICh0aGlzLnNwaWRlcmVkW3NrdS5za3VdICE9PSB0cnVlKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcInNwaWRlcmluZyBcIiwgc2t1KTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRTa3VEZXRhaWxzKHNrdS5za3UpO1xuICAgICAgICAgIHRoaXMuc3BpZGVyZWRbc2t1LnNrdV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG91dHB1dCgpIHtcbiAgICByZXR1cm4gcmVjb3Jkcy5zb3J0ZWQoXG4gICAgICBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgIE9iamVjdC52YWx1ZXModGhpcy5za3VzKVxuICAgICAgICAgIC5tYXAoc2t1ID0+IHJlY29yZHMuc29ydGVkKHNrdSkpXG4gICAgICAgICAgLm1hcChza3UgPT4gW3NrdS5sb2NhbEtleSwgc2t1XSksXG4gICAgICApLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgZG93bmxvYWQoKSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5vdXRwdXQoKTtcbiAgICBjb25zdCBqc29uID0gSlNPTi5zdHJpbmdpZnkob3V0cHV0LCBudWxsLCAyKTtcbiAgICAvLyBYWFg6IHRoaXMgYmxvYiBpcyBsZWFrZWRcbiAgICBjb25zdCBocmVmID0gVVJMLmNyZWF0ZU9iamVjdFVSTChcbiAgICAgIG5ldyBCbG9iKFtqc29uXSwge1xuICAgICAgICB0eXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIH0pLFxuICAgICk7XG4gICAgY29uc3QgZWwgPSBPYmplY3QuYXNzaWduKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpLCB7XG4gICAgICBkb3dubG9hZDogXCJza3VzLmpzb25cIixcbiAgICAgIGhyZWYsXG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWwuY2xpY2soKTtcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGVsKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFNrdUxpc3QobnVtYmVyOiBudW1iZXIpIHtcbiAgICBhd2FpdCB0aGlzLmZldGNoUHJlbG9hZERhdGEoYHN0b3JlL2xpc3QvJHtudW1iZXJ9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxvYWRTa3VEZXRhaWxzKHNrdTogc3RyaW5nKSB7XG4gICAgYXdhaXQgdGhpcy5mZXRjaFByZWxvYWREYXRhKGBzdG9yZS9kZXRhaWxzL18vc2t1LyR7c2t1fWApO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkU2t1RGF0YShkYXRhOiBQcm90b0RhdGEsIHByaWNlRGF0YTogUHJvdG9EYXRhKTogU2t1IHtcbiAgICBjb25zdCBhcHA6IHN0cmluZyA9IGRhdGFbNF07XG4gICAgY29uc3Qgc2t1SWQ6IHN0cmluZyA9IGRhdGFbMF07XG4gICAgY29uc3QgbmFtZTogc3RyaW5nID0gZGF0YVsxXTtcbiAgICBjb25zdCBpbnRlcm5hbFNsdWc6IHN0cmluZyA9IGRhdGFbNV07XG4gICAgY29uc3QgZGVzY3JpcHRpb246IHN0cmluZyA9IGRhdGFbOV07XG5cbiAgICBjb25zdCBwcmljZXMgPSBwcmljZURhdGEgJiYgUHJpY2VzLmZyb21Qcm90byhwcmljZURhdGEpO1xuXG4gICAgY29uc3QgdHlwZUlkID0gZGF0YVs2XTtcblxuICAgIGNvbnNvbGUubG9nKHsgbmFtZSwgZGF0YSwgcHJpY2VEYXRhLCBwcmljZXMgfSk7XG5cbiAgICBsZXQgc2t1O1xuICAgIGlmICh0eXBlSWQgPT09IDEpIHtcbiAgICAgIHNrdSA9IG5ldyBHYW1lKFxuICAgICAgICBhcHAsXG4gICAgICAgIHNrdUlkLFxuICAgICAgICBcImdhbWVcIixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgaW50ZXJuYWxTbHVnLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgcHJpY2VzLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVJZCA9PT0gMikge1xuICAgICAgc2t1ID0gbmV3IEFkZE9uKFxuICAgICAgICBhcHAsXG4gICAgICAgIHNrdUlkLFxuICAgICAgICBcImFkZG9uXCIsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGludGVybmFsU2x1ZyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIHByaWNlcyxcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmICh0eXBlSWQgPT09IDMpIHtcbiAgICAgIHNrdSA9IG5ldyBCdW5kbGUoXG4gICAgICAgIGFwcCxcbiAgICAgICAgc2t1SWQsXG4gICAgICAgIFwiYnVuZGxlXCIsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGludGVybmFsU2x1ZyxcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIHByaWNlcyxcbiAgICAgICAgZGF0YVsxNF1bMF0ubWFwKCh4OiBhbnkpID0+IHhbMF0pLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVJZCA9PT0gNSkge1xuICAgICAgc2t1ID0gbmV3IFN1YnNjcmlwdGlvbihcbiAgICAgICAgYXBwLFxuICAgICAgICBza3VJZCxcbiAgICAgICAgXCJzdWJzY3JpcHRpb25cIixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgaW50ZXJuYWxTbHVnLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgcHJpY2VzLFxuICAgICAgICBkYXRhWzE0XVswXS5tYXAoKHg6IGFueSkgPT4geFswXSksXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGB1bmV4cGVjdGVkIHNrdSB0eXBlIGlkICR7SlNPTi5zdHJpbmdpZnkodHlwZUlkLCBudWxsLCA0KX1gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5sb2FkU2t1KHNrdSk7XG4gIH1cblxuICBwcml2YXRlIGxvYWRTa3Uoc2t1OiBTa3UpOiBTa3Uge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5za3VzW3NrdS5za3VdO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgY29uc3QgZXhpc3RpbmdKc29uID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmcpO1xuICAgICAgY29uc3QgbmV3SnNvbiA9IEpTT04uc3RyaW5naWZ5KHNrdSk7XG4gICAgICBpZiAoZXhpc3RpbmdKc29uICE9PSBuZXdKc29uKSB7XG4gICAgICAgIGNvbnNvbGUud2Fybihgc2t1cyBoYWQgc2FtZSBpZHMgYnV0IGRpZmZlcmVudCBwcm9wZXJ0aWVzLmApO1xuICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBza3UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGV4aXN0aW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNrdXNbc2t1LnNrdV0gPSBza3U7XG4gICAgICByZXR1cm4gc2t1O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGZldGNoUHJlbG9hZERhdGEocGF0aDogc3RyaW5nKSB7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PlxuICAgICAgc2V0VGltZW91dChyZXNvbHZlLCBNYXRoLnJhbmRvbSgpICogMV8wMDAgKyAyXzAwMCksXG4gICAgKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFwiaHR0cHM6Ly9zdGFkaWEuZ29vZ2xlLmNvbS9cIiArIHBhdGgsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJVc2VyLUFnZW50XCI6XG4gICAgICAgICAgXCJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvODEuMC40MDQ0LjEzOCBTYWZhcmkvNTM3LjM2XCIsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgY29uc3QgZG9jdW1lbnQgPSBuZXcgRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKGh0bWwsIFwidGV4dC9odG1sXCIpO1xuICAgIGNvbnN0IHNjcmlwdHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnNjcmlwdHMpO1xuICAgIGNvbnN0IGNvbnRlbnRzID0gc2NyaXB0cy5tYXAocyA9PiBzLnRleHRDb250ZW50Py50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcblxuICAgIGNvbnN0IGRhdGFTZXJ2aWNlUmVxdWVzdHNQYXR0ZXJuID0gL152YXIgKkFGX2luaXREYXRhS2V5c1teXSo/dmFyICpBRl9kYXRhU2VydmljZVJlcXVlc3RzICo9ICooe1teXSp9KTsgKj92YXIgLztcblxuICAgIGNvbnN0IGRhdGFTZXJ2aWNlUmVxdWVzdHMgPSBjb250ZW50c1xuICAgICAgLm1hcChzID0+IHMubWF0Y2goZGF0YVNlcnZpY2VSZXF1ZXN0c1BhdHRlcm4pKVxuICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgLm1hcChtYXRjaGVzID0+XG4gICAgICAgIEpTT04ucGFyc2UoXG4gICAgICAgICAgbWF0Y2hlc1sxXVxuICAgICAgICAgICAgLnJlcGxhY2UoL3tpZDovZywgJ3tcImlkXCI6JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8scmVxdWVzdDovZywgJyxcInJlcXVlc3RcIjonKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJ1wiJyksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAubWFwKHJlcXVlc3RzID0+XG4gICAgICAgIE9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgICAgICBPYmplY3QuZW50cmllcyhyZXF1ZXN0cykubWFwKChba2V5LCB2YWx1ZV06IGFueSkgPT4gW2tleSwgdmFsdWVdKSxcbiAgICAgICAgKSxcbiAgICAgIClbMF07XG5cbiAgICBjb25zdCBkYXRhQ2FsbGJhY2tQYXR0ZXJuID0gL14gKkFGX2luaXREYXRhQ2FsbGJhY2sgKlxcKCAqeyAqa2V5ICo6IConZHM6KFswLTldKz8pJyAqLFteXSo/ZGF0YTogKihbXl0qKVxccyp9XFxzKlxcKVxccyo7P1xccyokLztcbiAgICBjb25zdCBkYXRhU2VydmljZUxvYWRzOiBBcnJheTxhbnk+ID0gW107XG4gICAgZm9yIChjb25zdCBtYXRjaGVzIG9mIGNvbnRlbnRzXG4gICAgICAubWFwKHMgPT4gcy5tYXRjaChkYXRhQ2FsbGJhY2tQYXR0ZXJuKSlcbiAgICAgIC5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICAgIGRhdGFTZXJ2aWNlTG9hZHNbbWF0Y2hlc1sxXV0gPSBKU09OLnBhcnNlKG1hdGNoZXNbMl0pO1xuICAgIH1cbiAgICA2O1xuICAgIGNvbnN0IGRhdGFTZXJ2aWNlUnBjUHJlZml4ZXMgPSBPYmplY3QudmFsdWVzKGRhdGFTZXJ2aWNlUmVxdWVzdHMpLm1hcChcbiAgICAgICh4OiBhbnkpID0+IHtcbiAgICAgICAgY29uc3QgcGllY2VzID0gW3guaWQsIC4uLngucmVxdWVzdF07XG4gICAgICAgIGNvbnN0IGFsaWFzZXMgPSBbXTtcbiAgICAgICAgYWxpYXNlcy5wdXNoKFxuICAgICAgICAgIGAke3BpZWNlc1swXX1fJHtwaWVjZXMuZmlsdGVyKCh4OiBhbnkpID0+IHggIT0gbnVsbCkubGVuZ3RoIC0gMX1zJHtcbiAgICAgICAgICAgIHBpZWNlcy5maWx0ZXIoQm9vbGVhbikubGVuZ3RoIC0gMVxuICAgICAgICAgIH10JHtwaWVjZXMubGVuZ3RoIC0gMX1hYCxcbiAgICAgICAgKTtcbiAgICAgICAgd2hpbGUgKHBpZWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICBhbGlhc2VzLnB1c2gocGllY2VzLmpvaW4oXCJfXCIpKTtcbiAgICAgICAgICBwaWVjZXMucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFsaWFzZXM7XG4gICAgICB9LFxuICAgICk7XG5cbiAgICBjb25zdCBwcmVsb2FkID0gT2JqZWN0LnZhbHVlcyhkYXRhU2VydmljZUxvYWRzKTtcbiAgICBjb25zdCBycGM6IGFueSA9IHt9O1xuICAgIGNvbnN0IGxvYWRlZCA9IHt9O1xuXG4gICAgY29uc3QgbG9hZGVyczogYW55ID0ge1xuICAgICAgV3dEM3JiOiAoZGF0YTogUHJvdG9EYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHNrdXMgPSBkYXRhWzJdLm1hcCgocDogYW55KSA9PiB0aGlzLmxvYWRTa3VEYXRhKHBbOV0sIHBbOV1bMTVdKSk7XG4gICAgICAgIHJldHVybiB7IHNrdXMgfTtcbiAgICAgIH0sXG5cbiAgICAgIEZXaFFWXzI0cjogKGRhdGE6IFByb3RvRGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBnYW1lRGF0YSA9IGRhdGFbMThdPy5bMF0/Lls5XTtcbiAgICAgICAgY29uc3QgZ2FtZVByaWNpbmdEYXRhID0gZGF0YVsxOF0/LlswXT8uWzE1XT8uWzBdO1xuICAgICAgICBjb25zdCBnYW1lID0gZ2FtZURhdGEgJiYgdGhpcy5sb2FkU2t1RGF0YShnYW1lRGF0YSwgZ2FtZVByaWNpbmdEYXRhKTtcblxuICAgICAgICBjb25zdCBhZGRvbnMgPSAoZGF0YVsxOV0gYXMgYW55KT8ubWFwKCh4OiBhbnkpID0+XG4gICAgICAgICAgdGhpcy5sb2FkU2t1RGF0YSh4WzldKSxcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBza3VEYXRhID0gZGF0YVsxNl07XG4gICAgICAgIGNvbnN0IHNrdVByaWNpbmdEYXRhID0gZGF0YVsyMV0/LlswXTtcbiAgICAgICAgY29uc3Qgc2t1ID0gc2t1RGF0YSAmJiB0aGlzLmxvYWRTa3VEYXRhKHNrdURhdGEsIHNrdVByaWNpbmdEYXRhKTtcblxuICAgICAgICByZXR1cm4geyBza3UsIGdhbWUsIGFkZG9ucyB9O1xuICAgICAgfSxcblxuICAgICAgU1ljc1RkOiAoZGF0YTogUHJvdG9EYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbkRhdGFzID0gZGF0YVsyXT8ubWFwKCh4OiBhbnkpID0+IHhbOV0pID8/IFtdO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb25zID0gc3Vic2NyaXB0aW9uRGF0YXMubWFwKHMgPT4gdGhpcy5sb2FkU2t1RGF0YShzKSk7XG4gICAgICAgIGlmIChzdWJzY3JpcHRpb25zPy5sZW5ndGgpIHJldHVybiB7IHN1YnNjcmlwdGlvbnMgfTtcbiAgICAgICAgZWxzZSByZXR1cm4ge307XG4gICAgICB9LFxuXG4gICAgICBaQW03VzogKGRhdGE6IFByb3RvRGF0YSkgPT4ge1xuICAgICAgICBjb25zdCBidW5kbGVzID0gZGF0YVsxXS5tYXAoKHg6IGFueSkgPT4gdGhpcy5sb2FkU2t1RGF0YSh4WzldKSk7XG4gICAgICAgIHJldHVybiB7IGJ1bmRsZXMgfTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgW2ksIGRhdGFdIG9mIE9iamVjdC5lbnRyaWVzKHByZWxvYWQpKSB7XG4gICAgICBmb3IgKGNvbnN0IHByZWZpeCBvZiBkYXRhU2VydmljZVJwY1ByZWZpeGVzW2ldKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIFtcIlwiLCBcIl9cIiArIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCArIFwiclwiXSkge1xuICAgICAgICAgIHJwY1twcmVmaXggKyBzdWZmaXhdID0gZGF0YTtcbiAgICAgICAgICBjb25zdCBsb2FkZXIgPSBsb2FkZXJzW3ByZWZpeCArIHN1ZmZpeF07XG4gICAgICAgICAgaWYgKGxvYWRlcikge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihsb2FkZWQsIGxvYWRlcihkYXRhKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coeyBkYXRhU2VydmljZVJlcXVlc3RzLCBwcmVsb2FkLCBsb2FkZXJzLCBycGMgfSk7XG5cbiAgICBjb25zdCBkYXRhID0gT2JqZWN0LmFzc2lnbihcbiAgICAgIE9iamVjdC5jcmVhdGUoe1xuICAgICAgICBwcmVsb2FkLFxuICAgICAgICBycGMsXG4gICAgICB9KSxcbiAgICAgIGxvYWRlZCxcbiAgICApO1xuXG4gICAgY29uc29sZS5kZWJ1ZyhwYXRoLCBkYXRhKTtcblxuICAgIHJldHVybiBkYXRhO1xuICB9XG59XG4iXX0=
