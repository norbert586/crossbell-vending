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
  serviceArea: [
    "Washington Township",
    "Shelby Township",
    "Macomb Township",
    "Utica",
    "Romeo / Bruce",
    "Rochester",
    "Rochester Hills",
    "Sterling Heights",
    "Clinton Township",
  ],
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
