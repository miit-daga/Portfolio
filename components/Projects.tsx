"use client"
import { useEffect, useState } from "react"
import { HoverEffect } from "@/components/ui/card-hover-effect"
import Heading from "./Heading"

const Projects = () => {
  const [repositories, setRepositories] = useState<any[]>([])

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/github-repos")
      if (!response.ok) {
        throw new Error("Failed to fetch repositories")
      }
      const data = await response.json()
      setRepositories(data)
    } catch (error) {
      console.error("Error fetching repositories:", error)
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
      <Heading />
      <HoverEffect items={transformedProjects} column={3} />
    </div>
  )
}

export default Projects
