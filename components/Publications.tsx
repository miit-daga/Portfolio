'use client';
import React from 'react';
import { HoverEffectPublications } from "@/components/ui/card-hover-effect-publications"; // New import
import Heading from "@/components/Heading";
import { accentVars, getSection } from "@/constants/sections";
import { OrcidIcon } from "@/components/ui/orcid-icon";
import { ORCID_URL } from "@/lib/orcid";

export const Publications = [
    {
        type: "journal" as const,
        venue: "Array · Elsevier",
        title: "VeriX-Anon: A multi-layered framework for mathematically verifiable outsourced target-driven data anonymization",
        description: "Organizations increasingly outsource privacy-sensitive data transformations to cloud providers, yet no practical mechanism lets the data owner verify that the contracted algorithm was faithfully executed. VeriX-Anon is a multi-layered verification framework for outsourced Target-Driven k-anonymization combining three orthogonal mechanisms: deterministic verification via Merkle-style hashing of an Authenticated Decision Tree, probabilistic verification via Boundary Sentinels and exact-duplicate Twins with cryptographic identifiers, and utility-based verification via Explainable AI fingerprinting that compares SHAP value distributions before and after anonymization using the Wasserstein distance. Across seven cross-domain datasets and four cloud profiles (28 scenarios), against Lazy (drops records), Dumb (fake hash), and Approximate (valid hash) adversaries, VeriX-Anon detects 25 of 28 deviations under a fixed threshold and 27 of 28 once the threshold is calibrated per dataset, with no false alarms. No single layer achieved this alone. The XAI layer was the only mechanism that caught the Approximate adversary, succeeding on six of seven datasets and missing only a high-dimensional case where honest generalization shifts SHAP as much as the attack. Target-Driven anonymization preserved significantly more utility than blind splitting, with mean F1 gaps of +0.058 to +0.362 and Wilcoxon p ≤ 0.001 on six of seven datasets. Client-side verification completes under one second at one million rows. The threat model covers three empirically evaluated profiles and one theoretical Informed Attacker unable to defeat the cryptographic salt. Sentinel evasion probability ranges from near-zero to 0.82 for the most imbalanced data, which the twin layer offsets in every scenario.",
        link: "https://doi.org/10.1016/j.array.2026.101169",
        visual: "verix" as const,
        tldr: "When a company pays a cloud provider to anonymise sensitive data, it has no way to check the job was actually done. VeriX-Anon hides three kinds of tripwire in the data (a cryptographic fingerprint, planted decoy records, and an AI check on the data's shape) so the owner can catch shortcuts. It caught 27 of 28 cheating attempts with no false alarms, and checking takes under a second, even at a million rows.",
        cite: {
            bibtex: `@article{daga2026verixanon,
  title     = {VeriX-Anon: A multi-layered framework for mathematically verifiable outsourced target-driven data anonymization},
  author    = {Daga, Miit and Ramu, Swarna Priya},
  journal   = {Array},
  volume    = {31},
  pages     = {101169},
  year      = {2026},
  publisher = {Elsevier},
  doi       = {10.1016/j.array.2026.101169}
}`,
            apa: "Daga, M., & Ramu, S. P. (2026). VeriX-Anon: A multi-layered framework for mathematically verifiable outsourced target-driven data anonymization. Array, 31, 101169. https://doi.org/10.1016/j.array.2026.101169",
        },
    },
    {
        type: "journal" as const,
        venue: "Machine Learning with Applications · Elsevier",
        title: "HemoCline: Threshold gap dynamics in cumulative-link ordinal models for imbalanced blood cell maturation",
        description: "In cumulative-link ordinal models, the probability of any interior stage is bounded by threshold spacing: P_max(g) = 2σ(g/2) − 1. This bound is elementary, but its interaction with gradient-based training under class imbalance is not. The gaps widen only under pressure from interior samples sitting near their thresholds; before features separate the stages, too few are positioned there, so narrow gaps reinforce. We characterize this feedback loop and derive the minimum gap g_min(τ) for a target interior recall. We validate the analysis with HemoCline, a 532K-parameter network pairing an MBConv backbone with a hierarchical cumulative-link head for blood cell maturation staging (167:1 class imbalance). Trained from scratch without ImageNet pretraining, HemoCline reaches 98.79 ± 0.17% accuracy / 98.86 ± 0.18% macro-F1 on Barcelona PBC (8 classes) and 93.36 ± 0.89% accuracy / 79.53 ± 1.45% macro-F1 on KU-Optofil (13 classes). Against MobileNetV3-Small trained from scratch under an identical recipe, it matches accuracy using 2.9× fewer parameters, with higher macro-F1, maturation-chain F1, and calibration. Across five seeds, removing the ordinal structure costs 0.030 maturation-chain F1, and CORN (Conditional Ordinal Regression for Neural networks), which avoids the P_max ceiling by construction, is statistically indistinguishable from the cumulative-link head (−0.008 macro-F1), its only per-class deficit falling on Metamyelocyte. The optimizer self-widens narrow gaps from 1.0 to 2.0 without intervention, and a gap-floor regularizer derived from g_min proves inactive at the working initialization. Two pre-specified hypotheses were falsified under a five-seed deployment-readiness protocol.",
        link: "https://doi.org/10.1016/j.mlwa.2026.101031",
        visual: "hemocline" as const,
        tldr: "Blood cells mature through four stages, and the early ones are rare: in one dataset the most mature stage outnumbers the earliest 167 to 1. Models that respect that order have a hidden ceiling on how likely the in-between stages can ever be, and under that imbalance they can get stuck below it. The paper works out the ceiling and the fix, and HemoCline, a small 532K-parameter network, reaches 98.8% accuracy on one dataset and 93.4% at 167:1 imbalance, matching a model almost three times its size.",
        cite: {
            bibtex: `@article{daga2026hemocline,
  title={HemoCline: Threshold gap dynamics in cumulative-link ordinal models for imbalanced blood cell maturation},
  author={Daga, Miit and Bommineni, Kundanika Reddy and Ramu, Swarna Priya},
  journal={Machine Learning with Applications},
  pages={101031},
  year={2026},
  publisher={Elsevier}
}`,
            apa: "Daga, M., Bommineni, K. R., & Ramu, S. P. (2026). HemoCline: Threshold gap dynamics in cumulative-link ordinal models for imbalanced blood cell maturation. Machine Learning with Applications, 101031. https://doi.org/10.1016/j.mlwa.2026.101031",
        },
    },
    {
        type: "journal" as const,
        venue: "Scientific Reports · Nature Portfolio",
        title: "Adaptive Quantum Kernel Selection via Leakage-Free Stacking for Clinical Diagnostics on NISQ Hardware",
        description: "Quantum kernel methods map clinical features into exponentially large Hilbert spaces where overlapping biological markers can become more separable than in fixed-dimensional classical feature spaces, but existing work evaluates single quantum feature maps, ignores barren-plateau failure modes, and relies on single train–test splits vulnerable to data leakage. Classical diagnostics for Parkinson’s disease, breast cancer, and diabetes remain limited by the Specificity–Recall trade-off that fixed-dimensional kernels impose on overlapping biomarker distributions. We propose an adaptive hybrid quantum framework routing clinical data through three distinct quantum feature maps, namely Angle, Amplitude, and ZZ-entanglement, computing fidelity-based Gram matrices for Quantum SVM and Quantum KNN classifiers. A Logistic Regression meta-learner, trained on strictly out-of-fold predictions from nested cross-validation (5-fold inner, 10-fold outer), learns which quantum kernel generalizes on each dataset and suppresses those that do not. Evaluated on Parkinson’s (195 patients), Breast Cancer (569), and Diabetes (768) with 1,000-iteration bootstrapping, the ensemble raised Parkinson’s Specificity from 0.585 to 0.813 (p < 0.001) while maintaining Recall above 0.95, matched classical RBF-SVM on Breast Cancer (all p > 0.05), and improved Diabetes Recall from 0.553 to 0.621 (p = 0.004). A standalone Variational Quantum Classifier failed on all datasets (ROC-AUC 0.51 to 0.57), confirming barren plateau limitations. Explainability via SHAP, LIME, and Permutation Importance revealed dataset-dependent kernel trust: the meta-learner suppressed QKNN Amplitude on Diabetes (coefficient −0.353) while amplifying it on Parkinson’s (1.761). PCA-based feature backtracking recovered established biomarkers including Insulin and Glucose for Diabetes, vocal perturbation measures for Parkinson’s, and nucleus geometry for Breast Cancer. Noise simulations confirmed graceful degradation under NISQ conditions. The framework performs data-driven kernel selection, removing the need to pre-specify an encoding strategy.",
        link: "https://doi.org/10.1038/s41598-026-56928-1",
        visual: "quantum" as const,
        tldr: "Diagnosing disease from patient data usually means trading catching every case against raising false alarms. This framework encodes patient data three different quantum ways and lets a simple model learn which one to trust for each disease. On Parkinson's it cut false alarms sharply (specificity from 0.585 to 0.813) while still catching over 95% of cases, and it holds up under the noise of today's quantum hardware.",
        cite: {
            bibtex: `@article{daga2026quantumkernel,
  title     = {Adaptive quantum kernel selection via leakage-free stacking for clinical diagnostics on NISQ hardware},
  author    = {Daga, Miit and Naole, Saransh and Parikh, Dhriti and Bommineni, Kundanika Reddy and Ramu, Swarna Priya},
  journal   = {Scientific Reports},
  volume    = {16},
  number    = {1},
  year      = {2026},
  publisher = {Springer Nature},
  doi       = {10.1038/s41598-026-56928-1}
}`,
            apa: "Daga, M., Naole, S., Parikh, D., Bommineni, K. R., & Ramu, S. P. (2026). Adaptive quantum kernel selection via leakage-free stacking for clinical diagnostics on NISQ hardware. Scientific Reports, 16(1). https://doi.org/10.1038/s41598-026-56928-1",
        },
    },
    {
        type: "patent" as const,
        venue: "Indian Patent",
        status: "Published · filed Sep 2025",
        title: "Co-inventor, AI Powered Smart Disease Detection",
        description: "A multi-crop diagnostic system using deep learning to achieve 99.3% accuracy in under 2.5 seconds. The invention discloses a system and method for rapid plant disease diagnosis across multiple crop species, supporting at least five plant species including coconut, rubber, black gram, turmeric, and eggplant. It enables high accuracy detection without specialized hardware, addressing critical needs in modern agriculture. The work has been filed as Indian Patent Application No. 202541082595 in September 2025.",
        link: "",
        visual: "patent" as const,
        tldr: "A system that spots disease in the leaves of five crops, including coconut, rubber and turmeric, from an ordinary photo, with 99.3% accuracy in under 2.5 seconds and no special hardware. Filed as an Indian patent in September 2025, and now published.",
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
        tldr: pub.tldr,
        cite: "cite" in pub ? pub.cite : undefined,
    }));

    return (
        <div className="max-w-5xl mx-auto px-8 py-16" id="publications" style={accentVars(getSection("publications"))}>
            <Heading section="publications" />
            <p className="mt-4 text-center text-sm md:text-base text-neutral-400">
                A few highlights below, drawn from 11 Scopus-indexed papers (with more under review), plus a book chapter and a published patent.
            </p>
            {/* The whole list lives on ORCID */}
            <div className="mt-4 flex justify-center">
                <a
                    href={ORCID_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-[rgba(var(--accent-rgb),0.6)] hover:bg-[rgba(var(--accent-rgb),0.08)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--accent-rgb),0.7)]"
                >
                    <OrcidIcon className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Full publication record on ORCID</span>
                    <span className="font-mono text-[11px] text-neutral-400 transition-colors group-hover:text-neutral-300">{ORCID_URL} ↗</span>
                </a>
            </div>
            <HoverEffectPublications items={items} />
        </div>
    );
};

export default PublicationsSection;
