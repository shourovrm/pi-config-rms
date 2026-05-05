import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { Text } from "@mariozechner/pi-tui";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
	age?: string;
	content?: string;
}

interface StructuredSearchArgs {
	query?: string;
	exactPhrases?: string[];
	excludeTerms?: string[];
	site?: string;
	count?: number;
	freshness?: string;
	country?: string;
	includeContent?: boolean;
}

interface BuiltSearchQuery {
	query: string;
	baseQuery?: string;
	exactPhrases: string[];
	excludeTerms: string[];
	site?: string;
}

async function braveSearch(
	query: string,
	count: number,
	country: string,
	freshness: string | undefined,
	signal?: AbortSignal,
): Promise<SearchResult[]> {
	const apiKey = process.env.BRAVE_API_KEY;
	if (!apiKey) {
		throw new Error(
			"BRAVE_API_KEY environment variable is required. Get your API key at: https://api-dashboard.search.brave.com/app/keys",
		);
	}

	const params = new URLSearchParams({
		q: query,
		count: Math.min(count, 20).toString(),
		country: country,
	});

	if (freshness) {
		params.append("freshness", freshness);
	}

	const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;

	const resp = await fetch(url, {
		headers: {
			Accept: "application/json",
			"Accept-Encoding": "gzip",
			"X-Subscription-Token": apiKey,
		},
		signal,
	});

	if (!resp.ok) {
		const body = await resp.text();
		throw new Error(`Brave API ${resp.status}: ${body.slice(0, 200)}`);
	}

	const data = (await resp.json()) as {
		web?: {
			results?: Array<{
				title: string;
				url: string;
				description?: string;
				age?: string;
				page_age?: string;
			}>;
		};
	};

	if (!data.web?.results || data.web.results.length === 0) return [];

	return data.web.results.slice(0, count).map((result) => ({
		title: result.title || "",
		url: result.url || "",
		snippet: result.description?.replace(/\n/g, " ") ?? "",
		age: result.age || result.page_age || "",
	}));
}

function htmlToMarkdown(html: string): string {
	const turndown = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced",
	});
	turndown.use(gfm);
	turndown.addRule("removeEmptyLinks", {
		filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
		replacement: () => "",
	});
	return turndown
		.turndown(html)
		.replace(/\[\\?\[\s*\\?\]\]\([^)]*\)/g, "")
		.replace(/ +/g, " ")
		.replace(/\s+,/g, ",")
		.replace(/\s+\./g, ".")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function fetchPageContent(url: string): Promise<string> {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			return `(HTTP ${response.status})`;
		}

		const html = await response.text();
		const dom = new JSDOM(html, { url });
		const reader = new Readability(dom.window.document);
		const article = reader.parse();

		if (article && article.content) {
			return htmlToMarkdown(article.content).substring(0, 5000);
		}

		// Fallback: try to get main content
		const fallbackDoc = new JSDOM(html, { url });
		const body = fallbackDoc.window.document;
		body.querySelectorAll(
			"script, style, noscript, nav, header, footer, aside",
		).forEach((el) => el.remove());
		const main =
			body.querySelector("main, article, [role='main'], .content, #content") ||
			body.body;
		const text = main?.textContent || "";

		if (text.trim().length > 100) {
			return text.trim().substring(0, 5000);
		}

		return "(Could not extract content)";
	} catch (e: any) {
		return `(Error: ${e.message})`;
	}
}

function formatResults(results: SearchResult[]): string {
	if (results.length === 0) return "No results found.";
	return results
		.map((r, i) => {
			let output = `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`;
			if (r.age) {
				output += `\n   Age: ${r.age}`;
			}
			if (r.content) {
				output += `\n   Content:\n${r.content}`;
			}
			return output;
		})
		.join("\n\n");
}

function stripWrappingQuotes(value: string): string {
	return value.length >= 2 && value.startsWith('"') && value.endsWith('"')
		? value.slice(1, -1).trim()
		: value;
}

function cleanItems(values?: string[]): string[] {
	if (!values) return [];
	return values
		.map((value) => stripWrappingQuotes(value.trim().replace(/\s+/g, " ")))
		.filter(Boolean);
}

