package org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation;

public final class PasswordPolicy {

    public static final String REGEX =
            "^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).{8,}$";

    public static final String MESSAGE =
            "Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt";

    private PasswordPolicy() {
    }
}
