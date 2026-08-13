# Data Dictionary — SPM Pathway Data Collector

Maps every field the app collects to the variable roles used in your proposal
(Table 3.1, "Summary of key variables and methodological roles") so the
exported CSV can be dropped straight into your existing preprocessing
pipeline with minimal renaming.

Legend for **Role**: `S` = static background, `T` = temporal/sequence,
`P` = protected attribute (for fairness analysis), `Y` = target/outcome,
`meta` = collection metadata (exclude from modelling), `qual` = new
qualitative factor not present in the public dataset (captures the
"unobserved drivers" your Scope & Limitations section flags as a gap).

| # | App field | Suggested export column (matches your naming style) | Type | Role | Notes |
|---|---|---|---|---|---|
| 1 | consent_given | — | bool | meta | must be true or record is rejected |
| 2 | respondent_type | RESPONDENT_TYPE | categorical | meta | `leaver` (retrospective) or `form5` (prospective) |
| 3 | follow_up_code | — | string | meta | shown to respondent, never exported with identifying info |
| 4 | cohort_year | SPM_YEAR | numeric | S | year sat/sitting SPM |
| 5 | gender | GENDER | categorical | S, P | |
| 6 | age_group | AGE_GROUP | ordinal | S | |
| 7 | household_size | PEOPLE_HOUSE | numeric | S | |
| 8 | residence_area | RESIDENCE_AREA | categorical | S, P | urban/suburban/rural |
| 9 | state | STATE | categorical | S | Malaysian state |
| 10 | income_classification | STRATUM | ordinal | S, P | B40/M40/T20/not sure |
| 11 | household_income_band | REVENUE | ordinal | S | RM band |
| 12 | government_aid_recipient | SISBEN | categorical | S, P | proxy for the Colombian SISBEN poverty registry field |
| 13 | house_ownership | HOUSE_OWNERSHIP | categorical | S | |
| 14 | asset_internet | INTERNET | binary | S | |
| 15 | asset_computer | COMPUTER | binary | S | |
| 16 | asset_car | CAR | binary | S | |
| 17 | asset_motorcycle | MOTORCYCLE | binary | S | |
| 18 | asset_washing_mch | WASHING_MCH | binary | S | |
| 19 | asset_microwave | MIC_OVEN | binary | S | |
| 20 | asset_tv | TV | binary | S | |
| 21 | asset_mobile | MOBILE | binary | S | |
| 22 | student_has_job | JOB | binary | S | student holds a part-time job |
| 23 | father_education | EDU_FATHER | ordinal | S | |
| 24 | mother_education | EDU_MOTHER | ordinal | S | |
| 25 | father_occupation | OCC_FATHER | categorical | S | |
| 26 | mother_occupation | OCC_MOTHER | categorical | S | |
| 27 | school_type | SCHOOL_TYPE | categorical | S, P | SBP/MRSM/SMK/vocational/private/SABK/sport-arts |
| 28 | school_location | SCHOOL_NAT | categorical | S | urban/rural (proxy for SCHOOL_NAT) |
| 29 | school_state | SCHOOL_STATE | categorical | S | |
| 30 | stream | STREAM | categorical | S | science/arts/vocational/Islamic/sports |
| 31 | school_name_optional | — | string | meta | optional, kept out of the research export, verification only |
| 32 | pt3_grade_summary | PT3_SC | numeric | T | count of A's in PT3, or GPA if known |
| 33 | form4_average_band | F4_BAND | ordinal | T | proxy for a Form 4 academic-year checkpoint |
| 34 | form5_trial_average_band | F5_TRIAL_BAND | ordinal | T | proxy for a pre-SPM checkpoint |
| 35 | spm_bm_grade | BM_S11 | ordinal | T | |
| 36 | spm_english_grade | ENG_S11 | ordinal | T | |
| 37 | spm_math_grade | MAT_S11 | ordinal | T | |
| 38 | spm_addmath_grade | ADDMAT_S11 | ordinal | T | optional, "not taken" allowed |
| 39 | spm_science_grade | SCI_S11 | ordinal | T | |
| 40 | spm_total_A | G_SC | numeric | T | aggregate proxy |
| 41 | spm_gpa | SEL | numeric | T | optional, new SPM GPA scale |
| 42 | cocurricular_level | SEL_IHE | ordinal | T | merit-point band, holistic-profile proxy |
| 43 | pathway_status | PATHWAY_STATUS | categorical | Y | continuing/working/NEET/re-sit/undecided |
| 44 | institution_type | ACADEMIC_PROGRAM | categorical | Y | **primary target variable** |
| 45 | field_of_study | FIELD_OF_STUDY | categorical | Y | STEM/business/arts/TVET/Islamic/other |
| 46 | job_sector | JOB_SECTOR | categorical | Y | only if working |
| 47 | intended_pathway | INTENDED_PATHWAY | categorical | Y | Form 5 (prospective) respondents only, pre-decision |
| 48 | main_reason_for_choice | REASON_CHOICE | multi-select | qual | not in the public dataset — fills a named gap in your Scope & Limitations |
| 49 | received_counselling | COUNSELLING | categorical | qual | |
| 50 | parental_expectation_level | PARENT_EXPECT | ordinal | qual | |
| 51 | self_rated_motivation | MOTIVATION | ordinal | qual | |
| 52 | perceived_financial_barrier | FIN_BARRIER | ordinal | qual | |
| 53 | contact_optional | — | string | meta | optional, stored separately, only for follow-up on Form 5 cohort, never exported |
| 54 | submitted_at | SUBMITTED_AT | datetime | meta | |
| 55 | status | STATUS | categorical | meta | active / flagged (admin can flag suspected spam/duplicates) |

## Why this design

- **Static vs temporal split** mirrors Table 3.1 exactly: demographic,
  socioeconomic, parental and school fields are static background; the four
  academic checkpoints (PT3 → Form 4 → Form 5 trial → SPM) form the temporal
  sequence your hybrid TCN/LSTM branch expects.
- **Protected attributes** (gender, income classification, government-aid
  status, residence area, school type) are flagged so you can feed them
  directly into your Objective 2 fairness framework.
- **`ACADEMIC_PROGRAM` equivalent** is split into `pathway_status` +
  `institution_type` + `field_of_study` so you can either collapse it back
  into one multi-class target or keep the richer breakdown.
- **Qualitative fields (48–52)** exist because your own Scope & Limitations
  section names "motivation, parental expectations, counselling quality, and
  local labour-market conditions" as unobserved drivers missing from public
  datasets. Self-collected data lets you include them — this is the
  strongest argument for why this app is worth the effort, not just a
  workaround for the government restriction.
- **Two respondent types** (`leaver` = retrospective, `form5` = prospective)
  let you build a genuinely longitudinal sample: current Form 5 students who
  submit now and return via their `follow_up_code` after SPM results give
  you a real temporal panel instead of a single cross-sectional snapshot.
