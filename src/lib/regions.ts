export interface Region {
  id: string;
  name: string;
  location: string;
  endpoint?: string;
  available: boolean;
}

export const REGIONS: Region[] = [
  { id: "us-east-1", name: "US East", location: "Virginia, USA", available: true },
  { id: "us-west-2", name: "US West", location: "Oregon, USA", available: true },
  { id: "eu-west-1", name: "EU West", location: "Ireland", available: true },
  { id: "eu-central-1", name: "EU Central", location: "Frankfurt, Germany", available: true },
  { id: "ap-southeast-1", name: "Asia Pacific", location: "Singapore", available: true },
  { id: "ap-northeast-1", name: "Japan", location: "Tokyo, Japan", available: true },
];

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function getAvailableRegions(): Region[] {
  return REGIONS.filter((r) => r.available);
}
