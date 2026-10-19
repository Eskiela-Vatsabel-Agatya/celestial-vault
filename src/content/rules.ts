// The Rules page renders from this file. To change the wording, edit the text here and commit.
// GENERAL RULES and PENALTIES are the guild's original wording (keep them verbatim).
// TAKING AN ITEM was rewritten for the website and carries a note saying so.
// Section titles are shown in sentence case; the bullet and step text below is verbatim.

export interface RuleSection {
  id: string;
  title: string;
  bullets?: string[];
  steps?: string[];
  text?: string;       // plain paragraph
  aside?: string;      // small paragraph under the list
  note?: string;       // italic note
}

export const RULES_TITLE = "Celestial Guild: vault rules";

export const RULES: RuleSection[] = [
  {
    id: "general",
    title: "General rules",
    bullets: [
      "Always place a PLACEHOLDER when you take an item from the vault.",
      "Return items in the same or better condition than when borrowed.",
      "Do NOT lose custom items — loss requires repayment or replacement.",
      "Fishing rods may be kept for 1–2 days as long as no one else needs them.",
    ],
  },
  {
    id: "penalties",
    title: "Penalties",
    bullets: [
      "Missing placeholder = 10,000 per item per day overdue.",
      "Repeat offenders will be PERMANENTLY BANNED from the vault.",
      "Total loss of any custom item = player report on Chill Server + full repayment.",
    ],
  },
  {
    id: "taking",
    title: "Taking an item",
    steps: [
      "Place a physical placeholder in the vault where the item was.",
      "When you return the item, put it back and remove the placeholder.",
    ],
    aside: "(Item movements are monitored on the server itself, so nothing needs to be logged on this website.)",
    note: "Wording updated for the website. Guild leaders may adjust it.",
  },
  {
    id: "website",
    title: "Changing this website",
    text: "Only trusted editors can add or change items, owners and members. Ask a guild leader if something is missing or wrong.",
  },
];
