import type { ArtifactStore } from "./artifact-store";

import { S3Store } from "./s3-store";
import { LocalStore } from "./local-store";

let store: ArtifactStore | null = null;

export function getArtifactStore(): ArtifactStore {
  if (store) return store;

  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    store = new S3Store();
  } else {
    store = new LocalStore();
  }

  return store!;
}

export type { ArtifactStore } from "./artifact-store";
