package com.greenhaven.dto;

/** The seven care fields, shaped exactly like the React care card. */
public record CareDto(String light, String water, String soil, String humidity,
                      String temperature, String feed, String repot) {
}
