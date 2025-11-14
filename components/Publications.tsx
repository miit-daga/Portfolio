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
            title: "Co-inventor, AI Powered Smart Disease Detection",
            description: "A multi-crop diagnostic system using deep learning to achieve 99.3% accuracy in under 2.5 seconds. The invention discloses a system and method for rapid plant disease diagnosis across multiple crop species, supporting at least five plant species including coconut, rubber, black gram, turmeric, and eggplant. It enables high accuracy detection without specialized hardware, addressing critical needs in modern agriculture. The work has been filed as Indian Patent Application No. 202541082595 in September 2025.",
            link: ""
        },
        {
            title: "A Lightweight Ensemble Approach for Classification of DDoS Attacks in IoE Environments",
            description: "Developed a lightweight ensemble machine learning framework for DDoS attack detection in IoT networks using the CIC IoT-2023 dataset. Focuses on four ensemble models: RUSBoost, AdaBoost, Bagging-Decision Trees, and Random Subspace k-Nearest Neighbors. Results revealed that Bagging-DT performed with 99.96% accuracy, while standalone DT achieved 100% accuracy with only 0.04MB storage, making it scalable for real-time IoT security applications. The work has been published in proceedings of SENNET 2025, IEEE Xplore Digital Library.",
            link: "https://doi.org/10.1109/SENNET64220.2025.11136075"
        },
        {
            title: "Enhancing Cognitive Evaluation: A Thorough Examination of the Hong Kong Adaptation of the Montreal Cognitive Assessment (HK-MoCA) and Bayesian Integration",
            description: "A detailed review of the Hong Kong adaptation of the Montreal Cognitive Assessment (HK-MoCA), exploring its improvements through the integration of Bayesian techniques to enhance cognitive evaluation accuracy. The work is published in a book with ISBN 978-93-6674-263-2.",
            link: "https://rb.gy/0qoeij"
        }
    ];

    const items = publications.map(pub => ({
        title: pub.title,
        description: pub.description,
        link: pub.link || ''
    }));

    return (
        <div className="max-w-5xl mx-auto px-8 py-16" id="publications">
            <Heading text="Publications & Patents" />
            <HoverEffectPublications items={items} />
        </div>
    );
};

export default Publications;
