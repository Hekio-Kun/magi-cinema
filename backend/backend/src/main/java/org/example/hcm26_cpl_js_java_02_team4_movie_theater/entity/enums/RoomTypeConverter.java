package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class RoomTypeConverter implements AttributeConverter<RoomType, String> {

    @Override
    public String convertToDatabaseColumn(RoomType attribute) {
        return attribute == null ? null : attribute.toDisplayString();
    }

    @Override
    public RoomType convertToEntityAttribute(String dbData) {
        return dbData == null || dbData.isBlank() ? null : RoomType.fromString(dbData);
    }
}
