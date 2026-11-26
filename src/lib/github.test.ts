import { describe, expect, test } from "vitest";
import { githubActivity } from "./github";

interface FakeCommit {
  headline: string;
  date: string;
  author?: string | null;
  additions?: number;
  deletions?: number;
}

interface FakeRepo {
  name: string;
  commits: FakeCommit[];
  isFork?: boolean;
  isPrivate?: boolean;
  empty?: boolean;
}

// One canned GraphQL response, shaped like GitHub's, from a short list of repos.
const github = (repos: FakeRepo[]) => ({
  data: {
    user: {
      repositories: {
        nodes: repos.map(
          ({ name, commits, isFork = false, isPrivate = false, empty }) => ({
            name,
            isFork,
            isPrivate,
            defaultBranchRef: empty
              ? null
              : {
                  target: {
                    history: {
                      nodes: commits.map(
                        ({
                          headline,
                          date,
                          author = "amadzai",
                          additions = 1,
                          deletions = 0,
                        }) => ({
                          messageHeadline: headline,
                          committedDate: date,
                          additions,
                          deletions,
                          url: `https://github.com/amadzai/${name}/commit/${headline}`,
                          author: { user: author ? { login: author } : null },
                        }),
                      ),
                    },
                  },
                },
          }),
        ),
      },
    },
  },
});

const reply =
  (body: unknown, status = 200): typeof fetch =>
  async () =>
    new Response(JSON.stringify(body), { status });

const colours = { "think-fast-jev": "yellow", bytesize: "red" } as const;

describe("Recent commits", () => {
  test("keeps the five newest commits across repos, newest first, with their diff counts and links", async () => {
    const fetch = reply(
      github([
        {
          name: "bytesize",
          commits: [
            {
              headline: "b3",
              date: "2026-11-20T00:00:00Z",
              additions: 12,
              deletions: 4,
            },
            { headline: "b2", date: "2026-11-10T00:00:00Z" },
            { headline: "b1", date: "2026-11-01T00:00:00Z" },
          ],
        },
        {
          name: "think-fast-jev",
          commits: [
            {
              headline: "t3",
              date: "2026-11-25T00:00:00Z",
              additions: 300,
              deletions: 0,
            },
            { headline: "t2", date: "2026-11-15T00:00:00Z" },
            { headline: "t1", date: "2026-11-05T00:00:00Z" },
          ],
        },
      ]),
    );

    const { recentCommits } = await githubActivity("amadzai", fetch, colours);

    expect(recentCommits.map(({ headline }) => headline)).toEqual([
      "t3",
      "b3",
      "t2",
      "b2",
      "t1",
    ]);
    expect(recentCommits[0]).toEqual({
      repo: "think-fast-jev",
      headline: "t3",
      additions: 300,
      deletions: 0,
      url: "https://github.com/amadzai/think-fast-jev/commit/t3",
      colour: "yellow",
    });
    expect(recentCommits[1]).toMatchObject({
      repo: "bytesize",
      additions: 12,
      deletions: 4,
    });
  });

  test("skips forks and private repos", async () => {
    const fetch = reply(
      github([
        {
          name: "a-fork",
          isFork: true,
          commits: [{ headline: "fork", date: "2026-11-25T00:00:00Z" }],
        },
        {
          name: "secret",
          isPrivate: true,
          commits: [{ headline: "private", date: "2026-11-24T00:00:00Z" }],
        },
        {
          name: "bytesize",
          commits: [{ headline: "public", date: "2026-11-01T00:00:00Z" }],
        },
      ]),
    );

    const { recentCommits } = await githubActivity("amadzai", fetch, colours);

    expect(recentCommits.map(({ headline }) => headline)).toEqual(["public"]);
  });

  test("keeps only Amad's own commits, and skips a repo with no commits yet", async () => {
    const fetch = reply(
      github([
        {
          name: "bytesize",
          commits: [
            {
              headline: "bot",
              date: "2026-11-25T00:00:00Z",
              author: "dependabot",
            },
            {
              headline: "unlinked email",
              date: "2026-11-24T00:00:00Z",
              author: null,
            },
            { headline: "mine", date: "2026-11-01T00:00:00Z" },
          ],
        },
        { name: "new-repo", empty: true, commits: [] },
      ]),
    );

    const { recentCommits } = await githubActivity("amadzai", fetch, colours);

    expect(recentCommits.map(({ headline }) => headline)).toEqual(["mine"]);
  });

  test("colours a Project's commits with its card colour", async () => {
    const fetch = reply(
      github([
        {
          name: "bytesize",
          commits: [{ headline: "b", date: "2026-11-02T00:00:00Z" }],
        },
        {
          name: "wedding",
          commits: [{ headline: "w", date: "2026-11-01T00:00:00Z" }],
        },
      ]),
    );

    const { recentCommits } = await githubActivity("amadzai", fetch, {
      ...colours,
      wedding: "ink",
    });

    expect(recentCommits.map(({ colour }) => colour)).toEqual(["red", "ink"]);
  });

  test("gives every other repo red, blue or yellow, the same one whatever else is in the list", async () => {
    const names = [
      "amadzai.dev",
      "pika-bot",
      "querying-dex-data",
      "swap-price-resolver",
    ];
    const colourOf = async (repos: FakeRepo[]) => {
      const { recentCommits } = await githubActivity(
        "amadzai",
        reply(github(repos)),
        colours,
      );
      return Object.fromEntries(
        recentCommits.map(({ repo, colour }) => [repo, colour]),
      );
    };
    const commit = (date: string) => [{ headline: "x", date }];

    const forward = await colourOf(
      names.map((name, i) => ({
        name,
        commits: commit(`2026-11-0${i + 1}T00:00:00Z`),
      })),
    );
    const reversed = await colourOf(
      names.toReversed().map((name, i) => ({
        name,
        commits: commit(`2026-11-0${i + 1}T00:00:00Z`),
      })),
    );
    const alone = await colourOf([
      { name: "pika-bot", commits: commit("2026-11-01T00:00:00Z") },
    ]);

    for (const name of names)
      expect(["red", "blue", "yellow"]).toContain(forward[name]);
    expect(reversed).toEqual(forward);
    expect(alone["pika-bot"]).toBe(forward["pika-bot"]);
    // The rotation spreads repos over the colours rather than giving them all one.
    expect(new Set(Object.values(forward)).size).toBeGreaterThan(1);
  });

  // Each error fails the build, so the live site keeps its last good version.
  test.each([
    ["an HTTP error", reply({ message: "Bad credentials" }, 401), /401/],
    [
      "a GraphQL error",
      reply({ data: null, errors: [{ message: "Something went wrong" }] }),
      /Something went wrong/,
    ],
    ["an unknown user", reply({ data: { user: null } }), /amadzai/],
    [
      "a response in an unexpected shape",
      reply({ data: { user: { repositories: { nodes: [{ name: 42 }] } } } }),
      /unexpected/,
    ],
    [
      "a network failure",
      (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch,
      /fetch failed/,
    ],
  ])("throws on %s", async (_, fetch, message) => {
    await expect(githubActivity("amadzai", fetch, colours)).rejects.toThrow(
      message,
    );
  });
});
