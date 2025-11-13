import { createJiti } from "../../../node_modules/.pnpm/jiti@2.4.2/node_modules/jiti/lib/jiti.mjs";

const jiti = createJiti(import.meta.url, {
  "interopDefault": true,
  "alias": {
    "@vben/turbo-run": "/home/brown/projects/every-shift-vben/scripts/turbo-run"
  },
  "transformOptions": {
    "babel": {
      "plugins": []
    }
  }
})

/** @type {import("/home/brown/projects/every-shift-vben/scripts/turbo-run/src/index.js")} */
const _module = await jiti.import("/home/brown/projects/every-shift-vben/scripts/turbo-run/src/index.ts");

export default _module?.default ?? _module;