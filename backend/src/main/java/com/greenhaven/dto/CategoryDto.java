package com.greenhaven.dto;

/** A category as the shop front needs it, plus how many plants sit in it. */
public record CategoryDto(String slug, String name, String blurb, long plantCount) {
}