function cleanQuery(value?: string): string | undefined {
	if (typeof value !== "string") return undefined;
	const cleaned = value.trim().replace(/\s+/g, " ");
	return cleaned || undefined;
}

function normalizeSite(site?: string): string | undefined {
	if (typeof site !== "string") return undefined;

	let value = site.trim().replace(/^site:/i, "").trim();
	if (!value) return undefined;

	try {
		const candidate = /^[a-z]+:\/\//i.test(value)
			? value
			: `https://${value}`;
		const url = new URL(candidate);
		if (url.hostname) value = url.hostname;
	} catch {}

	return value.replace(/\/+$/, "") || undefined;
}

function quoteForSearch(value: string): string {
	return `"${value.replace(/"/g, '\\"')}"`;
}

function buildSearchQuery(args: StructuredSearchArgs): BuiltSearchQuery {
	const baseQuery = cleanQuery(args.query);
	const exactPhrases = cleanItems(args.exactPhrases);
	const excludeTerms = cleanItems(args.excludeTerms);
	const site = normalizeSite(args.site);

	if (!baseQuery && exactPhrases.length === 0) {
		throw new Error(
			"At least one of 'query' or 'exactPhrases' is required.",
		);
	}

	const parts: string[] = [];
	if (baseQuery) parts.push(baseQuery);
	for (const phrase of exactPhrases) {
		parts.push(quoteForSearch(phrase));
	}
	for (const term of excludeTerms) {
		parts.push(`-${term.includes(" ") ? quoteForSearch(term) : term}`);
	}
	if (site) {
		parts.push(`site:${site}`);
	}

	return {
		query: parts.join(" "),
		baseQuery,
		exactPhrases,
		excludeTerms,
		site,
	};
}

function normalizeFreshness(value?: string): string | undefined {
	if (!value) return undefined;
	const normalized = value.trim().toLowerCase();
	// Accept standard Brave freshness values
	if (["pd", "pw", "pm", "py"].includes(normalized)) return normalized;
	// Accept date range format YYYY-MM-DDtoYYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2}$/.test(normalized))
		return normalized;
	return undefined;
}

