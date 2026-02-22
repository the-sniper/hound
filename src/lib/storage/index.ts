import type { ArtifactStore } from "./artifact-store";

let store: ArtifactStore | null = null;

export function getArtifactStore(): ArtifactStore {
  if (store) return store;

  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    const { S3Store } = require("./s3-store");
    store = new S3Store();
  } else {
    const { LocalStore } = require("./local-store");
    store = new LocalStore();
  }

  return store!;
}

export type { ArtifactStore } from "./artifact-store";
