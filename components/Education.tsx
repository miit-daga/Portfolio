import { Timeline } from "./ui/timeline"
import Heading from "./Heading"

export function Education() {
    const data = [
        {
            title: "Bachelor of Technology — Vellore, India",
            content: (
                <div className="flex-col">
                    <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">
                        Vellore Institute of Technology
                    </p>
                    <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">
                        Sep 2022 – Present
                    </p>
                    <p className="my-5 text-xs md:text-sm text-neutral-200">
                        Currently pursuing a B.Tech in Information Technology, covering a broad range of computing concepts, programming principles, and emerging technologies.
                    </p>
                    <p className="text-xs md:text-sm text-neutral-200">
                        CGPA: 9.16 / 10
                    </p>
                </div>
            ),
        },
        {
            title: "Higher Secondary Education (Class XII) — India",
            content: (
                <div className="flex-col">
                    <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">
                        Swami Vivekananda Vidyamandir
                    </p>
                    <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">
                        May 2020 – Jun 2022
                    </p>
                    <p className="my-5 text-xs md:text-sm text-neutral-200">
                        Completed Higher Secondary with a specialization in Science (Physics, Chemistry, Mathematics, Computer Science).
                    </p>
                    <p className="text-xs md:text-sm text-neutral-200">
                        Percentage: 92%
                    </p>
                </div>
            ),
        },
        {
            title: "Primary & Secondary Education (Class X) — India",
            content: (
                <div className="flex-col">
                    <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">
                        St. Helen's School
                    </p>
                    <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">
                        Apr 2008 – Jul 2020
                    </p>
                    <p className="my-5 text-xs md:text-sm text-neutral-200">
                        Completed foundational education with consistent academic performance and participation in extracurricular activities.
                    </p>
                    <p className="text-xs md:text-sm text-neutral-200">
                        Percentage: 91.6%
                    </p>
                </div>
            ),
        },
    ]

    return (
        <div className="relative w-full overflow-clip py-16" id="education">
            <Heading text="Education" />
            <Timeline data={data} />
        </div>
    )
}
