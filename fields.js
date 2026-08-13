// Central field schema. Used by the server for validation, CSV export
// column mapping, and by the admin dashboard for rendering the table.
// Keep this file as the single source of truth if you add/remove questions.

const STATES = [
  "johor","kedah","kelantan","melaka","negeri_sembilan","pahang","perak",
  "perlis","pulau_pinang","sabah","sarawak","selangor","terengganu",
  "wp_kuala_lumpur","wp_labuan","wp_putrajaya"
];

const GRADE_OPTIONS = ["A+","A","A-","B+","B","C+","C","D","E","G","not_taken"];

const EDU_LEVELS = [
  "no_formal","primary","pt3_srp","spm","stpm_diploma","degree","postgrad",
  "not_applicable","not_sure"
];

const OCCUPATIONS = [
  "govt_sector","private_sector","self_employed_business",
  "agriculture_fisheries","skilled_trade","homemaker","unemployed_retired",
  "deceased_na","other"
];

const PATHWAY_OPTIONS = [
  "public_university","private_university_college","matriculation",
  "foundation_asasi","polytechnic","community_college",
  "ilka_ilp_vocational","teacher_training_ipg","other","not_applicable"
];

// type: string | number | bool | enum | multiselect
// group: used to render the multi-step form and to group export columns
const FIELDS = [
  // --- meta ---
  { key: "respondent_type", column: "RESPONDENT_TYPE", type: "enum", required: true, group: "meta", options: ["leaver","form5"] },
  { key: "cohort_year", column: "SPM_YEAR", type: "number", required: true, group: "meta", min: 2018, max: 2028 },

  // --- demographic ---
  { key: "gender", column: "GENDER", type: "enum", required: true, group: "demographic", options: ["male","female","prefer_not_say"], protected: true },
  { key: "age_group", column: "AGE_GROUP", type: "enum", required: true, group: "demographic", options: ["16_or_below","17","18","19","20_or_above"] },
  { key: "household_size", column: "PEOPLE_HOUSE", type: "number", required: true, group: "demographic", min: 1, max: 20 },
  { key: "residence_area", column: "RESIDENCE_AREA", type: "enum", required: true, group: "demographic", options: ["urban","suburban","rural"], protected: true },
  { key: "state", column: "STATE", type: "enum", required: true, group: "demographic", options: STATES },

  // --- socioeconomic ---
  { key: "income_classification", column: "STRATUM", type: "enum", required: true, group: "socioeconomic", options: ["b40","m40","t20","not_sure"], protected: true },
  { key: "household_income_band", column: "REVENUE", type: "enum", required: true, group: "socioeconomic", options: ["below_2000","2001_3000","3001_5000","5001_8000","8001_10000","above_10000","prefer_not_say"] },
  { key: "government_aid_recipient", column: "SISBEN", type: "enum", required: true, group: "socioeconomic", options: ["none","bsh_str","kwapm","padi_ekasih","zakat_baitulmal","other"], protected: true },
  { key: "house_ownership", column: "HOUSE_OWNERSHIP", type: "enum", required: true, group: "socioeconomic", options: ["own","rent","government_quarters","other"] },
  { key: "asset_internet", column: "INTERNET", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_computer", column: "COMPUTER", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_car", column: "CAR", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_motorcycle", column: "MOTORCYCLE", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_washing_mch", column: "WASHING_MCH", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_microwave", column: "MIC_OVEN", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_tv", column: "TV", type: "bool", required: false, group: "socioeconomic" },
  { key: "asset_mobile", column: "MOBILE", type: "bool", required: false, group: "socioeconomic" },
  { key: "student_has_job", column: "JOB", type: "bool", required: false, group: "socioeconomic" },

  // --- parental background ---
  { key: "father_education", column: "EDU_FATHER", type: "enum", required: true, group: "parental", options: EDU_LEVELS },
  { key: "mother_education", column: "EDU_MOTHER", type: "enum", required: true, group: "parental", options: EDU_LEVELS },
  { key: "father_occupation", column: "OCC_FATHER", type: "enum", required: true, group: "parental", options: OCCUPATIONS },
  { key: "mother_occupation", column: "OCC_MOTHER", type: "enum", required: true, group: "parental", options: OCCUPATIONS },

  // --- school context ---
  { key: "school_type", column: "SCHOOL_TYPE", type: "enum", required: true, group: "school", options: ["sbp","mrsm","smk_daily","vocational_college","private_international","sabk_religious","sport_arts_school","other"], protected: true },
  { key: "school_location", column: "SCHOOL_NAT", type: "enum", required: true, group: "school", options: ["urban","rural"] },
  { key: "school_state", column: "SCHOOL_STATE", type: "enum", required: true, group: "school", options: STATES },
  { key: "stream", column: "STREAM", type: "enum", required: true, group: "school", options: ["science","arts_humanities","vocational_technical","islamic_studies","sports","other"] },
  { key: "school_name_optional", column: null, type: "string", required: false, group: "school", excludeFromExport: true },

  // --- academic (temporal) ---
  { key: "pt3_grade_summary", column: "PT3_SC", type: "number", required: false, group: "academic", min: 0, max: 11 },
  { key: "form4_average_band", column: "F4_BAND", type: "enum", required: true, group: "academic", options: ["excellent","good","average","below_average","not_sure"] },
  { key: "form5_trial_average_band", column: "F5_TRIAL_BAND", type: "enum", required: true, group: "academic", options: ["excellent","good","average","below_average","not_sure"] },
  { key: "spm_bm_grade", column: "BM_S11", type: "enum", required: false, group: "academic", options: GRADE_OPTIONS },
  { key: "spm_english_grade", column: "ENG_S11", type: "enum", required: false, group: "academic", options: GRADE_OPTIONS },
  { key: "spm_math_grade", column: "MAT_S11", type: "enum", required: false, group: "academic", options: GRADE_OPTIONS },
  { key: "spm_addmath_grade", column: "ADDMAT_S11", type: "enum", required: false, group: "academic", options: GRADE_OPTIONS },
  { key: "spm_science_grade", column: "SCI_S11", type: "enum", required: false, group: "academic", options: GRADE_OPTIONS },
  { key: "spm_total_A", column: "G_SC", type: "number", required: false, group: "academic", min: 0, max: 12 },
  { key: "spm_gpa", column: "SEL", type: "number", required: false, group: "academic", min: 0, max: 4 },
  { key: "cocurricular_level", column: "SEL_IHE", type: "enum", required: true, group: "academic", options: ["low","moderate","high"] },

  // --- outcome ---
  { key: "pathway_status", column: "PATHWAY_STATUS", type: "enum", required: false, group: "outcome", options: ["continuing_studies","working","neet","resit_spm","undecided"] },
  { key: "institution_type", column: "ACADEMIC_PROGRAM", type: "enum", required: false, group: "outcome", options: PATHWAY_OPTIONS },
  { key: "field_of_study", column: "FIELD_OF_STUDY", type: "enum", required: false, group: "outcome", options: ["stem","business_commerce","arts_humanities_social","tvet_technical","islamic_studies","undecided_other"] },
  { key: "job_sector", column: "JOB_SECTOR", type: "enum", required: false, group: "outcome", options: ["retail_services","manufacturing","agriculture_fisheries","government_sector","freelance_gig","family_business","other"] },
  { key: "intended_pathway", column: "INTENDED_PATHWAY", type: "enum", required: false, group: "outcome", options: PATHWAY_OPTIONS },

  // --- qualitative / previously-unobserved factors ---
  { key: "main_reason_for_choice", column: "REASON_CHOICE", type: "multiselect", required: true, group: "qualitative", options: ["financial_constraints","family_obligations","poor_academic_results","personal_interest","parental_expectation","lack_of_guidance","job_market_considerations","distance_from_home","scholarship_availability","other"] },
  { key: "received_counselling", column: "COUNSELLING", type: "enum", required: true, group: "qualitative", options: ["yes_helpful","yes_not_helpful","no_counselling"] },
  { key: "parental_expectation_level", column: "PARENT_EXPECT", type: "enum", required: true, group: "qualitative", options: ["high_pressure_continue","some_encouragement","neutral","encouraged_to_work"] },
  { key: "self_rated_motivation", column: "MOTIVATION", type: "enum", required: true, group: "qualitative", options: ["very_motivated","somewhat_motivated","not_very_motivated","not_at_all_motivated"] },
  { key: "perceived_financial_barrier", column: "FIN_BARRIER", type: "enum", required: true, group: "qualitative", options: ["major_barrier","minor_barrier","not_a_barrier"] },

  // --- optional follow-up contact (never exported to the research CSV) ---
  { key: "contact_optional", column: null, type: "string", required: false, group: "followup", excludeFromExport: true }
];

module.exports = { FIELDS, STATES, GRADE_OPTIONS, EDU_LEVELS, OCCUPATIONS, PATHWAY_OPTIONS };
