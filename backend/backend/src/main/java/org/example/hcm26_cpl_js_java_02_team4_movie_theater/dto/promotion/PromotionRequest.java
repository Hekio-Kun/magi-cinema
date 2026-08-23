package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.promotion;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BirthdayRule;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.LeapDayPolicy;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionDiscountType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PromotionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UsageLimitType;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionRequest {

    @NotBlank(message = "Tên promotion không được để trống")
    @Size(max = 150, message = "Tên promotion tối đa 150 ký tự")
    String name;

    @NotBlank(message = "Mã promotion không được để trống")
    @Pattern(
            regexp = "^[A-Za-z0-9_-]{3,50}$",
            message = "Mã promotion chỉ gồm chữ, số, gạch ngang hoặc gạch dưới và dài từ 3 đến 50 ký tự")
    String code;

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    String description;

    @NotNull(message = "Loại promotion không được để trống")
    PromotionType type;

    @NotNull(message = "Hình thức giảm giá không được để trống")
    PromotionDiscountType discountType;

    @NotNull(message = "Giá trị giảm không được để trống")
    @Min(value = 1, message = "Giá trị giảm phải lớn hơn 0")
    Integer discountValue;

    @Min(value = 1, message = "Mức giảm tối đa phải lớn hơn 0")
    Integer maxDiscountAmount;

    @Min(value = 0, message = "Giá trị đơn tối thiểu không được âm")
    Integer minOrderAmount;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    LocalDateTime startAt;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    LocalDateTime endAt;

    LocalTime dailyStartTime;
    LocalTime dailyEndTime;

    @NotNull(message = "Loại giới hạn tổng lượt không được để trống")
    @Builder.Default
    UsageLimitType totalUsageLimitType = UsageLimitType.UNLIMITED;

    @Min(value = 1, message = "Tổng lượt sử dụng phải lớn hơn 0")
    Integer totalUsageLimit;

    @NotNull(message = "Loại giới hạn trên mỗi khách hàng không được để trống")
    @Builder.Default
    UsageLimitType perCustomerUsageLimitType = UsageLimitType.UNLIMITED;

    @Min(value = 1, message = "Lượt sử dụng trên mỗi khách hàng phải lớn hơn 0")
    Integer perCustomerUsageLimit;

    Set<String> eligibleMemberTiers;

    BirthdayRule birthdayRule;

    @Min(value = 0, message = "Số ngày trước sinh nhật không được âm")
    Integer birthdayDaysBefore;

    @Min(value = 0, message = "Số ngày sau sinh nhật không được âm")
    Integer birthdayDaysAfter;

    LeapDayPolicy leapDayPolicy;

    @Min(value = 1, message = "Thời gian ổn định ngày sinh phải ít nhất 1 ngày")
    Integer birthdayMinProfileAgeDays;

    PaymentMethod walletPaymentMethod;
}
