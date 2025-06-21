import Heading from "./Heading"
import Socials from "./Socials"
import { IconMail, IconPhone } from "@tabler/icons-react"

export function Contact() {
    return (
        <div className="relative w-full overflow-clip pt-16 pb-10" id="contact">
            <Heading text="Let's Connect" />

            <div className="mt-10 mx-auto max-w-2xl text-center px-4">
                <p className="text-base md:text-lg text-neutral-300">
                    I’m currently open to new opportunities and collaborations. Whether you have a question, a project in mind, or just want to say hello — feel free to reach out. I’ll get back to you as soon as I can.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 mt-12">
                    <a
                        href="mailto:miitcodes27@gmail.com"
                        className="flex items-center gap-3 text-lg font-semibold text-neutral-200 hover:text-teal-400 transition-colors duration-300"
                    >
                        <IconMail className="h-6 w-6 text-teal-500" />
                        miitcodes27@gmail.com
                    </a>

                    <a
                        href="tel:+917003816564"
                        className="flex items-center gap-3 text-lg font-semibold text-neutral-200 hover:text-teal-400 transition-colors duration-300"
                    >
                        <IconPhone className="h-6 w-6 text-teal-500" />
                        +91-7003816564
                    </a>
                </div>
            </div>
            <div className="mt-16">
                <Socials />
            </div>
        </div>
    )
}