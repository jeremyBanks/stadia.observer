import { ProtoData } from "../stadia.js";
import { Renderable } from "../jsx.js";
import { flag } from "../flags.js";
import { localKey } from "./local-key.js";

export type Sku = Game | AddOn | Bundle | Subscription;

export class Prices {
  private constructor(
    readonly countryCode: string & { length: 2 },
    readonly currencyCode: string & { length: 3 },
    readonly proPriceCents: number | null = null,
    readonly proSalePriceCents: number | null = null,
    readonly basePriceCents: number | null = null,
    readonly baseSalePriceCents: number | null = null,
  ) {}

  public render(): Renderable {
    // TODO: god remove this once you have fixed type
    if (!this) return;

    if (this.basePriceCents) {
      return `${Math.floor(this.basePriceCents / 100)}.${String(
        this.basePriceCents % 100,
      ).padStart(2, "0")} ${this.currencyCode} ${flag(this.countryCode)}`;
    } else {
      return `∞ ${this.currencyCode} ${flag(this.countryCode)}`;
    }
  }

  public static fromProto(data: ProtoData): Prices {
    let countryCode: string & { length: 2 } = "??" as any;
    let currencyCode: string & { length: 3 } = "???" as any;
    let proPriceCents = null;
    const proSalePriceCents = null;
    let basePriceCents = null;
    const baseSalePriceCents = null;
    const priceScale = 10_000;
    for (const priceData of data) {
      if (priceData[3]) countryCode = priceData[3];
      if (priceData[4]) currencyCode = priceData[4];

      const _timeSpan = [priceData[11], priceData[12]];

      const potentialBasePrice = priceData[6]?.[0]?.[0]
        ? priceData[6][0][0] / priceScale
        : null;

      const potentialProPrice = priceData[6]?.[2]?.[0]?.[2]?.[0]
        ? priceData[6][2][0][2][0] / priceScale
        : null;

      if (potentialBasePrice) basePriceCents = potentialBasePrice;
      if (potentialProPrice) proPriceCents = potentialProPrice;
    }
    return new Prices(
      countryCode,
      currencyCode,
      proPriceCents,
      proSalePriceCents,
      basePriceCents,
      baseSalePriceCents,
    );
  }
}

export abstract class CommonSku {
  constructor(
    readonly app: string,
    readonly sku: string,
    readonly type: "game" | "addon" | "bundle" | "subscription",
    readonly name: string,
    readonly internalSlug: string,
    readonly description: string,
    readonly prices: Prices,
  ) {
    this.localKey = localKey(this);
  }
  readonly localKey: string;
}

export class Game extends CommonSku {
  constructor(
    app: string,
    sku: string,
    readonly type = "game" as const,
    name: string,
    internalSlug: string,
    description: string,
    readonly prices: Prices,
  ) {
    super(app, sku, type, name, internalSlug, description, prices);
  }
}

export class AddOn extends CommonSku {
  constructor(
    app: string,
    sku: string,
    readonly type = "addon" as const,
    name: string,
    internalSlug: string,
    description: string,
    prices: Prices,
  ) {
    super(app, sku, type, name, internalSlug, description, prices);
  }
}

export class Bundle extends CommonSku {
  constructor(
    app: string,
    sku: string,
    readonly type = "bundle" as const,
    name: string,
    internalSlug: string,
    description: string,
    prices: Prices,
    readonly skus: Array<string>,
  ) {
    super(app, sku, type, name, internalSlug, description, prices);
  }
}

export class Subscription extends CommonSku {
  constructor(
    app: string,
    sku: string,
    readonly type = "subscription" as const,
    name: string,
    internalSlug: string,
    description: string,
    prices: Prices,
    readonly skus: Array<string>,
  ) {
    super(app, sku, type, name, internalSlug, description, prices);
  }
}
