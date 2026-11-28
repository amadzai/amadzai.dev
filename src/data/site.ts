const email = "amadzainurin@gmail.com";

export const site = {
  name: "Amad Zai",
  intro: "AI engineer and full stack developer from Kuala Lumpur",
  githubUser: "amadzai",
  email,
  links: {
    github: "https://github.com/amadzai",
    linkedin: "https://www.linkedin.com/in/muhammadzainurin/",
    huggingface: "https://huggingface.co/amadzai",
    instagram: "https://www.instagram.com/amadzai",
    x: "https://x.com/amadzai",
    call: "https://cal.com/amadzai/30min",
  },
} as const;

export const contactLinks = [
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
] as const;

// Year shown in the top bar and footer, taken at build time.
export const buildYear = new Date().getFullYear();
