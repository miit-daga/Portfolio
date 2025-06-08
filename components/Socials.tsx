import { socials } from "@/constants"
import Link from "next/link"

const Socials = () => {
  return (
    <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-3 items-center justify-center my-10 sm:my-14 px-4">
      {socials.map((social) => {
        const Icon = social.icon
        return (
          <Link
            key={social.key}
            href={social.url}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {Icon && <Icon className="mr-2 h-5 w-5" />}
            <span>{social.name}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default Socials
