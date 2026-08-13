// Browser copy of fields.js — MUST stay in sync with the server schema.
// (Kept as a plain script, not a module, so it works with no build step.)
(function () {
  const STATES = [
    "johor","kedah","kelantan","melaka","negeri_sembilan","pahang","perak",
    "perlis","pulau_pinang","sabah","sarawak","selangor","terengganu",
    "wp_kuala_lumpur","wp_labuan","wp_putrajaya"
  ];
  const GRADE_OPTIONS = ["A+","A","A-","B+","B","C+","C","D","E","G","not_taken"];
  const EDU_LEVELS = ["no_formal","primary","pt3_srp","spm","stpm_diploma","degree","postgrad","not_applicable","not_sure"];
  const OCCUPATIONS = ["govt_sector","private_sector","self_employed_business","agriculture_fisheries","skilled_trade","homemaker","unemployed_retired","deceased_na","other"];
  const PATHWAY_OPTIONS = ["public_university","private_university_college","matriculation","foundation_asasi","polytechnic","community_college","ilka_ilp_vocational","teacher_training_ipg","other","not_applicable"];

  const FIELDS = [
    { key: "respondent_type", type: "enum", required: true, group: "intro", options: ["leaver","form5"] },
    { key: "cohort_year", type: "number", required: true, group: "intro", min: 2018, max: 2028 },

    { key: "gender", type: "enum", required: true, group: "demographic", options: ["male","female","prefer_not_say"] },
    { key: "age_group", type: "enum", required: true, group: "demographic", options: ["16_or_below","17","18","19","20_or_above"] },
    { key: "household_size", type: "number", required: true, group: "demographic", min: 1, max: 20 },
    { key: "residence_area", type: "enum", required: true, group: "demographic", options: ["urban","suburban","rural"] },
    { key: "state", type: "enum", required: true, group: "demographic", options: STATES },

    { key: "income_classification", type: "enum", required: true, group: "socioeconomic", options: ["b40","m40","t20","not_sure"] },
    { key: "household_income_band", type: "enum", required: true, group: "socioeconomic", options: ["below_2000","2001_3000","3001_5000","5001_8000","8001_10000","above_10000","prefer_not_say"] },
    { key: "government_aid_recipient", type: "enum", required: true, group: "socioeconomic", options: ["none","bsh_str","kwapm","padi_ekasih","zakat_baitulmal","other"] },
    { key: "house_ownership", type: "enum", required: true, group: "socioeconomic", options: ["own","rent","government_quarters","other"] },
    { key: "asset_internet", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_computer", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_car", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_motorcycle", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_washing_mch", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_microwave", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_tv", type: "bool", required: false, group: "socioeconomic" },
    { key: "asset_mobile", type: "bool", required: false, group: "socioeconomic" },
    { key: "student_has_job", type: "bool", required: false, group: "socioeconomic" },

    { key: "father_education", type: "enum", required: true, group: "parental", options: EDU_LEVELS },
    { key: "mother_education", type: "enum", required: true, group: "parental", options: EDU_LEVELS },
    { key: "father_occupation", type: "enum", required: true, group: "parental", options: OCCUPATIONS },
    { key: "mother_occupation", type: "enum", required: true, group: "parental", options: OCCUPATIONS },

    { key: "school_type", type: "enum", required: true, group: "school", options: ["sbp","mrsm","smk_daily","vocational_college","private_international","sabk_religious","sport_arts_school","other"] },
    { key: "school_location", type: "enum", required: true, group: "school", options: ["urban","rural"] },
    { key: "school_state", type: "enum", required: true, group: "school", options: STATES },
    { key: "stream", type: "enum", required: true, group: "school", options: ["science","arts_humanities","vocational_technical","islamic_studies","sports","other"] },
    { key: "school_name_optional", type: "string", required: false, group: "school" },

    { key: "pt3_grade_summary", type: "number", required: false, group: "academic", min: 0, max: 11 },
    { key: "form4_average_band", type: "enum", required: true, group: "academic", options: ["excellent","good","average","below_average","not_sure"] },
    { key: "form5_trial_average_band", type: "enum", required: true, group: "academic", options: ["excellent","good","average","below_average","not_sure"] },
    { key: "spm_bm_grade", type: "enum", required: false, group: "academic_spm", options: GRADE_OPTIONS, leaverOnly: true },
    { key: "spm_english_grade", type: "enum", required: false, group: "academic_spm", options: GRADE_OPTIONS, leaverOnly: true },
    { key: "spm_math_grade", type: "enum", required: false, group: "academic_spm", options: GRADE_OPTIONS, leaverOnly: true },
    { key: "spm_addmath_grade", type: "enum", required: false, group: "academic_spm", options: GRADE_OPTIONS, leaverOnly: true },
    { key: "spm_science_grade", type: "enum", required: false, group: "academic_spm", options: GRADE_OPTIONS, leaverOnly: true },
    { key: "spm_total_A", type: "number", required: false, group: "academic_spm", min: 0, max: 12, leaverOnly: true },
    { key: "spm_gpa", type: "number", required: false, group: "academic_spm", min: 0, max: 4, leaverOnly: true },
    { key: "cocurricular_level", type: "enum", required: true, group: "academic", options: ["low","moderate","high"] },

    { key: "pathway_status", type: "enum", required: false, group: "outcome", options: ["continuing_studies","working","neet","resit_spm","undecided"], leaverOnly: true },
    { key: "institution_type", type: "enum", required: false, group: "outcome", options: PATHWAY_OPTIONS, showIf: (d) => d.pathway_status === "continuing_studies" },
    { key: "field_of_study", type: "enum", required: false, group: "outcome", options: ["stem","business_commerce","arts_humanities_social","tvet_technical","islamic_studies","undecided_other"], showIf: (d) => d.pathway_status === "continuing_studies" },
    { key: "job_sector", type: "enum", required: false, group: "outcome", options: ["retail_services","manufacturing","agriculture_fisheries","government_sector","freelance_gig","family_business","other"], showIf: (d) => d.pathway_status === "working" },
    { key: "intended_pathway", type: "enum", required: false, group: "outcome", options: PATHWAY_OPTIONS, form5Only: true },

    { key: "main_reason_for_choice", type: "multiselect", required: true, group: "qualitative", options: ["financial_constraints","family_obligations","poor_academic_results","personal_interest","parental_expectation","lack_of_guidance","job_market_considerations","distance_from_home","scholarship_availability","other"] },
    { key: "received_counselling", type: "enum", required: true, group: "qualitative", options: ["yes_helpful","yes_not_helpful","no_counselling"] },
    { key: "parental_expectation_level", type: "enum", required: true, group: "qualitative", options: ["high_pressure_continue","some_encouragement","neutral","encouraged_to_work"] },
    { key: "self_rated_motivation", type: "enum", required: true, group: "qualitative", options: ["very_motivated","somewhat_motivated","not_very_motivated","not_at_all_motivated"] },
    { key: "perceived_financial_barrier", type: "enum", required: true, group: "qualitative", options: ["major_barrier","minor_barrier","not_a_barrier"] },

    { key: "contact_optional", type: "string", required: false, group: "followup" },
  ];

  window.SPM_FIELDS = FIELDS;
  window.SPM_CONST = { STATES, GRADE_OPTIONS, EDU_LEVELS, OCCUPATIONS, PATHWAY_OPTIONS };
})();
