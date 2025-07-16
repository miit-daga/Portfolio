import { Timeline } from "./ui/timeline"
import Heading from "./Heading"

export function WorkExp() {
  const data = [
    {
      title: "Project Intern — Mumbai, India",
      content: (
        <div className="flex-col">
          <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">Tata Power</p>
          <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">[May 2025 – July 2025]</p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Improved the reliability and performance of operational data systems across Tata Power’s Maithon, PPGCL, and Jojobera plants by automating daily logging workflows and modernizing backend infrastructure. Replaced manual CSV-based processes with a cloud-hosted PostgreSQL database, orchestrated using AWS Step Functions and scheduled cron jobs. This made data collection for blower states and temperature violations significantly more consistent and maintainable. Fixed critical data issues, including a UTC to IST time conversion bug and incorrect API usage, which had caused discrepancies across over 80 units. These fixes helped restore accuracy in real-time dashboards and improved trust in key operational metrics.

          </p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Focused on speeding up pipelines and dashboards that were slowing down decision-making. Reduced a core processing pipeline’s runtime from six minutes to under thirty seconds and cut dashboard response times from over forty seconds to under five. Achieved this through caching, endpoint optimization, and pushing heavy aggregation work into the database after identifying missing indexes. Built a real-time mill runtime tracking system with reliable job execution by isolating the scheduler in a dedicated thread. Also restructured legacy services into a modular, asynchronous design, which improved scalability and reduced response lag by forty percent.
          </p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Enhanced the platform’s analytical capabilities by integrating an existing time-series forecasting model for anomaly detection into the upgraded codebase, ensuring it worked smoothly after migration. On top of that, built a new suite of diagnostic APIs for LRSB health tracking, including caution flags and historical inactivity reports, which enabled a shift toward predictive maintenance and improved system visibility for plant operators.
          </p>
        </div>
      ),
    },
    {
      title: "Full Stack Developer Intern — Remote",
      content: (
        <div className="flex-col">
          <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">TechWire Studio</p>
          <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">[March 2025 – June 2025]</p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
            Developed backend systems for multiple high-impact projects within the company. Led the development of a comprehensive business management platform for Xceed Electronics, featuring core functionalities such as real-time in-house inventory tracking, order enquiry processing, and secure, role-based admin operations. The platform also integrated the Waldom API to source and manage an extended range of products. Optimized API workflows to reduce backend latency by over 40%. Deployed the application on AWS to ensure scalability and reliability. The system currently handles over 1,000 inventory and order-related actions per month.
          </p>
          <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
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
