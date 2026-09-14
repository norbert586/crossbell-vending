// Single source of truth for contact details and service area.
// Change the phone number, email, or service area here — every page reads from this file.
export const site = {
  name: "Crossbell Vending",
  legalName: "Crossbell Vending LLC",
  phone: "586-907-1861",
  phoneTel: "+15869071861",
  email: "crossbellvending@gmail.com",
  url: "https://crossbellvending.com",
  domain: "crossbellvending.com",
  // Latitude/longitude drive the service-area map in ServiceAreaMap.astro, so a
  // new community shows up on the map and in the list from this one edit.
  serviceArea: [
    { name: "Washington Township", lat: 42.7276, lon: -83.0107 },
    { name: "Shelby Township", lat: 42.6705, lon: -83.0332 },
    { name: "Macomb Township", lat: 42.6675, lon: -82.9199 },
    { name: "Utica", lat: 42.6264, lon: -83.0335 },
    { name: "Romeo / Bruce", lat: 42.8028, lon: -83.013 },
    { name: "Rochester", lat: 42.6806, lon: -83.1338 },
    { name: "Rochester Hills", lat: 42.6583, lon: -83.1499 },
    { name: "Sterling Heights", lat: 42.5803, lon: -83.0302 },
    { name: "Clinton Township", lat: 42.5867, lon: -82.9199 },
  ],
  // Marked on the map as where the route runs out of. Must match a name above.
  homeBase: "Washington Township",
  serviceAreaNote: "and surrounding Macomb and Oakland County communities",
  // Shown in the LocalBusiness schema. Adjust to match how you actually answer calls.
  hours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "17:00",
  },
  locationTypes: [
    "Break room",
    "Gym",
    "Apartment community",
    "Auto shop",
    "Light industrial site",
    "Other",
  ],
} as const;
