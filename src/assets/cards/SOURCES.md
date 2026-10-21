# VTM trading-card machine photography

Retrieved 2026-10-21 from VTM's public product galleries. These are unedited manufacturer images, not photographs of Crossbell installations. Wraps, screen prices, and products are examples. Astro generates responsive WebP variants at build time; no supplier requests run in the visitor's browser.

| Local file | Original image | Product/specification source |
| --- | --- | --- |
| `mini-tcg.jpg` | [VTM image](https://cdn.shopify.com/s/files/1/0855/5869/0100/files/pokemon-tcg-wrap-mini-tcg-vending-machine-front-view.avif?v=1782837462) | [Mini TCG](https://vtmvending.com/products/the-mini-tcg-compact-vending-kiosk-for-cards) |
| `slim-wall-tcg.jpg` | [VTM image](https://cdn.shopify.com/s/files/1/0855/5869/0100/files/pokemon-tcg-wrap-slim-wall-tcg-vending-machine-front-view-angle.avif?v=1782838720) | [Slim Wall TCG](https://vtmvending.com/products/slim-wall-tcg-vending) |
| `mega-wall-tcg.jpg` | [VTM image](https://cdn.shopify.com/s/files/1/0855/5869/0100/files/pokemon-tcg-wrap-mega-wall-2-0-tcg-vending-machine-right-angled-view.avif?v=1782908893) | [Mega Wall 2.0 TCG](https://vtmvending.com/products/mega-wall-card-vending-machine) |
| `slim-tower-tcg.jpg` | [VTM image](https://cdn.shopify.com/s/files/1/0855/5869/0100/files/slim-tower-pokemon-vending-machine.avif?v=1782910655) | [Slim Tower 2.0 TCG](https://vtmvending.com/products/slim-pack-tower-2-0-trading-card-vending-machine) |

Capacity, screen size, and cabinet dimensions in `src/data/cardMachines.ts` come from these product pages. Capacities refer to the standard booster-pack configuration; different products change capacity. Cabinet dimensions exclude optional pedestals and installation/service clearances.

Mechanism reference: [VTM setup, refund sensor, and jams](https://help.vtmvending.com/en/articles/17326826-pokemon-tcg-vending-setup-refund-sensor-and-jams). Standard TCG units use 22 mm coils and product pushers; VTM recommends protective top-loader cases. The website does not promise jam-free operation or instant refunds.

Background extraction was attempted with the built-in image tool, which rejected the request. No generated or modified result is used in the site; the source photos above ship unchanged.

The CDN served JPEG bytes from its AVIF-named URLs; local files use the detected JPEG format. Provenance metadata is embedded without altering the picture.
