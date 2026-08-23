package org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation;

import org.junit.jupiter.api.Test;

import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordPolicyTest {

    private final Pattern policy = Pattern.compile(PasswordPolicy.REGEX);

    @Test
    void acceptsPasswordThatMeetsEveryRequirement() {
        assertTrue(policy.matcher("Cinema@2026").matches());
    }

    @Test
    void rejectsPasswordWhenAnyRequirementIsMissing() {
        assertFalse(policy.matcher("Movie@1").matches(), "must contain at least 8 characters");
        assertFalse(policy.matcher("cinema@2026").matches(), "must contain an uppercase letter");
        assertFalse(policy.matcher("Cinema@Test").matches(), "must contain a digit");
        assertFalse(policy.matcher("Cinema2026").matches(), "must contain a special character");
    }
}
