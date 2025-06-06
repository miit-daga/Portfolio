// components/WorkExp.tsx
import React from "react";
import { Timeline } from "./ui/timeline";

export function WorkExp() {
    const data = [
        {
            title: "Full Stack Developer Intern — Remote",
            content: (
                <div className="flex-col">
                    <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">
                        TechWire Studio
                    </p>
                    <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">
                        [March 2025 – Present]
                    </p>
                    <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
                        Spearheading backend development for multiple high-impact projects at TechWire Studio. Led the development of a comprehensive business management platform for Xceed Electronics. Core functionalities included real-time tracking of in-house inventory, order enquiry processing, and secure role-based admin operations. Additionally, the platform integrated the Waldom API to source and manage an extended range of products, with a corresponding payment gateway implemented to facilitate sales of these Waldom-specific items. Optimized API workflows to reduce backend latency by over 40%, and deployed the application on AWS to ensure reliability at scale — currently handling over 1000+ inventory and order-related actions monthly.<br />
                        Additionally, built an internal project management and automated payment portal for TechWire’s recurring maintenance clients. Integrated Razorpay for seamless invoicing, allowing admins to manage client records, project details, and payment tracking in one place. Designed a paywall mechanism that automatically blocks client websites post due dates and restores access instantly upon payment confirmation, significantly reducing collection delays and improving cash flow.
                    </p>
                </div>
            ),
        },

        {
            title: "SDE Intern — Vellore, India",
            content: (
                <div className="flex-col">
                    <p className="mb-8 text-xl md:text-3xl font-bold text-neutral-200">
                        Seculinx
                    </p>
                    <p className="mb-8 text-md md:text-xl font-bold text-neutral-500">
                        [Sep 2024 – Jan 2025]
                    </p>
                    <p className="my-5 text-xs font-normal md:text-sm text-neutral-200">
                        Played a key role in building the digital foundation for Seculinx, a smart home automation startup focused on AI-powered, intuitive living experiences. Designed and developed a high-performance, SEO-optimized website that showcased Seculinx’s vision for intelligent home systems and energy-efficient automation. Implemented scalable, responsive UI components and integrated real-time product features using modern web technologies. Achieved a 35% improvement in load times and enhanced user engagement through interactive, lifestyle-centric content — contributing to stronger early brand presence and lead generation.
                    </p>
                </div>
            ),
        }
    ];
    return (
        <div className="relative w-full overflow-clip py-16" id="workex">
            <Timeline data={data} />
        </div>
    );
}