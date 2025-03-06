import { socials } from "@/constants"
import Link from "next/link"
import Image from "next/image"
const Socials = () => {
  return (
    <div className="flex gap-5 items-center justify-center my-14 ">
        {socials.map((social) => (
            <div className="flex" key={social.url}>
                <Image key={social.key} src='/icons/outward.svg' height={15} width={15} alt="link"/>
                <Link key={social.url} href={social.url} className="text-gray-300 hover:text-white transition-colors" target="_blank">{social.name}</Link>
            </div>
        ))}
    </div>
  )
}

export default Socials