/** Fig. 1: what happens to one question, from sources to the exported cell. Kept in its own file so the
 * box-drawing columns stay aligned. */
export const PIPELINE = ` your sources                    the buyer's file
 policies, SOC 2, past answers   acme-vendor-review.xlsx
        │                                 │
        ▼                                 ▼
 ┌──────────────┐   question 4.1   ┌──────────────┐
 │ chunked and  │◀─────────────────│   columns    │
 │   indexed    │─────────────────▶│  confirmed   │
 └──────────────┘  top 6 passages  └──────┬───────┘
                                          ▼
          ┌────────────────────────────────────┐
          │  draft from those passages only    │
          │  check every quote, word for word  │
          │  score confidence from 0 to 100    │
          └───────┬────────────────────┬───────┘
             80 and over           under 80
                  ▼                    ▼
                Ready            Needs review ──▶ you
                  └─────────┬──────────┘
                            ▼
              same .xlsx back, answer cells only`
