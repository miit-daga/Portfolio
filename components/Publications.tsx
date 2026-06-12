'use client';
import React from 'react';
import { HoverEffectPublications } from "@/components/ui/card-hover-effect-publications"; // New import
import Heading from "@/components/Heading";

const Publications = [
    {
        type: "journal" as const,
        venue: "Scientific Reports · Nature Portfolio",
        title: "Adaptive Quantum Kernel Selection via Leakage-Free Stacking for Clinical Diagnostics on NISQ Hardware",
        description: "Proposes a hybrid quantum stacking ensemble that routes clinical data through three geometrically distinct quantum feature maps (Angle, Amplitude, and ZZ-entanglement), computing fidelity-based Gram matrices for Quantum SVM and Quantum KNN classifiers. A Logistic Regression meta-learner, trained on strictly out-of-fold predictions from nested cross-validation, learns which quantum kernel generalizes on each dataset and suppresses those that do not. Across Parkinson's, Breast Cancer, and Diabetes datasets with 1,000-iteration bootstrapping, the ensemble raised Parkinson's Specificity from 0.585 to 0.813 while keeping Recall above 0.95, matched a classical RBF-SVM on Breast Cancer, and improved Diabetes Recall from 0.553 to 0.621. Explainability via SHAP, LIME, and Permutation Importance traces predictions back to established clinical biomarkers, and noise simulations confirm graceful degradation under NISQ hardware conditions. The work has been published in Scientific Reports (Nature Portfolio).",
        link: "https://doi.org/10.1038/s41598-026-56928-1",
    },
    {
        type: "journal" as const,
        venue: "Array · Elsevier",
        title: "AquaSelect: Learning when to abstain via score fusion for reliable underwater species classification",
        description: "Presents AquaSelect, a post-hoc selective prediction framework that learns when to abstain rather than risk a misclassification in visually degraded underwater species recognition. A lightweight binary selection head (213K parameters) is trained on a frozen backbone to predict classifier correctness, fused with temperature-calibrated confidence and image quality features through interpretable logistic regression. Evaluated on two underwater datasets (AQUA20 and Sea Animals) with ConvNeXt-Tiny and DeiT-Small backbones, it outperforms Softmax Response and Monte Carlo Dropout; at 80% coverage, accuracy rises from 87.3% to 94.8% and Macro F1 from 81.5% to 88.6%, while running at 149 FPS, 2.8 times faster than Deep Ensembles. The work has been published in Array (Elsevier).",
        link: "https://doi.org/10.1016/j.array.2026.100890",
    },
    {
        type: "journal" as const,
        venue: "IEEE Access",
        title: "CocoSyn: A Deployment-Ready Federated Framework for Coconut Disease Detection Validated by the SAFE Protocol",
        description: "Introduces CocoSyn, a decentralized Federated Learning framework, and the SAFE Protocol, a rigorous multi-seed evaluation standard designed to verify AI stability on the edge. Leveraging the DeepSeqCoco model as a backbone, this work simulates challenging non-IID data environments to stress-test deployment readiness. The study reveals that standard single-run evaluations often mask catastrophic failure modes present in SGD optimizers. By applying the SAFE protocol, the research demonstrates that Adam provides the necessary resilience for real-world agricultural use, achieving near-centralized accuracy (~96%) with superior stability. The work has been published in IEEE Access.",
        link: "https://doi.org/10.1109/ACCESS.2026.3659709",
    },
    {
        type: "patent" as const,
        venue: "Indian Patent",
        status: "Filed · Sep 2025",
        title: "Co-inventor, AI Powered Smart Disease Detection",
        description: "A multi-crop diagnostic system using deep learning to achieve 99.3% accuracy in under 2.5 seconds. The invention discloses a system and method for rapid plant disease diagnosis across multiple crop species, supporting at least five plant species including coconut, rubber, black gram, turmeric, and eggplant. It enables high accuracy detection without specialized hardware, addressing critical needs in modern agriculture. The work has been filed as Indian Patent Application No. 202541082595 in September 2025.",
        link: "",
    },
];

const PublicationsSection = () => {
    const items = Publications.map(pub => ({
        type: pub.type,
        venue: pub.venue,
        status: "status" in pub ? pub.status : undefined,
        title: pub.title,
        description: pub.description,
        link: pub.link || '',
    }));

    return (
        <div className="max-w-5xl mx-auto px-8 py-16" id="publications">
            <Heading text="Publications & Patents" />
            <p className="mt-4 text-center text-sm md:text-base text-neutral-400">
                A few highlights below, drawn from 8 Scopus-indexed papers (with more under review), plus a book chapter and a filed patent.
            </p>
            <HoverEffectPublications items={items} />
        </div>
    );
};

export default PublicationsSection;
