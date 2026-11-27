// Builds Recent commits and the Language breakdown from Amad's public GitHub repos, at build time, in one GraphQL request.
import { z } from "astro/zod";
import type { CollectionEntry } from "astro:content";

// A commit marker takes a Project's card colour, so the two share one list of colours.
export type MarkerColour = CollectionEntry<"projects">["data"]["corner"];

export interface Commit {
  repo: string;
  headline: string;
  additions: number;
  deletions: number;
  url: string;
  colour: MarkerColour;
}

export interface Language {
  name: string;
  // Percent to one decimal; a breakdown's percents sum to 100.
  percent: number;
}

export interface GithubActivity {
  recentCommits: Commit[];
  languageBreakdown: Language[];
}

const RECENT_COMMITS = 5;
// shortcut: only the newest commits of the most recently pushed repos are read; widen if bot commits ever crowd Amad's out.
// The Language breakdown reads the same repos, so it covers all of Amad's public repos only while he has 20 or fewer.
const REPOS_READ = 20;
const COMMITS_READ_PER_REPO = 20;
// Shares are counted in tenths of a percent, so they show to one decimal.
const TENTHS = 1000;
// GitHub's most per page; no repo has more languages than this.
const LANGUAGES_READ_PER_REPO = 100;

// Most recently pushed repos first, so a small window still holds the newest commits.
const QUERY = `query ($login: String!) {
  user(login: $login) {
    repositories(first: ${REPOS_READ}, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name
        isFork
        isPrivate
        languages(first: ${LANGUAGES_READ_PER_REPO}) { edges { size node { name } } }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: ${COMMITS_READ_PER_REPO}) {
                nodes { message committedDate additions deletions url author { user { login } } }
              }
            }
          }
        }
      }
    }
  }
}`;

// Bytes of code per language in one repo.
const LANGUAGES = z.object({
  edges: z.array(
    z.object({
      size: z.number().int().nonnegative(),
      node: z.object({ name: z.string() }),
    }),
  ),
});

// GitHub's reply is outside data, so it is checked before use. GraphQL reports query errors with a 200, in errors.
const RESPONSE = z.object({
  errors: z.array(z.object({ message: z.string() })).optional(),
  data: z
    .object({
      user: z
        .object({
          repositories: z.object({
            nodes: z.array(
              z.object({
                name: z.string(),
                isFork: z.boolean(),
                isPrivate: z.boolean(),
                languages: LANGUAGES,
                // An empty repo has no default branch yet.
                defaultBranchRef: z
                  .object({
                    target: z.object({
                      history: z.object({
                        nodes: z.array(
                          z.object({
                            message: z.string(),
                            committedDate: z.iso.datetime(),
                            additions: z.number().int().nonnegative(),
                            deletions: z.number().int().nonnegative(),
                            url: z.url(),
                            // No user when the commit's email isn't linked to an account.
                            author: z.object({
                              user: z.object({ login: z.string() }).nullable(),
                            }),
                          }),
                        ),
                      }),
                    }),
                  })
                  .nullable(),
              }),
            ),
          }),
        })
        .nullable(),
    })
    .nullable()
    .optional(),
});

// Ink comes last: it is the plainest marker and has no hover tint.
const PALETTE: readonly MarkerColour[] = ["red", "blue", "yellow", "ink"];

// Gives every repo in the list its own colour. A Project keeps its card colour; any other repo takes the
// first colour no other repo uses. With more repos than colours, it takes one its neighbouring rows don't use.
function markerColours(
  rows: readonly string[],
  projectColours: Readonly<Record<string, MarkerColour>>,
): ReadonlyMap<string, MarkerColour> {
  const colours = new Map(
    rows
      .filter((repo) => Object.hasOwn(projectColours, repo))
      .map((repo) => [repo, projectColours[repo]]),
  );
  for (const repo of new Set(rows)) {
    if (colours.has(repo)) continue;
    const taken = new Set(colours.values());
    const besideIt = new Set(
      rows.flatMap((row, i) =>
        row === repo
          ? [rows[i - 1], rows[i + 1]].map((next) => next && colours.get(next))
          : [],
      ),
    );
    colours.set(
      repo,
      PALETTE.find((colour) => !taken.has(colour)) ??
        PALETTE.find((colour) => !besideIt.has(colour)) ??
        PALETTE[0],
    );
  }
  return colours;
}

