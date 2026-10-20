export interface OpenAlexAuthor {
  id: string;
  displayName: string;
  orcid?: string;
  worksCount: number;
  citedByCount: number;
  lastKnownInstitution?: {
    id: string;
    displayName: string;
    countryCode: string;
    type: string;
    ror?: string;
  };
  topics: {
    id: string;
    displayName: string;
    subfield: string;
    field: string;
    score: number;
  }[];
}

export interface OpenAlexWork {
  id: string;
  title: string;
  publicationYear: number;
  doi?: string;
  primaryLocation?: {
    sourceName?: string;
    landingPageUrl?: string;
    isOa: boolean;
  };
  abstract?: string;
  citedByCount: number;
  concepts: { displayName: string; score: number }[];
}

interface RawInstitution {
  id: string;
  display_name: string;
  country_code: string;
  type: string;
  ror?: string;
}

interface RawTopic {
  id: string;
  display_name: string;
  subfield?: { display_name?: string };
  field?: { display_name?: string };
  score?: number;
}

interface RawAuthor {
  id: string;
  display_name: string;
  orcid?: string;
  works_count: number;
  cited_by_count: number;
  last_known_institutions?: RawInstitution[];
  topics?: RawTopic[];
}

interface RawConcept {
  display_name: string;
  score: number;
}

interface RawWork {
  id: string;
  title?: string;
  publication_year: number;
  doi?: string;
  primary_location?: {
    source?: { display_name?: string };
    landing_page_url?: string;
    is_oa?: boolean;
  };
  abstract_inverted_index?: Record<string, number[]>;
  cited_by_count?: number;
  concepts?: RawConcept[];
}

export class OpenAlexService {
  private static baseUrl = "https://api.openalex.org";

  /**
   * Search for an author by name and optional institution
   */
  public static async searchAuthor(name: string, institutionName?: string): Promise<OpenAlexAuthor | null> {
    try {
      const query = `${this.baseUrl}/authors?search=${encodeURIComponent(name)}`;
      const res = await fetch(query, {
        headers: { "User-Agent": "ProfOutreachAgent/1.0 (academic-research-assistant)" },
      });
      if (!res.ok) return null;

      const data = await res.json();
      const results: RawAuthor[] = data.results || [];
      if (results.length === 0) return null;

      // If institution provided, try to match
      if (institutionName) {
        const lowerInst = institutionName.toLowerCase();
        const matched = results.find((a) =>
          a.last_known_institutions?.some((inst) =>
            inst.display_name?.toLowerCase().includes(lowerInst)
          )
        );
        if (matched) return this.formatAuthor(matched);
      }

      return this.formatAuthor(results[0]);
    } catch (err) {
      console.warn(`[OpenAlex] Author lookup failed for ${name}:`, err);
      return null;
    }
  }

  /**
   * Fetch recent publications (2023–2026) for an author
   */
  public static async getRecentWorks(authorId: string, limit: number = 5): Promise<OpenAlexWork[]> {
    try {
      const cleanId = authorId.replace("https://openalex.org/", "");
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 3; // past 3 years

      const url = `${this.baseUrl}/works?filter=author.id:${cleanId},publication_year:>${minYear}&sort=publication_year:desc,cited_by_count:desc&per-page=${limit}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "ProfOutreachAgent/1.0 (academic-research-assistant)" },
      });
      if (!res.ok) return [];

      const data = await res.json();
      const results: RawWork[] = data.results || [];
      return results.map((w) => this.formatWork(w));
    } catch (err) {
      console.warn(`[OpenAlex] Works fetch failed for ${authorId}:`, err);
      return [];
    }
  }

  /**
   * Search for active professors in a specific country and research topic
   */
  public static async discoverProfessorsByTopicAndCountry(
    topicQuery: string,
    countryCode: string, // e.g. "CA", "DE", "US", "KR", "SE"
    limit: number = 10
  ): Promise<OpenAlexAuthor[]> {
    try {
      const url = `${this.baseUrl}/authors?filter=last_known_institutions.country_code:${countryCode}&search=${encodeURIComponent(
        topicQuery
      )}&sort=works_count:desc&per-page=${limit}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "ProfOutreachAgent/1.0 (academic-research-assistant)" },
      });
      if (!res.ok) return [];

      const data = await res.json();
      const results: RawAuthor[] = data.results || [];
      return results.map((a) => this.formatAuthor(a));
    } catch (err) {
      console.warn(`[OpenAlex] Topic search failed:`, err);
      return [];
    }
  }

  private static formatAuthor(raw: RawAuthor): OpenAlexAuthor {
    const institution = raw.last_known_institutions?.[0];
    return {
      id: raw.id,
      displayName: raw.display_name,
      orcid: raw.orcid,
      worksCount: raw.works_count,
      citedByCount: raw.cited_by_count,
      lastKnownInstitution: institution
        ? {
            id: institution.id,
            displayName: institution.display_name,
            countryCode: institution.country_code,
            type: institution.type,
            ror: institution.ror,
          }
        : undefined,
      topics: (raw.topics || []).slice(0, 5).map((t) => ({
        id: t.id,
        displayName: t.display_name,
        subfield: t.subfield?.display_name || "",
        field: t.field?.display_name || "",
        score: t.score || 0,
      })),
    };
  }

  private static formatWork(raw: RawWork): OpenAlexWork {
    // Reconstruct abstract from inverted index if present
    let abstract = "";
    if (raw.abstract_inverted_index) {
      const words: { word: string; pos: number }[] = [];
      for (const [word, positions] of Object.entries(raw.abstract_inverted_index)) {
        for (const pos of positions) {
          words.push({ word, pos });
        }
      }
      words.sort((a, b) => a.pos - b.pos);
      abstract = words.map((w) => w.word).join(" ");
    }

    return {
      id: raw.id,
      title: raw.title || "Untitled Paper",
      publicationYear: raw.publication_year,
      doi: raw.doi,
      primaryLocation: {
        sourceName: raw.primary_location?.source?.display_name,
        landingPageUrl: raw.primary_location?.landing_page_url,
        isOa: raw.primary_location?.is_oa || false,
      },
      abstract: abstract.slice(0, 1000),
      citedByCount: raw.cited_by_count || 0,
      concepts: (raw.concepts || []).slice(0, 5).map((c) => ({
        displayName: c.display_name,
        score: c.score,
      })),
    };
  }
}
