"use client"
import { useEffect, useState } from "react"
import { HoverEffect } from "@/components/ui/card-hover-effect"
import Heading from "./Heading"
import { cn } from "@/lib/utils"

const Projects = () => {
  const [repositories, setRepositories] = useState<any[]>([])
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
      setRepositories(data)
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

  const transformedProjects = repositories
    .filter((repo) => repo.html_url !== "https://github.com/miit-daga")
    .map((repo) => ({
      title: repo.name,
      description: repo.description || "Please check the GitHub repository for more details.",
      link: repo.html_url,
      languages: repo.languages as Record<string, number> | undefined,
    }))

  return (
    <div className="max-w-5xl mx-auto px-8 py-16" id="projects">
      <Heading text="Projects" />

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
      ) : transformedProjects.length === 0 ? (
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
        <HoverEffect items={transformedProjects} column={3} />
      )}
    </div>
  )
}

export default Projects