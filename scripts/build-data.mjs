import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");
const FLAG_DIR = path.join(ROOT, "public", "flags");
const REST_BASE = "https://restcountries.com/v3.1/all?fields=";
const CORE_FIELDS = "name,cca2,cca3,capital,region,subregion,population,area,currencies,languages";
const EXTRA_FIELDS = "cca3,flags,latlng,capitalInfo,unMember,independent,status,continents,borders,maps";

const observers = new Set(["VAT", "PSE"]);
const specialHints = new Map([
  ["JPN", "A red sun disc on white: Japan is often called the Land of the Rising Sun."],
  ["CAN", "The maple leaf is the giveaway: red and white with a single central leaf."],
  ["BRA", "Green field, yellow diamond, blue globe: one of the most distinctive flag layouts."],
  ["USA", "Stars for states and stripes for the original colonies."],
  ["GBR", "The Union Jack combines crosses associated with England, Scotland, and Ireland."],
  ["CHE", "A white cross on a red square; Switzerland is one of the rare square national flags."],
  ["NPL", "Nepal's flag is the famous non-rectangular national flag."],
  ["ZAF", "South Africa's flag uses a Y-shape, a strong clue even at small sizes."],
  ["KOR", "South Korea's Taegeuk symbol and black trigrams make it easy to separate from other white flags."],
  ["MEX", "Look for the eagle and snake in the center of the green-white-red tricolor."],
  ["IND", "The navy Ashoka Chakra sits in the middle of the saffron-white-green tricolor."],
  ["AUS", "Union Jack plus large white Commonwealth Star and Southern Cross."],
  ["NZL", "Union Jack plus red Southern Cross stars with white borders."]
]);

const similarGroups = [
  ["ROU", "TCD", "AND", "MDA"],
  ["IDN", "MCO", "POL"],
  ["IRL", "CIV", "ITA"],
  ["AUS", "NZL", "FJI", "TUV"],
  ["SVN", "SVK", "RUS"],
  ["NLD", "LUX", "PRY", "HRV"],
  ["SWE", "FIN", "NOR", "DNK", "ISL"],
  ["GHA", "CMR", "SEN", "MLI", "GIN"],
  ["BHR", "QAT"],
  ["LVA", "AUT"],
  ["HND", "SLV", "NIC", "GTM"],
  ["LIE", "HTI"],
  ["EGY", "IRQ", "SYR", "YEM"],
  ["ARE", "JOR", "KWT", "SDN"],
  ["LBR", "MYS", "USA"],
  ["VEN", "COL", "ECU"]
];

const similarMap = new Map();
for (const group of similarGroups) {
  for (const code of group) {
    similarMap.set(
      code,
      group.filter((other) => other !== code)
    );
  }
}

function currencyNames(currencies = {}) {
  return Object.values(currencies)
    .map((currency) => currency.name)
    .filter(Boolean)
    .join(", ");
}

function languageNames(languages = {}) {
  return Object.values(languages).filter(Boolean).slice(0, 4).join(", ");
}

function formatHint(country) {
  if (specialHints.has(country.cca3)) return specialHints.get(country.cca3);
  const capital = country.capital?.[0] ? ` Its capital is ${country.capital[0]}.` : "";
  const subregion = country.subregion || country.region;
  return `Connect the flag with ${country.name.common} in ${subregion}.${capital}`;
}

function factLines(country) {
  const facts = [];
  if (country.capital?.[0]) facts.push(`Capital: ${country.capital[0]}`);
  if (country.subregion) facts.push(`Region: ${country.subregion}`);
  if (country.population) facts.push(`Population: ${country.population.toLocaleString("en-US")}`);
  if (country.area) facts.push(`Area: ${country.area.toLocaleString("en-US")} km2`);
  const currencies = currencyNames(country.currencies);
  if (currencies) facts.push(`Currency: ${currencies}`);
  const languages = languageNames(country.languages);
  if (languages) facts.push(`Languages: ${languages}`);
  return facts;
}

function entityType(country) {
  if (country.unMember) return "UN member";
  if (observers.has(country.cca3)) return "UN observer";
  if (country.independent) return "Sovereign state";
  return "Territory or dependency";
}

async function downloadFlag(country) {
  const code = country.cca2.toLowerCase();
  const filePath = path.join(FLAG_DIR, `${code}.svg`);
  if (existsSync(filePath)) return `./public/flags/${code}.svg`;

  const flagUrl = country.flags?.svg || `https://flagcdn.com/${code}.svg`;
  const response = await fetch(flagUrl);
  if (!response.ok) throw new Error(`Could not fetch flag for ${country.cca3}: ${response.status}`);
  const svg = await response.text();
  await writeFile(filePath, svg, "utf8");
  return `./public/flags/${code}.svg`;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(FLAG_DIR, { recursive: true });

  const [coreResponse, extraResponse] = await Promise.all([
    fetch(`${REST_BASE}${CORE_FIELDS}`),
    fetch(`${REST_BASE}${EXTRA_FIELDS}`)
  ]);
  if (!coreResponse.ok) throw new Error(`REST Countries core request failed: ${coreResponse.status}`);
  if (!extraResponse.ok) throw new Error(`REST Countries extra request failed: ${extraResponse.status}`);
  const coreCountries = await coreResponse.json();
  const extraCountries = await extraResponse.json();
  const extraByIso = new Map(extraCountries.map((country) => [country.cca3, country]));
  const rawCountries = coreCountries.map((country) => ({ ...country, ...extraByIso.get(country.cca3) }));

  const normalized = [];
  for (const country of rawCountries) {
    if (!country.cca2 || !country.cca3 || !country.name?.common || !country.flags?.svg) continue;
    const flagPath = await downloadFlag(country);
    const latlng = country.latlng?.length === 2 ? country.latlng : country.capitalInfo?.latlng || [0, 0];
    normalized.push({
      iso2: country.cca2,
      iso3: country.cca3,
      nameCommon: country.name.common,
      nameOfficial: country.name.official || country.name.common,
      capital: country.capital?.[0] || "",
      region: country.region || "Other",
      subregion: country.subregion || "",
      continents: country.continents || [],
      population: country.population || 0,
      areaKm2: country.area || 0,
      currency: currencyNames(country.currencies),
      languages: languageNames(country.languages),
      flagSvgPath: flagPath,
      flagAlt: country.flags?.alt || `Flag of ${country.name.common}`,
      flagAspectRatio: "varies",
      mapLat: latlng[0],
      mapLng: latlng[1],
      borders: country.borders || [],
      googleMaps: country.maps?.googleMaps || "",
      openStreetMaps: country.maps?.openStreetMaps || "",
      isUNMember: Boolean(country.unMember),
      isObserver: observers.has(country.cca3),
      entityType: entityType(country),
      defaultScope: Boolean(country.unMember || observers.has(country.cca3)),
      memoryHint: formatHint(country),
      flagFacts: factLines(country),
      symbolism: country.flags?.alt ? [country.flags.alt] : ["Detailed symbolism can be curated for this country."],
      similarFlagIso3: similarMap.get(country.cca3) || [],
      difficulty: similarMap.has(country.cca3) ? "hard" : country.population < 1000000 ? "medium" : "standard"
    });
  }

  normalized.sort((a, b) => a.nameCommon.localeCompare(b.nameCommon));
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "REST Countries v3.1 with local SVG flag assets",
    countries: normalized
  };

  await writeFile(path.join(DATA_DIR, "countries.json"), JSON.stringify(payload, null, 2), "utf8");
  console.log(`Generated ${normalized.length} countries and local flag assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
