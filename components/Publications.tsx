// 'use client';
// import React from 'react'
// import { useEffect, useState } from 'react';
// import { HoverEffect } from "@/components/ui/card-hover-effect";

// const Publications = () => {
//     const [publications, setPublications] = useState([
//         {
//             title: "Publication 1",
//             description: "Description for Publication 1", // You'll fill this text
//             link: "https://example.com/publication1" // Link for the first publication
//         },
//         {
//             title: "Publication 2 (Upcoming)",
//             description: "Description for Publication 2", // You'll fill this text
//             link: "" // No link for the work in progress
//         }
//     ]);

//     // This is a placeholder function that you could implement later
//     // if you want to fetch publications from an API instead of hardcoding them
//     const fetchPublications = async () => {
//         try {
//             // Uncomment and modify this if you want to fetch from an API later
//             // const response = await fetch('/api/publications');
//             // if (!response.ok) {
//             //   throw new Error('Failed to fetch publications');
//             // }
//             // const data = await response.json();
//             // setPublications(data);
//         } catch (error) {
//             console.error('Error fetching publications:', error);
//         }
//     };

//     useEffect(() => {
//         // Uncomment this if you implement the fetch function
//         // fetchPublications();
//     }, []);

//     const transformedPublications = publications.map(pub => ({
//         title: pub.title,
//         description: pub.description,
//         link: pub.link || undefined // If link is empty string, make it undefined so card won't be clickable
//     }));

//     return (
//         <div className="max-w-5xl mx-auto px-8" id="publications">
//             <h1 className='py-10 text-center text-6xl font-extrabold lg:text-8xl'>
//                 Publications
//             </h1>
//         </div>
//     );
// };

// export default Publications;
'use client';
import React from 'react';
import { HoverEffect } from "@/components/ui/card-hover-effect";
import Heading from "@/components/Heading";

const Publications = () => {
    // Hardcoded publications - no need for useState or useEffect
    const publications = [
        {
            title: "Enhancing Cognitive Evaluation: A Thorough Examination of the Hong Kong Adaptation of the Montreal Cognitive Assessment (HK-MoCA) and Bayesian Integration",
            description: "A detailed review of the Hong Kong adaptation of the Montreal Cognitive Assessment (HK-MoCA), exploring its improvements through the integration of Bayesian techniques to enhance cognitive evaluation accuracy. The work is published in a book with ISBN 978-93-6674-263-2.",
            link: "https://rb.gy/0qoeij"
        },
        {
            title: "Statistical Validation in Cultural Adaptations of Cognitive Tests: A Multi-Regional Systematic Review ",
            description: "A comprehensive review of cultural adaptations for cognitive assessment tools across global populations. This analysis explores methodological approaches, statistical validations, and demographic factors, emphasizing cultural sensitivity, community involvement, and rigorous validation for accurate, equitable cognitive health evaluations worldwide. Accepted and currently under publication by CRC press.",
            link: "" // No link for work in progress
        }
    ];

    // Transform the data to match the format expected by HoverEffect component
    const items = publications.map(pub => ({
        title: pub.title,
        description: pub.description,
        link: pub.link || '' // If link is empty string, make it undefined
    }));

    return (
        <div className="max-w-5xl mx-auto px-8 py-16" id="publications">
            <Heading text="Publications" />
            <HoverEffect items={items} column={2} />
        </div>
    );
};

export default Publications;
