import "./foreground/autoreload.js";
import "./foreground/jsx.js";

import * as models from "./foreground/data/models.js";
import * as views from "./foreground/views.js";

import { fragment } from "./foreground/jsx.js";
import { spider } from "./foreground/spider.js";

export const main = async () => {
  document.head.appendChild(
    fragment(
      <title>stadia.observer</title>,
      <link rel="icon" href="/illufinch-violetsky-edited@2x.png" />,
    ),
  );

  if (browser?.runtime?.id) {
    document.body.appendChild(
      <button onclick={spider} style={{ cursor: "pointer" }}>
        🕷️ Spider Stadia Store
      </button>,
    );
  }

  // TODO: associate prototypes, these are plain Objects.
  const skus: Array<models.Sku> = Object.values(
    await (await fetch("/skus.json")).json(),
  );

  document.body.appendChild(<views.Home skus={skus} />);
};

main().catch(error => console.error("Unexpected error in main.", error));