const sum = (numbers: readonly number[]) =>
  numbers.reduce((total, n) => total + n, 0);

// Sums each language's bytes across the repos into its share of the whole, biggest first.
function languageBreakdown(
  repos: readonly { languages: z.infer<typeof LANGUAGES> }[],
): Language[] {
  const edges = repos.flatMap(({ languages }) => languages.edges);
  const byLanguage = [...Map.groupBy(edges, ({ node }) => node.name)]
    .map(([name, group]) => ({
      name,
      bytes: sum(group.map(({ size }) => size)),
    }))
    .toSorted((a, b) => b.bytes - a.bytes);
  const total = sum(byLanguage.map(({ bytes }) => bytes));
  if (total === 0) return [];

  // Largest remainder: round each share down, then give the tenths left over to the biggest remainders.
  const exact = byLanguage.map(({ bytes }) => (bytes * TENTHS) / total);
  const floors = exact.map(Math.floor);
  const roundedUp = new Set(
    exact
      .map((share, i) => ({ i, remainder: share - floors[i] }))
      .toSorted((a, b) => b.remainder - a.remainder)
      .slice(0, TENTHS - sum(floors))
      .map(({ i }) => i),
  );
  return (
    byLanguage
      .map(({ name }, i) => ({
        name,
        percent: (floors[i] + (roundedUp.has(i) ? 1 : 0)) / 10,
      }))
      // A sliver that rounds to 0% would be an invisible segment.
      .filter(({ percent }) => percent > 0)
  );
}

/**
 * @param fetch Sends the request; the caller adds the token, so it never reaches this module or the page.
 * @param projectColours Card colour of each repo that has a Project card, keyed by repo name.
 */
export async function githubActivity(
  username: string,
  fetch: typeof globalThis.fetch,
  projectColours: Readonly<Record<string, MarkerColour>>,
): Promise<GithubActivity> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: username } }),
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API returned ${response.status}: ${await response.text()}`,
    );
  }
  const parsed = RESPONSE.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `GitHub API returned an unexpected response: ${z.prettifyError(parsed.error)}`,
    );
  }
  const { data, errors } = parsed.data;
  if (errors?.length) {
    throw new Error(
      `GitHub API errors: ${errors.map(({ message }) => message).join("; ")}`,
    );
  }
  if (!data?.user) {
    throw new Error(`GitHub has no user named ${username}`);
  }
  const repos = data.user.repositories.nodes
    // The query already asks for these, but the rule is ours to keep, not the API's.
    .filter(({ isFork, isPrivate }) => !isFork && !isPrivate);

  const newest = repos
    .flatMap((repo) =>
      (repo.defaultBranchRef?.target.history.nodes ?? [])
        // A commit with no linked user can't be shown as Amad's.
        .filter(({ author }) => author.user?.login === username)
        .map((commit) => ({ repo, commit })),
    )
    .toSorted((a, b) =>
      b.commit.committedDate.localeCompare(a.commit.committedDate),
    )
    .slice(0, RECENT_COMMITS);

  const colours = markerColours(
    newest.map(({ repo }) => repo.name),
    projectColours,
  );
  const recentCommits = newest.map(({ repo, commit }) => ({
    repo: repo.name,
    // GitHub's own messageHeadline is cut short near 70 characters, so take the message's first line whole.
    headline: commit.message.split(/\r?\n/, 1)[0],
    additions: commit.additions,
    deletions: commit.deletions,
    url: commit.url,
    colour: colours.get(repo.name)!,
  }));

  return { recentCommits, languageBreakdown: languageBreakdown(repos) };
}
