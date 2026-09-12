package org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Giới hạn truy vấn phân trang, giữ đủ ghế cho sơ đồ phòng đang dùng size=500. */
public final class PageRequests {
    public static final int MAX_PAGE_SIZE = 1_000;

    private PageRequests() {
    }

    public static PageRequest bounded(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE), sort);
    }
}
