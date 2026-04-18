import {
  findServicesByUserId,
  createService,
  findPocketAssetsByServiceId,
  addPocketAsset,
  updatePocketAssetQuantity,
  removePocketAsset,
  searchAssetCatalog,
  pool,
} from "@database";
import type { ExchangePocket } from "@exchange";
import type { AssetCatalog } from "@types";

/**
 * Syncs exchange pockets to the database:
 * - Creates child services (Spot, Earn, Futures) under parentServiceId
 * - Upserts pocket_assets with quantities
 * - Auto-adds unknown assets to asset_catalog
 * - Removes assets no longer present on exchange
 */
export async function syncExchangeToDb(
  userId: string,
  parentServiceId: string,
  pockets: ExchangePocket[]
): Promise<{ pocketsCreated: number; assetsCreated: number }> {
  let pocketsCreated = 0;
  let assetsCreated = 0;

  const services = await findServicesByUserId(userId);
  const existingChildren = services.filter(
    (s) => s.parent_id === parentServiceId
  );

  for (const pocket of pockets) {
    // Find or create child service for this pocket type
    let childService = existingChildren.find(
      (s) => s.name.toLowerCase() === pocket.label.toLowerCase()
    );

    if (!childService) {
      childService = await createService({
        user_id: userId,
        name: pocket.label,
        parent_id: parentServiceId,
        service_type: "crypto",
      });
      pocketsCreated++;
    }

    // Get existing assets in this service
    const existingAssets = await findPocketAssetsByServiceId(childService.id);
    const processedAssetIds = new Set<string>();

    for (const asset of pocket.assets) {
      // Find existing pocket asset by symbol
      const existingAsset = existingAssets.find(
        (a) => a.symbol === asset.symbol
      );

      if (existingAsset) {
        // Update quantity if changed
        if (existingAsset.quantity !== asset.quantity) {
          await updatePocketAssetQuantity(
            existingAsset.id,
            parseFloat(asset.quantity)
          );
        }
        processedAssetIds.add(existingAsset.id);
      } else {
        // Find or create asset catalog entry
        let catalogId: string | null = null;
        const catalogResults = await searchAssetCatalog(asset.symbol, "crypto");
        const exactMatch = catalogResults.find(
          (c) => c.symbol === asset.symbol
        );

        if (exactMatch) {
          catalogId = exactMatch.id;
        } else {
          // Auto-add to catalog
          const result = await pool.query<AssetCatalog>(
            `INSERT INTO asset_catalog (symbol, name, asset_type, sort_order)
             VALUES ($1, $2, 'crypto', 999) RETURNING *`,
            [asset.symbol, asset.name]
          );
          catalogId = result.rows[0].id;
        }

        // Create pocket asset
        const created = await addPocketAsset({
          service_id: childService.id,
          asset_catalog_id: catalogId,
          symbol: asset.symbol,
          name: asset.name,
          asset_type: "crypto",
        });
        // Set quantity
        await updatePocketAssetQuantity(
          created.id,
          parseFloat(asset.quantity)
        );
        assetsCreated++;
        processedAssetIds.add(created.id);
      }
    }

    // Remove assets no longer on the exchange
    for (const existing of existingAssets) {
      if (!processedAssetIds.has(existing.id)) {
        await removePocketAsset(existing.id);
      }
    }
  }

  return { pocketsCreated, assetsCreated };
}
