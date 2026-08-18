#!/usr/bin/env python3
"""Fail closed if a manuscript or restricted-data artifact enters the public site."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_SUFFIXES = {".html", ".css", ".js", ".json", ".md", ".txt", ""}
ALLOWED_SUPPORT_FILES = {
    Path("scripts/validate_site.py"),
    Path(".github/workflows/pages.yml"),
}
FORBIDDEN_SUFFIXES = {".pdf", ".tex", ".bib", ".png", ".jpg", ".jpeg", ".dcm", ".dicom", ".npz", ".npy", ".pt", ".pth"}
FORBIDDEN_TEXT = [
    re.compile(r"@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    re.compile(r"p\d{8,}"),
    re.compile(r"s\d{8,}"),
    re.compile(r"submitted_artifact_sha256", re.I),
]


def main() -> None:
    errors: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts:
            continue
        relative = path.relative_to(ROOT)
        suffix = path.suffix.lower()
        if suffix in FORBIDDEN_SUFFIXES:
            errors.append(f"forbidden public artifact: {relative}")
            continue
        if suffix not in ALLOWED_SUFFIXES and relative not in ALLOWED_SUPPORT_FILES:
            errors.append(f"non-allowlisted public artifact: {relative}")
            continue
        if relative in ALLOWED_SUPPORT_FILES:
            continue
        if suffix in {".html", ".css", ".js", ".json", ".md", ".txt"} or path.name in {"LICENSE", ".nojekyll"}:
            text = path.read_text(encoding="utf-8")
            for pattern in FORBIDDEN_TEXT:
                if pattern.search(text):
                    errors.append(f"forbidden text pattern {pattern.pattern!r}: {relative}")

    data = json.loads((ROOT / "data" / "results.json").read_text(encoding="utf-8"))
    if data.get("cohorts") != {"linker_coverage": 1093, "attribution": 987, "other_patient_substitution": 948}:
        errors.append("public cohort summary violates the frozen cohort contract")
    if data.get("result_contract") != "consistent_five_seed_revision_2026-08-18":
        errors.append("public site does not identify the promoted five-seed contract")
    paired = data.get("paired_five_seed_mean_vs_structured_3.0s", {})
    if paired.get("pointing", {}).get("delta") != 0.0353:
        errors.append("public pointing difference is not the five-seed estimate")
    if paired.get("iou", {}).get("ci95") != [-0.0034, 0.0102]:
        errors.append("public IoU interval is not the five-seed estimate")
    fractions = {row.get("label"): row for row in data.get("training_fraction", [])}
    if set(fractions) != {"10%", "25%", "50%", "100%"}:
        errors.append("public training-fraction rows are incomplete")
    elif (
        fractions["10%"].get("learned_iou") != 0.319076
        or fractions["50%"].get("structured_iou") != 0.353480
        or fractions["100%"].get("learned_pointing") != 0.824500
    ):
        errors.append("public training-fraction values do not match the strict aggregate")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    if 'fetch("data/results.json"' not in app:
        errors.append("interactive charts are not sourced from the public result registry")
    if errors:
        raise SystemExit("site validation failed:\n- " + "\n- ".join(errors))
    print("site validation passed: manuscript-free, identifier-free, restricted-image-free")


if __name__ == "__main__":
    main()
