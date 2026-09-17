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
  // Towns on the weekly route. `lat`/`lon` place the dot on the service-area
  // map (src/components/ServiceAreaMap.astro); the name is what every page prints.
  serviceArea: [
    { name: "Washington Township", lat: 42.73, lon: -83.045 },
    { name: "Shelby Township", lat: 42.671, lon: -83.033 },
    { name: "Macomb Township", lat: 42.668, lon: -82.92 },
    { name: "Utica", lat: 42.626, lon: -83.034 },
    { name: "Romeo / Bruce", lat: 42.812, lon: -83.013 },
    { name: "Rochester", lat: 42.681, lon: -83.134 },
    { name: "Rochester Hills", lat: 42.658, lon: -83.15 },
    { name: "Sterling Heights", lat: 42.58, lon: -83.03 },
    { name: "Clinton Township", lat: 42.587, lon: -82.92 },
  ],
  serviceAreaNote: "and surrounding Macomb and Oakland County communities",
  // The kinds of sites we place coolers at. Drives both the "Where we place them"
  // grid on the home page (`plural` + `icon`) and the contact form's location-type
  // dropdown (`label`), so the two never drift apart. Icons are drawn in
  // src/pages/index.astro. The dropdown adds "Other" and the grid adds "And many
  // more" on their own.
  locationTypes: [
    { label: "Break room", plural: "Break rooms", icon: "mug" },
    { label: "Gym", plural: "Gyms", icon: "barbell" },
    { label: "Apartment community", plural: "Apartment communities", icon: "building" },
    { label: "Auto shop", plural: "Auto shops", icon: "wrench" },
    { label: "Office", plural: "Offices", icon: "desk" },
    { label: "School", plural: "Schools", icon: "school" },
    { label: "Warehouse", plural: "Warehouses", icon: "boxes" },
  ],
} as const;
