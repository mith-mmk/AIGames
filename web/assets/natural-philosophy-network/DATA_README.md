# Natural Philosophy Network data

`web/js/natural-philosophy-network-data.js` is a static, browser-ready
correspondence dataset. It attaches exactly one value to the global scope:

```js
globalThis.NaturalPhilosophyNetworkData
```

`web/js/natural-philosophy-network-evidence.js` is loaded immediately after
the generated file and appends separately hand-checked mention, transmission,
and controversy records. It deliberately contains no inferred meeting records.

## Source and licence

The observed correspondence layer is generated from the University of Oxford's
Early Modern Letters Online (EMLO) snapshot, `emlo_snapshot_31Jan2019_rev.csv`,
extracted on 31 January 2019.

- Dataset landing page: <https://ora.ox.ac.uk/objects/uuid:98641e69-0e46-4abf-8083-c60be61959e5>
- DOI: <https://doi.org/10.5287/ora-rj092721d>
- Licence: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

The application must retain this attribution, the licence notice, and the
dataset manifest. `manifest.sourceSha256` fingerprints the precise input CSV.
The EMLO source is a union catalogue of correspondence **metadata**; it is not
a transcription or a complete edition of every letter.

Regenerate the observed correspondence file with:

```text
node web/js/natural-philosophy-network-data-build.mjs <emlo-snapshot.csv> [output-data.js]
```

The builder accepts no implicit source path. It records only the input
basename and SHA-256 in the generated manifest; local absolute paths are not
written into the public data file.

## Scope and deterministic extraction

The dataset is a display-oriented, reproducible core rather than a claim that
it exhausts the historical network.

1. Start with EMLO persons René Descartes (`300075`) and Marin Mersenne
   (`300610`).
2. Include only records whose normalized Gregorian date interval intersects
   1600-01-01 through 1660-12-31 and has resolved sender and recipient IDs.
3. For each non-seed person, count distinct `letterFamilyId` values directly
   incident to either seed.
4. Keep the two seeds and the 158 highest-ranked other people; ties sort by
   preferred name and then EMLO ID.
5. From the full normalized record set (not only seed-incident records), keep
   every observed record whose both endpoints are in that selected set.

EMLO's semicolon-separated author/recipient fields are expanded into all
author-recipient pairs. Every expansion retains the original `sourceRecords`
entry. A `letterFamilyId` is the lowest EMLO record ID in the source row's
alternative-match list, or the record's own ID when EMLO provides no match
list. After endpoint selection, records with the same family, sender,
recipient, original/normalized date fields, precision, and date basis are
merged into one deterministic observation. `sourceRecords` are de-duplicated
by record ID plus source URL, while distinct alternative-catalogue source
records remain attached to that merged observation. Use `letterFamilyId`,
rather than raw record count, when an analysis needs to avoid counting
catalogue alternatives twice.

## Schema

```text
NaturalPhilosophyNetworkData = {
  manifest,
  people: [{ id, preferredName, displayNameJa, descriptionJa, names, birthYear,
             deathYear, roles, authorityUrls, selectionReason }],
  letters: [{ id, letterFamilyId, senderId, recipientId, dateOriginal,
              dateStart, dateEnd, datePrecision, dateBasis, sourceRecords }],
  evidenceEvents: [{ id, type, participants, dateStart, dateEnd, confidence,
                     sourceCitation, sourceUrl, evidenceLocator }],
  topics,
  audit
}
```

`sourceRecords` preserves the EMLO record ID, catalogue, source attribution,
UUID, EMLO URL, and alternative record IDs. Date fields deliberately keep a
date interval and precision flag; do not silently replace an approximate or
range date with a single asserted day.

`displayNameJa` is a stable-ID keyed Japanese display aid for the selected
people. It is not an authority record and does not replace `preferredName`,
which remains the EMLO-derived authoritative display name and identity label.
`descriptionJa` is a concise orientation aid. It is not a substitute for a
biographical source; when the snapshot does not establish a person's role,
the description says so explicitly rather than inferring one from graph shape.

## Evidence boundary

The generated file contains **only observed EMLO correspondence metadata** and
starts with empty `evidenceEvents` and `topics` arrays. The separately reviewed
evidence script appends only records with a cited edition/page or equivalent
stable locator. It currently includes mentions, documented transmissions, and
specific controversy events; meeting records remain empty because no adequate
dated co-presence evidence was verified for this release.

No person mention, transmission, shared topic, meeting, intellectual influence,
or graph edge is synthetically inferred from a shared correspondent or a
triangular graph. Future curated evidence must follow the same schema and use a
`type` of `mention`, `transmission`, `theme`, or `meeting`. Derived weights and
centrality are application calculations, not source facts.

## Known limits

- Birth and death years are `null` unless separately authority-verified; the
  extraction does not merge people by name similarity.
- An EMLO catalogue record can be editorially inferred or uncertain. Preserve
  `dateBasis`, `datePrecision`, and the source record in filters and displays.
- The 160-person cap controls visual density. It does not measure historical
  importance or exclude the possibility of meaningful lower-frequency ties.
