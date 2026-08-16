# Finding-Level Fixation Attribution — Project Site

Public, manuscript-free project page for **“Finding-Level Fixation Attribution in
Chest Radiography: Comparing Learned Selection with Structured Baselines.”**

**Live site:** https://gohyunsu.github.io/finding-level-fixation-attribution/

The page communicates the paper’s central result with three elements:

1. an automatically playing, interactive schematic of complete-scanpath attribution;
2. metric-aware comparison of temporal, structured, and learned methods;
3. concise views of finding heterogeneity and annotation-fraction sensitivity.

## Data and manuscript boundary

This repository contains only identifier-free aggregate results and a code-generated
schematic. It does **not** contain the submitted PDF/TeX, MIMIC-CXR or REFLACX image
pixels, transcripts, raw gaze, identifiers, or patient-level predictions. The actual
study examples remain in the controlled local research environment because PhysioNet
restricted data must not be redistributed.

## Local preview

```bash
python -m http.server 8000
python scripts/validate_site.py
```

Then open `http://localhost:8000`.

The site has no build step or third-party JavaScript dependency. GitHub Pages deploys
the allowlisted static files after `validate_site.py` passes.
