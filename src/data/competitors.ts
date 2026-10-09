export type CompetitorChannel = {
  label: "Facebook" | "Instagram" | "LinkedIn" | "YouTube";
  audience: string;
  note?: string;
};

export type CompetitorProfile = {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  logoFallback: string;
  website: string;
  footprint: string;
  channels: CompetitorChannel[];
  focus: string[];
  position: string;
};

export const COMPETITOR_VERIFIED_AT = "9 Oct 2026";

export const competitors: CompetitorProfile[] = [
  {
    id: "alameda",
    name: "Alameda Healthcare",
    shortName: "Alameda",
    logoUrl: "https://images.wuzzuf-data.net/files/company_logo/Alameda-Egypt-6774-1758526772-og.png",
    logoFallback: "A",
    website: "https://alameda-hc.com/",
    footprint: "4 hospitals · 1,023 beds · 128 clinics",
    channels: [
      { label: "Instagram", audience: "26K" },
      { label: "LinkedIn", audience: "32.4K" },
    ],
    focus: ["Patient stories", "Centers of Excellence", "Medical conferences"],
    position: "Competes through a group ecosystem led by Dar Al Fouad and As-Salam, not one account alone.",
  },
  {
    id: "saudi-german",
    name: "Saudi German Health Egypt",
    shortName: "Saudi German",
    logoUrl: "https://gicoxnuusgterhsyifcx.supabase.co/storage/v1/object/public/images/1755721952469_Bilingual_Logo_with_slogan.png",
    logoFallback: "SGH",
    website: "https://sgheg.com/",
    footprint: "Cairo + Alexandria · regional healthcare brand",
    channels: [
      { label: "Facebook", audience: "≈766K", note: "Indexed snapshot" },
      { label: "LinkedIn", audience: "125.9K" },
      { label: "YouTube", audience: "6.1K", note: "Indexed snapshot" },
    ],
    focus: ["Reels", "Community campaigns", "Visiting experts"],
    position: "Largest visible consumer audience in this set, supported by a strong regional brand.",
  },
  {
    id: "cleopatra",
    name: "Cleopatra Hospitals Group",
    shortName: "Cleopatra",
    logoUrl: "https://cdn.localized.world/organizations/181/8bee0ffc-bcdb-47e7-8855-e150b6556815.png",
    logoFallback: "CHG",
    website: "https://www.cleopatrahospitals.com/en/",
    footprint: "782+ beds · 4,600+ medical staff · multi-hospital network",
    channels: [
      { label: "Facebook", audience: "≈520K", note: "Indexed snapshot" },
      { label: "Instagram", audience: "27.7K" },
      { label: "LinkedIn", audience: "145.3K" },
      { label: "YouTube", audience: "5.6K", note: "Indexed snapshot" },
    ],
    focus: ["Clinical breakthroughs", "Expansion", "Medical tourism"],
    position: "Strongest corporate communication and the clearest public expansion story.",
  },
  {
    id: "andalusia",
    name: "Andalusia Health Egypt",
    shortName: "Andalusia",
    logoUrl: "https://images.alborsaanews.com/2016/07/PZUMOwhs-1468329684_762_86406_.png",
    logoFallback: "AH",
    website: "https://andalusiaegypt.com/",
    footprint: "4 current Egypt branches · October expansion underway",
    channels: [
      { label: "Instagram", audience: "50K" },
      { label: "LinkedIn", audience: "148.8K", note: "Regional page" },
    ],
    focus: ["Offers & services", "Medical SEO", "Smart healthcare"],
    position: "Broad content ecosystem across Egypt, regional, people, tourism and conference accounts.",
  },
  {
    id: "newgiza",
    name: "Newgiza University Hospital",
    shortName: "Newgiza",
    logoUrl: "https://www.google.com/s2/favicons?domain=nguhospital.com&sz=128",
    logoFallback: "NGUH",
    website: "https://nguhospital.com/",
    footprint: "138 beds · 17 clinics · 7 operating rooms",
    channels: [
      { label: "Facebook", audience: "≈25.5K", note: "Indexed snapshot" },
      { label: "LinkedIn", audience: "7K" },
    ],
    focus: ["Innovation", "Medical education", "Clinical stories"],
    position: "A newer premium competitor using university, research and innovation positioning.",
  },
];
