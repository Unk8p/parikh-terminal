# NDA unlock — filling in owner / license / sedation for a listing

Most broker listings are anonymized codes (`CO26-102 GP`). The nightly
enrichment pipeline leaves `ownerName`, `licenseNumber`, `yearsLicensed`,
`sedationPermit`, `practiceUrl`, and `proceduresOffered` as `unknown`
for those — there's nothing to match against until you sign an NDA and
receive the CIM (confidential info memorandum).

The **override layer** solves this. `data/overrides.json` holds
per-listing authoritative values that merge on top of the nightly
pipeline's output. UI shows an `🔓 NDA unlocked` chip so you can tell
at a glance.

## Flow

1. You sign the NDA with the broker and they send you the CIM.
2. Drop the CIM PDF into a Cowork chat with Claude and say
   "unlock listing #42 from this CIM".
3. Claude will:
   - Read the PDF
   - Extract `ownerName`, `licenseNumber`, `yearsLicensed`,
     `sedationPermit`, `practiceUrl`, plus any free-text context for
     `_notes`
   - Update `data/overrides.json`
   - Run `python scripts/regen_data_jsx.py` to regenerate
     `src/overrides.jsx`
   - Open a PR (or commit directly, your call)
4. You merge → DigitalOcean redeploys → the listing now renders the
   unlocked fields with `verified` confidence and the NDA chip.

## Schema

```jsonc
// data/overrides.json
{
  "listings": {
    "42": {
      "_nda": {
        "signedDate": "2026-04-18",
        "cimReceived": true,
        "source": "Provide portal"   // or "Henry Schein CIM", etc.
      },
      "ownerName":     "Dr. Jane Smith",
      "licenseNumber": "DDS-12345",
      "yearsLicensed": 22,
      "sedationPermit": true,
      "practiceUrl":   "https://smithdentalco.com",
      "_notes": "Retiring in 2 years, open to 6-month transition."
    }
  }
}
```

Keys starting with `_` (like `_nda`, `_notes`) are not merged into
`enrich` — they're metadata for humans and the UI header chip.

All other keys are treated as enrich-field overrides and render as
`conf: 'verified'` with `source: 'nda'` attached.

## Privacy

`data/overrides.json` is committed to the public GitHub repo. That's
fine if the repo stays private, but if you make the repo public before
merging an NDA-gated value, you've just violated the NDA.

Keep this in mind. If you want a stronger split, we can:
- move `overrides.json` to a private `parikh-terminal-private`
  submodule, or
- gate the build by encrypting `overrides.json` with `git-crypt` and
  only decrypting during CI.

For now the assumption is that `Unk8p/parikh-terminal` stays private.

## Removing an override

Just delete the entry from `data/overrides.json` and re-run
`python scripts/regen_data_jsx.py`. The UI will fall back to whatever
the nightly pipeline wrote.
