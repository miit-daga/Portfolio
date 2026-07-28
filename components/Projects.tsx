"use client"
import { useEffect, useState } from "react"
import { HoverEffect } from "@/components/ui/card-hover-effect"
import Heading from "./Heading"
import { cn } from "@/lib/utils"
import { accentVars, getSection } from "@/constants/sections"
import type { CuratedRepo } from "@/constants/projects"

const SECTION = getSection("projects")

const Projects = () => {
  const [repositories, setRepositories] = useState<CuratedRepo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepositories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/github-repos")
      if (!response.ok) {
        throw new Error("Failed to fetch repositories")
      }
      const data = await response.json()
      setRepositories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching repositories:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  useEffect(() => {
    fetchRepositories()
  }, [])

  // Ordering and exclusions are applied server-side in /api/github-repos from
  // constants/projects.ts, so the terminal's `projects` command shows exactly
  // the same list in the same order.
  const toItem = (repo: CuratedRepo) => ({
    title: repo.name,
    description: repo.description || "Please check the GitHub repository for more details.",
    link: repo.html_url,
    languages: repo.languages,
    homepage: repo.homepage,
    featured: repo.featured,
  })

  const featured = repositories.filter((r) => r.featured).map(toItem)
  const rest = repositories.filter((r) => !r.featured).map(toItem)
  const hasAny = featured.length + rest.length > 0

  return (
    <div className="max-w-5xl mx-auto px-8 py-16" id="projects" style={accentVars(SECTION)}>
      <Heading section="projects" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl h-full w-full p-4 overflow-hidden bg-black/60 border border-white/10 relative z-20",
                "animate-pulse"
              )}
              style={{
                backdropFilter: "blur(120px)",
                WebkitBackdropFilter: "blur(120px)",
              }}
            >
              <div className="relative z-50">
                <div className="p-4">
                  <div className="h-6 w-2/3 bg-neutral-700/50 rounded mb-4"></div>
                  <div className="h-4 w-full bg-neutral-800/50 rounded mb-2"></div>
                  <div className="h-4 w-full bg-neutral-800/50 rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-neutral-800/50 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex justify-center py-10">
          <div
            className="rounded-2xl p-8 overflow-hidden bg-black/60 border border-white/10 relative z-20 max-w-md w-full text-center"
            style={{
              backdropFilter: "blur(120px)",
              WebkitBackdropFilter: "blur(120px)",
            }}
          >
            <div className="text-4xl mb-4">📡</div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">Signal Lost...</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Could not reach the GitHub transmission. {error}
            </p>
            <button
              onClick={fetchRepositories}
              className="px-5 py-2 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-sm font-medium hover:bg-teal-500/30 transition-colors duration-300"
            >
              Retry Transmission
            </button>
          </div>
        </div>
      ) : !hasAny ? (
        <div className="flex justify-center py-10">
          <div
            className="rounded-2xl p-8 overflow-hidden bg-black/60 border border-white/10 relative z-20 max-w-md w-full text-center"
            style={{
              backdropFilter: "blur(120px)",
              WebkitBackdropFilter: "blur(120px)",
            }}
          >
            <div className="text-4xl mb-4">🔭</div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">No Projects Found</h3>
            <p className="text-sm text-zinc-400">
              The void is empty... no repositories detected in this sector.
            </p>
          </div>
        </div>
      ) : (
        <>
          {featured.length > 0 && <HoverEffect items={featured} column={3} groupId="featured" />}

          {rest.length > 0 && (
            <>
              {/* Divider so the curated block reads as a deliberate selection
                  rather than the top of an arbitrary list. */}
              <div className="flex items-center gap-4 pt-4">
                <span
                  className="h-px flex-1"
                  style={{ background: `linear-gradient(90deg, transparent, rgba(${SECTION.rgb.join(",")},0.3))` }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                  also on the shelf
                </span>
                <span
                  className="h-px flex-1"
                  style={{ background: `linear-gradient(270deg, transparent, rgba(${SECTION.rgb.join(",")},0.3))` }}
                />
              </div>
              <HoverEffect items={rest} column={3} groupId="rest" />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Projects
