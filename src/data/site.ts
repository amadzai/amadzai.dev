const email = "amadzainurin@gmail.com";

export const site = {
  name: "Amad Zai",
  domain: "amadzai.dev",
  intro: "AI engineer and full stack developer from Kuala Lumpur",
  githubUser: "amadzai",
  email,
  links: {
    email: `mailto:${email}`,
    github: "https://github.com/amadzai",
    linkedin: "https://www.linkedin.com/in/muhammadzainurin/",
    // Opens straight to the 30-minute event.
    call: "https://cal.com/amadzai/30min?overlayCalendar=true",
  },
} as const;

export const contactLinks = [
  { label: "Email", href: site.links.email },
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
] as const;

// Year shown in the top bar and footer, taken at build time.
export const buildYear = new Date().getFullYear();
