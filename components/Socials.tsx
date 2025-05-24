import { socials } from "@/constants"
import Link from "next/link"

const Socials = () => {
  return (
    <div className="flex gap-6 items-center justify-center my-14 "> 
      {socials.map((social) => {
        const IconComponent = social.icon;
        return (
          <Link
            key={social.key} 
            href={social.url}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer" 
          >
            {IconComponent && <IconComponent className="mr-2 h-5 w-5" />}
            <span>{social.name}</span>
          </Link>
        );
      })}
    </div>
  )
}

export default Socials