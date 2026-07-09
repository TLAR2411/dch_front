function formatGender(genderValue, t) {
    return genderValue === "male"
        ? t("male")
        : genderValue === "female"
            ? t("female")
            : t("unknown");
}

export default formatGender;