function normalizeCountry(value?: string): string {
	if (!value) return "US";
	return value.trim().toUpperCase().slice(0, 2);
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web via Brave Search API. Build one search per call from a base query string, exact phrases, exclusions, and an optional site. Returns title, URL, snippet, and optionally page content as markdown.",
		promptSnippet:
			"Search the web via a query string plus optional exactPhrases, excludeTerms, site, freshness, and country. Use one tool call per search angle.",
		promptGuidelines: [
			"Use web_search with exactPhrases for exact phrase matching instead of embedding quote marks inside the main query string.",
			"Use one web_search tool call per search angle instead of batching multiple searches into one call.",
			"Use web_search with freshness to filter results by time period (pd=day, pw=week, pm=month, py=year).",
			"Use web_search with includeContent=true to fetch page content as markdown when snippets are insufficient.",
		],

		parameters: Type.Object({
			query: Type.Optional(
				Type.String({
					description:
						"Base search query as a normal string. Prefer this for the main search wording.",
				}),
			),
			exactPhrases: Type.Optional(
				Type.Array(Type.String(), {
					description:
						"Exact phrases to match. Each item becomes a quoted phrase in the final search query.",
				}),
			),
			excludeTerms: Type.Optional(
				Type.Array(Type.String(), {
					description:
						"Terms or phrases to exclude. Multi-word items are excluded as exact phrases.",
				}),
			),
			site: Type.Optional(
				Type.String({
					description:
						"Optional site/domain restriction, such as example.com or a full URL.",
				}),
			),
			count: Type.Optional(
				Type.Number({
					description: "Number of results to return (default: 5, max: 20)",
					minimum: 1,
					maximum: 20,
				}),
			),
			freshness: Type.Optional(
				Type.String({
					description:
						"Filter by time period: pd (past day), pw (past week), pm (past month), py (past year), or date range YYYY-MM-DDtoYYYY-MM-DD.",
				}),
			),
			country: Type.Optional(
				Type.String({
					description:
						"Two-letter country code for localized results (default: US).",
				}),
			),
			includeContent: Type.Optional(
				Type.Boolean({
					description:
						"If true, fetch and include page content as markdown for each result. Useful when snippets are insufficient.",
				}),
			),
		}),

		async execute(_toolCallId, params: StructuredSearchArgs, signal) {
			const count = params.count ?? 5;
			const country = normalizeCountry(params.country);
			const freshness = normalizeFreshness(params.freshness);
			const built = buildSearchQuery(params);

			const results = await braveSearch(
				built.query,
				count,
				country,
				freshness,
				signal,
			);

			// Optionally fetch page content
			if (params.includeContent && results.length > 0) {
				for (const result of results) {
					result.content = await fetchPageContent(result.url);
				}
			}

			return {
				content: [
					{
						type: "text" as const,
						text: formatResults(results),
					},
				],
				details: {
					composedQuery: built.query,
					query: built.baseQuery,
					exactPhrases: built.exactPhrases,
					excludeTerms: built.excludeTerms,
					site: built.site,
					count,
					country,
					freshness,
					includeContent: params.includeContent ?? false,
					resultCount: results.length,
				},
			};
		},

		renderCall(args, theme, context) {
			const text =
				(context.lastComponent as Text | undefined) ??
				new Text("", 0, 0);
			const { count, freshness, country, includeContent, ...searchArgs } =
				args as StructuredSearchArgs;

			try {
				const built = buildSearchQuery(searchArgs);
				const display =
					built.query.length > 70
						? built.query.slice(0, 67) + "..."
						: built.query;
				const lines = [
					theme.fg("toolTitle", theme.bold("search ")) +
						theme.fg("accent", `"${display}"`),
				];
				const meta: string[] = [];
				if (count && count !== 5) meta.push(`count: ${count}`);
				if (freshness) meta.push(`freshness: ${freshness}`);
				if (country && country !== "US") meta.push(`country: ${country}`);
				if (includeContent) meta.push("content: on");
				if (meta.length > 0) {
					lines.push(theme.fg("dim", `  ${meta.join(" · ")}`));
				}
				text.setText(lines.join("\n"));
				return text;
			} catch {
				text.setText(
					theme.fg("toolTitle", theme.bold("search ")) +
						theme.fg("error", "(invalid query)"),
				);
				return text;
			}
		},

		renderResult(result, { expanded, isPartial }, theme, context) {
			const text =
				(context.lastComponent as Text | undefined) ??
				new Text("", 0, 0);

			if (isPartial) {
				text.setText(theme.fg("warning", "Searching…"));
				return text;
			}

			if (context.isError) {
				const msg =
					result.content.find((c) => c.type === "text")?.text ||
					"Error";
				text.setText(theme.fg("error", msg));
				return text;
			}

			const details = result.details as {
				composedQuery?: string;
				resultCount?: number;
				includeContent?: boolean;
			};
			const status = theme.fg(
				"success",
				`${details?.resultCount ?? 0} results`,
			);
			if (!expanded) {
				text.setText(status);
				return text;
			}

			const content =
				result.content.find((c) => c.type === "text")?.text || "";
			const preview =
				content.length > 500 ? content.slice(0, 500) + "..." : content;
			const queryLine = details?.composedQuery
				? theme.fg("dim", `query: ${details.composedQuery}`)
				: "";
			const contentIndicator = details?.includeContent
				? theme.fg("muted", " (with page content)")
				: "";
			text.setText(
				[status + contentIndicator, queryLine, theme.fg("dim", preview)]
					.filter(Boolean)
					.join("\n"),
			);
			return text;
		},
	});

	// Standalone page content extraction tool
	const MAX_CONTENT_LENGTH = 10000;

	pi.registerTool({
		name: "fetch_page_content",
		label: "Fetch Page",
		description:
			"Fetch a URL and extract its readable content as markdown. Uses Readability for article extraction with fallback to main content area.",
		promptSnippet:
			"Fetch a URL and extract readable content as markdown",
		promptGuidelines: [
			"Use fetch_page_content to extract readable content from a specific URL as markdown.",
			"Use fetch_page_content when you need to read the full content of a page that web_search only returned a snippet for.",
		],

		parameters: Type.Object({
			url: Type.String({
				description: "The URL to fetch and extract content from.",
			}),
			maxLength: Type.Optional(
				Type.Number({
					description: `Maximum content length in characters (default: ${MAX_CONTENT_LENGTH}).`,
					minimum: 1000,
					maximum: 50000,
				}),
			),
		}),

		async execute(_toolCallId, params: { url: string; maxLength?: number }, signal) {
			const maxLen = params.maxLength ?? MAX_CONTENT_LENGTH;

			try {
				const response = await fetch(params.url, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
						Accept:
							"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
						"Accept-Language": "en-US,en;q=0.9",
					},
					signal,
				});

				if (!response.ok) {
					return {
						content: [
							{
								type: "text" as const,
								text: `Error: HTTP ${response.status} ${response.statusText}`,
							},
						],
						isError: true,
					};
				}

				const html = await response.text();
				const dom = new JSDOM(html, { url: params.url });
				const reader = new Readability(dom.window.document);
				const article = reader.parse();

				let markdown: string;
				let title: string | undefined;

				if (article && article.content) {
					title = article.title;
					markdown = htmlToMarkdown(article.content);
				} else {
					// Fallback: extract main content area
					const fallbackDoc = new JSDOM(html, { url: params.url });
					const body = fallbackDoc.window.document;
					body.querySelectorAll(
						"script, style, noscript, nav, header, footer, aside",
					).forEach((el) => el.remove());
					title =
						body.querySelector("title")?.textContent?.trim() ||
						undefined;
					const main =
						body.querySelector(
							"main, article, [role='main'], .content, #content",
						) || body.body;
					const rawHtml = main?.innerHTML || "";
					if (rawHtml.trim().length > 100) {
						markdown = htmlToMarkdown(rawHtml);
					} else {
						return {
							content: [
								{
									type: "text" as const,
									text: "Could not extract readable content from this page.",
								},
							],
							isError: true,
						};
					}
				}

				if (markdown.length > maxLen) {
					markdown = markdown.substring(0, maxLen) + "\n\n(Content truncated)";
				}

				const output = title ? `# ${title}\n\n${markdown}` : markdown;

				return {
					content: [{ type: "text" as const, text: output }],
					details: {
						url: params.url,
						title: title || null,
						contentLength: markdown.length,
						truncated: markdown.length >= maxLen,
					},
				};
			} catch (e: any) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error fetching page: ${e.message}`,
						},
					],
					isError: true,
				};
			}
		},

		renderCall(args, theme, context) {
			const text =
				(context.lastComponent as Text | undefined) ??
				new Text("", 0, 0);
			const { url, maxLength } = args as { url: string; maxLength?: number };
			const display =
				url.length > 60 ? url.slice(0, 57) + "..." : url;
			let line =
				theme.fg("toolTitle", theme.bold("fetch ")) +
				theme.fg("accent", display);
			if (maxLength) {
				line += theme.fg("dim", ` (max: ${maxLength})`);
			}
			text.setText(line);
			return text;
		},

		renderResult(result, { isPartial }, theme, context) {
			const text =
				(context.lastComponent as Text | undefined) ??
				new Text("", 0, 0);

			if (isPartial) {
				text.setText(theme.fg("warning", "Fetching…"));
				return text;
			}

			if (context.isError) {
				const msg =
					result.content.find((c) => c.type === "text")?.text ||
					"Error";
				text.setText(theme.fg("error", msg));
				return text;
			}

			const details = result.details as {
				title?: string | null;
				contentLength?: number;
				truncated?: boolean;
			};
			const title = details?.title
				? theme.fg("accent", details.title)
				: theme.fg("muted", "(no title)");
			const size = theme.fg(
				"dim",
				`${details?.contentLength ?? 0} chars${details?.truncated ? ", truncated" : ""}`,
			);
			text.setText(
				theme.fg("success", "✓ ") + title + " " + size,
			);
			return text;
		},
	});
}
