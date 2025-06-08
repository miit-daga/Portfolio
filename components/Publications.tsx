'use client';
import React from 'react';
import { HoverEffectPublications } from "@/components/ui/card-hover-effect-publications"; // New import
import Heading from "@/components/Heading";

const Publications = () => {
    const publications = [
        {
            title: "DeepSeqCoco: A Robust Mobile Friendly Deep Learning Model for Detection of Diseases in Cocos nucifera",
            description: "Proposes DeepSeqCoco, an EfficientNet-B3-based deep learning model for coconut disease detection, optimized for mobile use. The model achieves high accuracy (up to 99.5%) with reduced computational cost compared to existing methods. It was tested using SGD, Adam, and hybrid optimizers. The work has been published in IEEE Access.",
            link: "https://doi.org/10.1109/ACCESS.2025.3571800"
        },
        {
            title: "Enhancing Cognitive Evaluation: A Thorough Examination of the Hong Kong Adaptation of the Montreal Cognitive Assessment (HK-MoCA) and Bayesian Integration",
            description: "A detailed review of the Hong Kong adaptation of the Montreal Cognitive Assessment (HK-MoCA), exploring its improvements through the integration of Bayesian techniques to enhance cognitive evaluation accuracy. The work is published in a book with ISBN 978-93-6674-263-2.",
            link: "https://rb.gy/0qoeij"
        },
        {
            title: "Statistical Validation in Cultural Adaptations of Cognitive Tests: A Multi-Regional Systematic Review ",
            description: "A comprehensive review of cultural adaptations for cognitive assessment tools across global populations. This analysis explores methodological approaches, statistical validations, and demographic factors, emphasizing cultural sensitivity, community involvement, and rigorous validation for accurate, equitable cognitive health evaluations worldwide. Accepted and currently under publication by CRC press.",
            link: ""
        }
    ];

    const items = publications.map(pub => ({
        title: pub.title,
        description: pub.description,
        link: pub.link || ''
    }));

    return (
        <div className="max-w-5xl mx-auto px-8 py-16" id="publications">
            <Heading text="  Publications" />
            <HoverEffectPublications items={items} />
        </div>
    );
};

export default Publications;
