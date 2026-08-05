package com.greenhaven.dto;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * A trimmed page envelope. Spring's own Page serialises a lot of internals the
 * client neither needs nor should depend on.
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
