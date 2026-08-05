import { STLLoader } from "three/addons/loaders/STLLoader.js";

const loader = new STLLoader();

self.addEventListener("message", async ({ data }) => {
  try {
    for (const model of data.models) {
      self.postMessage({ type: "progress", key: model.key });
      const response = await fetch(model.url);
      if (!response.ok) {
        throw new Error(`Could not load ${model.key}: HTTP ${response.status}`);
      }

      const geometry = loader.parse(await response.arrayBuffer());
      geometry.computeBoundingBox();
      const attributes = {};
      const transfers = [];

      Object.entries(geometry.attributes).forEach(([name, attribute]) => {
        attributes[name] = {
          array: attribute.array,
          itemSize: attribute.itemSize,
          normalized: attribute.normalized,
        };
        transfers.push(attribute.array.buffer);
      });

      let index = null;
      if (geometry.index) {
        index = {
          array: geometry.index.array,
          itemSize: geometry.index.itemSize,
          normalized: geometry.index.normalized,
        };
        transfers.push(geometry.index.array.buffer);
      }

      self.postMessage({
        type: "model",
        key: model.key,
        attributes,
        index,
        bounds: {
          min: geometry.boundingBox.min.toArray(),
          max: geometry.boundingBox.max.toArray(),
        },
      }, transfers);
    }

    self.postMessage({ type: "complete" });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
