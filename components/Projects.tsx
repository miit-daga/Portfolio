"use client"
import { useEffect, useState } from "react"
import { HoverEffect } from "@/components/ui/card-hover-effect"
import Heading from "./Heading"
import { cn } from "@/lib/utils"

const Projects = () => {
  const [repositories, setRepositories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRepositories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/github-repos")
      if (!response.ok) {
        throw new Error("Failed to fetch repositories")
      }
      const data = await response.json()
      setRepositories(data)
    } catch (error) {
      console.error("Error fetching repositories:", error)
    } finally {
      // Add a small artificial delay to prevent flickering on fast connections
      // and to let the skeleton shine for a moment
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
                "animate-pulse" // The pulse effect
              )}
              style={{
                backdropFilter: "blur(120px)",
                WebkitBackdropFilter: "blur(120px)",
              }}
            >
              <div className="relative z-50">
                <div className="p-4">
                  {/* Title Skeleton */}
                  <div className="h-6 w-2/3 bg-neutral-700/50 rounded mb-4"></div>
                  {/* Description Skeleton (3 lines) */}
                  <div className="h-4 w-full bg-neutral-800/50 rounded mb-2"></div>
                  <div className="h-4 w-full bg-neutral-800/50 rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-neutral-800/50 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <HoverEffect items={transformedProjects} column={3} />
      )}
    </div>
  )
}

export default Projects