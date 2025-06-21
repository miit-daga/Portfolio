import { Timeline } from "./ui/timeline"
import Heading from "./Heading"

export function WorkExp() {
  const data = [
    {
      title: "Summer Intern — Mumbai, India",
      content: (
        <div className="flex-col">
          <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">Tata Power</p>
          <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">[May 2025 – Present]</p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Enhanced the reliability of key operational data systems by automating daily logging for blower states and temperature violations across multiple power plants. Migrated data collection from manual CSV processes to a robust cloud PostgreSQL database, orchestrating the workflows with AWS Step Functions and scheduled cron jobs. Resolved critical data integrity bugs, including a UTC–IST time conversion error and an incorrect API method usage, to eliminate reporting inaccuracies across 80+ units and ensure metrics were reliable for business decisions.
          </p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Drove major performance improvements on business-critical dashboards and data pipelines. Optimized a key processing pipeline to achieve a 12x speedup, cutting its runtime from 6 minutes to under 30 seconds. By implementing a caching mechanism, automating daily PPGCL data saving via cron jobs, and optimizing a core endpoint, I reduced dashboard and API response times from over 30-40 seconds down to under 5-10 seconds, enabling near real-time data synchronization and accelerating daily operational decisions.
          </p>
        </div>
      ),
    },
    {
      title: "Full Stack Developer Intern — Remote",
      content: (
        <div className="flex-col">
          <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">TechWire Studio</p>
          <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">[March 2025 – Present]</p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Developed backend systems for multiple high-impact projects within the company. Led the development of a comprehensive business management platform for Xceed Electronics, featuring core functionalities such as real-time in-house inventory tracking, order enquiry processing, and secure, role-based admin operations. The platform also integrated the Waldom API to source and manage an extended range of products. Optimized API workflows to reduce backend latency by over 40%. Deployed the application on AWS to ensure scalability and reliability. The system currently handles over 1,000 inventory and order-related actions per month.
            <br />
            Led the complete backend development for a headless inventory and ordering platform, designed as a scalable Software-as-a-Service (SaaS) solution. The system was engineered with a robust, transactional ordering process to ensure data integrity and precise inventory control across products with multiple variants. A secure, dual-role authentication flow was implemented using Firebase JWT to manage distinct permissions for administrators and clients. For file management, the platform was integrated with AWS S3, featuring both single image uploads from product forms and a sophisticated, asynchronous bulk-upload system for ZIP archives that automatically processes images and generates CSV reports. The API was designed to be highly practical, accepting user-friendly identifiers (like product size) to simplify frontend integration and enhance the overall user experience for the authenticated ordering portal.
          </p>
        </div>
      ),
    },

    {
      title: "SDE Intern — Vellore, India",
      content: (
        <div className="flex-col">
          <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">Seculinx</p>
          <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">[Sep 2024 – Jan 2025]</p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Played a key role in building the digital foundation for Seculinx, a smart home automation startup focused
            on AI-powered, intuitive living experiences. Designed and developed a high-performance, SEO-optimized
            website that showcased Seculinx's vision for intelligent home systems and energy-efficient automation.
            Implemented scalable, responsive UI components and integrated real-time product features using modern web
            technologies. Achieved a 35% improvement in load times and enhanced user engagement through interactive,
            lifestyle-centric content — contributing to stronger early brand presence and lead generation.
          </p>
        </div>
      ),
    }
  ]
  return (
    <div className="relative w-full overflow-clip py-16" id="workex">
      <Heading text="Work Experience" />
      <Timeline data={data} />
    </div>
  )
}
