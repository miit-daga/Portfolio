'use client';
import React from 'react';
import { HoverEffectPublications } from "@/components/ui/card-hover-effect-publications"; // New import
import Heading from "@/components/Heading";
import { accentVars, getSection } from "@/constants/sections";

const Publications = [
    {
        type: "journal" as const,
        venue: "Array · Elsevier",
        title: "VeriX-Anon: A multi-layered framework for mathematically verifiable outsourced target-driven data anonymization",
        description: "Organizations increasingly outsource privacy-sensitive data transformations to cloud providers, yet no practical mechanism lets the data owner verify that the contracted algorithm was faithfully executed. VeriX-Anon is a multi-layered verification framework for outsourced Target-Driven k-anonymization combining three orthogonal mechanisms: deterministic verification via Merkle-style hashing of an Authenticated Decision Tree, probabilistic verification via Boundary Sentinels and exact-duplicate Twins with cryptographic identifiers, and utility-based verification via Explainable AI fingerprinting that compares SHAP value distributions before and after anonymization using the Wasserstein distance. Across seven cross-domain datasets and four cloud profiles (28 scenarios), against Lazy (drops records), Dumb (fake hash), and Approximate (valid hash) adversaries, VeriX-Anon detects 25 of 28 deviations under a fixed threshold and 27 of 28 once the threshold is calibrated per dataset, with no false alarms. No single layer achieved this alone. The XAI layer was the only mechanism that caught the Approximate adversary, succeeding on six of seven datasets and missing only a high-dimensional case where honest generalization shifts SHAP as much as the attack. Target-Driven anonymization preserved significantly more utility than blind splitting, with mean F1 gaps of +0.058 to +0.362 and Wilcoxon p ≤ 0.001 on six of seven datasets. Client-side verification completes under one second at one million rows. The threat model covers three empirically evaluated profiles and one theoretical Informed Attacker unable to defeat the cryptographic salt. Sentinel evasion probability ranges from near-zero to 0.82 for the most imbalanced data, which the twin layer offsets in every scenario.",
        link: "https://doi.org/10.1016/j.array.2026.101169",
        visual: "verix" as const,
    },
    {
        type: "journal" as const,
        venue: "Scientific Reports · Nature Portfolio",
        title: "Adaptive Quantum Kernel Selection via Leakage-Free Stacking for Clinical Diagnostics on NISQ Hardware",
        description: "Quantum kernel methods map clinical features into exponentially large Hilbert spaces where overlapping biological markers can become more separable than in fixed-dimensional classical feature spaces, but existing work evaluates single quantum feature maps, ignores barren-plateau failure modes, and relies on single train–test splits vulnerable to data leakage. Classical diagnostics for Parkinson’s disease, breast cancer, and diabetes remain limited by the Specificity–Recall trade-off that fixed-dimensional kernels impose on overlapping biomarker distributions. We propose an adaptive hybrid quantum framework routing clinical data through three distinct quantum feature maps, namely Angle, Amplitude, and ZZ-entanglement, computing fidelity-based Gram matrices for Quantum SVM and Quantum KNN classifiers. A Logistic Regression meta-learner, trained on strictly out-of-fold predictions from nested cross-validation (5-fold inner, 10-fold outer), learns which quantum kernel generalizes on each dataset and suppresses those that do not. Evaluated on Parkinson’s (195 patients), Breast Cancer (569), and Diabetes (768) with 1,000-iteration bootstrapping, the ensemble raised Parkinson’s Specificity from 0.585 to 0.813 (p < 0.001) while maintaining Recall above 0.95, matched classical RBF-SVM on Breast Cancer (all p > 0.05), and improved Diabetes Recall from 0.553 to 0.621 (p = 0.004). A standalone Variational Quantum Classifier failed on all datasets (ROC-AUC 0.51 to 0.57), confirming barren plateau limitations. Explainability via SHAP, LIME, and Permutation Importance revealed dataset-dependent kernel trust: the meta-learner suppressed QKNN Amplitude on Diabetes (coefficient −0.353) while amplifying it on Parkinson’s (1.761). PCA-based feature backtracking recovered established biomarkers including Insulin and Glucose for Diabetes, vocal perturbation measures for Parkinson’s, and nucleus geometry for Breast Cancer. Noise simulations confirmed graceful degradation under NISQ conditions. The framework performs data-driven kernel selection, removing the need to pre-specify an encoding strategy.",
        link: "https://doi.org/10.1038/s41598-026-56928-1",
        visual: "quantum" as const,
    },
    {
        type: "journal" as const,
        venue: "Array · Elsevier",
        title: "AquaSelect: Learning when to abstain via score fusion for reliable underwater species classification",
        description: "Deep learning classifiers for fine-grained visual recognition provide no per-prediction reliability estimate, yet selective prediction methods that allow classifiers to abstain remain evaluated only on standard benchmarks, untested in domains where visual degradation drives failure patterns. We present AquaSelect, a post-hoc selective prediction framework that learns when to abstain rather than risk a misclassification. AquaSelect trains a lightweight binary selection head of 213K parameters on a frozen backbone to predict classifier correctness, fusing this with temperature-calibrated confidence and image quality features via interpretable logistic regression. Because the backbone remains frozen, the selection head can be retrained for new environments without touching the base classifier. Evaluated on two underwater species datasets, AQUA20 with 8,171 images across 20 classes and Sea Animals with 13,711 images across 23 classes, using ConvNeXt-Tiny and DeiT-Small backbones across three seeds, AquaSelect outperforms Softmax Response and Monte Carlo Dropout on all six seed-backbone evaluations on AQUA20 and improves mean coverage metrics on Sea Animals. At 80% coverage, accuracy rises from 87.3% to 94.8% and Macro F1 from 81.5% to 88.6%, surpassing the benchmark full-data accuracy of 90.69% despite using 15% less training data. We also report that RAPS conformal prediction sets averaging 3.7 to 5.0 classes are impractical for single-label classification, and fusing set sizes with learned scores degrades selection quality. Ablation identifies the learned selection head as the dominant component. The framework runs at 149 FPS, 2.8 times faster than Deep Ensembles, and applies to any classification system where errors carry asymmetric costs.",
        link: "https://doi.org/10.1016/j.array.2026.100890",
        visual: "aquaselect" as const,
    },
    {
        type: "patent" as const,
        venue: "Indian Patent",
        status: "Filed · Sep 2025",
        title: "Co-inventor, AI Powered Smart Disease Detection",
        description: "A multi-crop diagnostic system using deep learning to achieve 99.3% accuracy in under 2.5 seconds. The invention discloses a system and method for rapid plant disease diagnosis across multiple crop species, supporting at least five plant species including coconut, rubber, black gram, turmeric, and eggplant. It enables high accuracy detection without specialized hardware, addressing critical needs in modern agriculture. The work has been filed as Indian Patent Application No. 202541082595 in September 2025.",
        link: "",
        visual: "patent" as const,
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
        visual: pub.visual,
    }));

    return (
        <div className="max-w-5xl mx-auto px-8 py-16" id="publications" style={accentVars(getSection("publications"))}>
            <Heading section="publications" />
            <p className="mt-4 text-center text-sm md:text-base text-neutral-400">
                A few highlights below, drawn from 10 Scopus-indexed papers (with more under review), plus a book chapter and a filed patent.
            </p>
            <HoverEffectPublications items={items} />
        </div>
    );
};

export default PublicationsSection;
